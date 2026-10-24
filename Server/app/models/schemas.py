from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


# ---- LLM structured output (what Grok must return) ----
class QA(BaseModel):
    question: str = Field(description="Interview question specific to this candidate and role.")
    intension: str = Field(description="The competency or trait the interviewer is probing.")
    answer: str = Field(
        description="Model answer. Technical: key concepts + a concrete example. "
        "Behavioral: STAR outline grounded in the candidate's real experience."
    )


class SkillGap(BaseModel):
    skill: str = Field(description="Requirement from the JD that is missing or weak in the resume.")
    severity: Literal["low", "medium", "high"]


class PlanDay(BaseModel):
    day: str = Field(description="e.g. 'Day 1'")
    focus: str
    tasks: list[str] = Field(min_length=2, max_length=6)


class Report(BaseModel):
    summary: str = Field(description="Honest 3-5 sentence fit summary citing concrete resume evidence.")
    matchScore: int = Field(ge=0, le=100)
    technicalQuestions: list[QA] = Field(min_length=2, max_length=7)
    behavioralQuestions: list[QA] = Field(min_length=3, max_length=5)
    skillGaps: list[SkillGap]
    preparationPlan: list[PlanDay] = Field(min_length=3, max_length=10)


class CandidateProfile(BaseModel):
    """Stage-1 extraction: grounds stage 2 in facts rather than raw PDF text."""
    name: str = ""
    years_experience: float = Field(default=0, description="Total professional years; 0 if unclear.")
    seniority: str = ""
    skills: list[str] = Field(default_factory=list)
    roles: list[str] = Field(default_factory=list, description="'Title @ Company (dates)'")
    projects: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)


class JobProfile(BaseModel):
    title: str = ""
    seniority: str = ""
    must_have_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    min_years_experience: float = 0
