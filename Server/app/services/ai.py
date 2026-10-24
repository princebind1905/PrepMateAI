"""LangChain + Groq pipeline.

Two stages, which is what drives the accuracy gain over a single giant prompt:

  1. EXTRACT (fast model, temperature 0, run in parallel)
       resume text -> CandidateProfile      job description -> JobProfile
  2. GENERATE (main model, low temperature)
       structured profiles + source text -> Report (validated by Pydantic)

  3. CALIBRATE (deterministic, no LLM)
       blend the model's matchScore with a transparent must-have skill overlap
       and add any must-have skills that are provably absent from the resume.
"""
import hashlib
import json
import logging
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel
from langchain_openai import ChatOpenAI
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from ..core.config import get_settings
from ..core.db import redis
from ..models.schemas import CandidateProfile, JobProfile, Report, SkillGap

log = logging.getLogger("prepmate.ai")

# ------------------------------------------------------------------ prompts
EXTRACT_CANDIDATE = ChatPromptTemplate.from_messages([
    ("system",
     "You extract facts from resumes. Only use information explicitly present in the text. "
     "Never invent skills, employers, or dates. If something is unclear, leave it empty."),
    ("human", "RESUME:\n<<<\n{resume}\n>>>"),
])

EXTRACT_JOB = ChatPromptTemplate.from_messages([
    ("system",
     "You extract structured requirements from job descriptions. Separate hard requirements "
     "('must have', 'required', core responsibilities) from nice-to-haves. Use short skill names "
     "(e.g. 'PostgreSQL', 'System design'). Never invent requirements."),
    ("human", "JOB DESCRIPTION:\n<<<\n{job_description}\n>>>"),
])

REPORT_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are a senior hiring manager and interview coach. Produce an honest, specific interview "
     "preparation report.\n"
     "Rules:\n"
     "- Ground every claim in the candidate data below. Do not invent experience the candidate lacks.\n"
     "- Technical questions must target the job's must-have skills and probe the candidate's actual "
     "projects/roles; difficulty must match the role's seniority.\n"
     "- Include at least 2 technical questions and 3 behavioral questions.\n"
     "- Technical answers: key concepts, trade-offs, and a concrete example. Behavioral answers: a STAR "
     "outline that reuses real roles/projects from the resume where possible.\n"
     "- skillGaps: only requirements from the job that are missing or weak in the resume. "
     "high = must-have and absent; medium = must-have but shallow; low = nice-to-have.\n"
     "- matchScore calibration: 85-100 meets nearly all must-haves at the right level; 65-84 solid with "
     "some gaps; 40-64 partial; below 40 poor fit. Be realistic, not flattering.\n"
     "- preparationPlan: order days by priority (biggest gaps first), tasks must be concrete and actionable."),
    ("human",
     "CANDIDATE PROFILE (extracted):\n{candidate_json}\n\n"
     "JOB PROFILE (extracted):\n{job_json}\n\n"
     "CANDIDATE SELF-DESCRIPTION:\n{self_description}\n\n"
     "RESUME TEXT (source of truth):\n<<<\n{resume}\n>>>\n\n"
     "JOB DESCRIPTION TEXT (source of truth):\n<<<\n{job_description}\n>>>"),
])

# ------------------------------------------------------------------ models
def _llm(model: str, temperature: float, timeout: int, max_tokens: int) -> ChatOpenAI:
    s = get_settings()
    if s.llm_provider != "groq":
        raise ValueError(f"Unsupported LLM_PROVIDER: {s.llm_provider}")
    return ChatOpenAI(
        model=model,
        api_key=s.groq_api_key,
        base_url="https://api.groq.com/openai/v1",
        temperature=temperature,
        timeout=timeout,
        max_tokens=max_tokens,
        reasoning_effort=s.groq_reasoning_effort,
        max_retries=0,  # retries handled by tenacity below so we control backoff
    )


_chain = None


def _build_chain():
    s = get_settings()
    fast = _llm(s.groq_fast_model or s.groq_model, 0, 40, 2048)
    main = _llm(s.groq_model, 0.3, 120, s.groq_max_tokens)

    extract = RunnableParallel(
        candidate=EXTRACT_CANDIDATE | fast.with_structured_output(
            CandidateProfile, method="function_calling"
        ),
        job=EXTRACT_JOB | fast.with_structured_output(
            JobProfile, method="function_calling"
        ),
    )
    generate = REPORT_PROMPT | main.with_structured_output(
        Report, method="function_calling"
    )
    return extract, generate


def get_chain():
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain


# ------------------------------------------------------------------ calibration
def _norm(s: str) -> str:
    """Lowercase + tokenise, keeping inner '.', '+', '#' (Node.js, C++, C#) but
    stripping sentence punctuation so 'PostgreSQL.' still matches 'PostgreSQL'."""
    tokens = re.sub(r"[^a-z0-9+#.]+", " ", s.lower()).split()
    return " ".join(t.strip(".") for t in tokens if t.strip("."))


def _skill_present(skill: str, haystack_norm: str) -> bool:
    n = _norm(skill)
    return bool(n) and f" {n} " in f" {haystack_norm} "


def calibrate(report: Report, resume: str, job: JobProfile) -> Report:
    """Anchor the LLM score with a deterministic must-have overlap and add provable gaps."""
    must = [s for s in job.must_have_skills if s.strip()]
    if not must:
        return report

    hay = _norm(resume)
    missing = [s for s in must if not _skill_present(s, hay)]
    overlap = 1 - len(missing) / len(must)

    blended = round(0.7 * report.matchScore + 0.3 * overlap * 100)
    report.matchScore = max(0, min(100, blended))

    known = [_norm(g.skill) for g in report.skillGaps]
    for skill in missing:
        n = _norm(skill)
        if not any(n in k or k in n for k in known if k):
            report.skillGaps.append(SkillGap(skill=skill, severity="high"))
    return report


# ------------------------------------------------------------------ public API
def _cache_key(resume: str, self_desc: str, jd: str) -> str:
    s = get_settings()
    h = hashlib.sha256("\x1f".join([s.llm_provider, s.groq_model, resume, self_desc, jd]).encode()).hexdigest()
    return f"report:{h}"


def _is_retryable(exc: BaseException) -> bool:
    """Retry transient provider failures, but fail fast on invalid requests or credentials."""
    current: BaseException | None = exc
    while current is not None:
        status_code = getattr(current, "status_code", None)
        if status_code is None:
            response = getattr(current, "response", None)
            status_code = getattr(response, "status_code", None)
        if isinstance(status_code, int):
            return status_code == 408 or status_code == 429 or status_code >= 500
        current = current.__cause__ or current.__context__
    return True


_retryable = retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=10, max=30),
    retry=retry_if_exception(_is_retryable),
)


@_retryable
async def _run(resume: str, self_desc: str, jd: str) -> Report:
    extract, generate = get_chain()
    profiles = await extract.ainvoke({"resume": resume, "job_description": jd})
    candidate: CandidateProfile = profiles["candidate"]
    job: JobProfile = profiles["job"]

    report: Report = await generate.ainvoke({
        "candidate_json": candidate.model_dump_json(indent=1),
        "job_json": job.model_dump_json(indent=1),
        "self_description": self_desc or "Not provided",
        "resume": resume,
        "job_description": jd,
    })
    return calibrate(report, resume, job)


async def generate_interview_report(resume: str, self_description: str, job_description: str) -> dict:
    s = get_settings()
    key = _cache_key(resume, self_description, job_description)

    try:
        cached = await redis().get(key)
        if cached:
            log.info("report cache hit")
            return json.loads(cached)
    except Exception:  # cache must never break the request
        log.warning("redis cache read failed", exc_info=True)

    report = await _run(resume, self_description, job_description)
    data = report.model_dump()

    try:
        await redis().set(key, json.dumps(data), ex=s.report_cache_ttl)
    except Exception:
        log.warning("redis cache write failed", exc_info=True)
    return data
