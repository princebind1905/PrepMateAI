import asyncio
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from ..core.config import get_settings
from ..core.db import db
from ..core.security import current_user
from ..services.ai import generate_interview_report
from ..services.pdf import ResumeParseError, extract_resume_text

log = logging.getLogger("prepmate.interview")
router = APIRouter(prefix="/api/interview", tags=["interview"])

def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    doc["user"] = str(doc["user"])
    for k in ("createdAt", "updatedAt"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat()
    return doc


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(404, "Interview report not found")


@router.get("")
@router.get("/")
async def list_reports(user: dict = Depends(current_user)):
    cursor = (db().interviewreports
              .find({"user": ObjectId(user["id"])}, {"resume": 0})
              .sort("createdAt", -1).limit(100))
    return {"reports": [_serialize(d) async for d in cursor]}


@router.delete("/{report_id}")
async def delete_report(report_id: str, user: dict = Depends(current_user)):
    res = await db().interviewreports.delete_one({"_id": _oid(report_id), "user": ObjectId(user["id"])})
    if res.deleted_count == 0:
        raise HTTPException(404, "Interview report not found")
    return {"message": "Interview report deleted successfully"}


@router.post("", status_code=201)
@router.post("/", status_code=201, include_in_schema=False)
async def create_report(
    request: Request,
    resume: UploadFile = File(...),
    jobDescription: str = Form(...),
    selfDescription: str = Form(""),
    user: dict = Depends(current_user),
):
    s = get_settings()

    jd = jobDescription.strip()
    if len(jd) < 30:
        raise HTTPException(400, "Job description is required (at least a few sentences)")
    jd = jd[: s.max_jd_chars]
    self_desc = selfDescription.strip()[:2000]

    data = await resume.read(s.max_resume_bytes + 1)
    if len(data) > s.max_resume_bytes:
        raise HTTPException(400, "Resume file must be under 5MB")

    try:
        # PDF parsing is CPU-bound: keep it off the event loop
        resume_text = await asyncio.to_thread(extract_resume_text, data, s.max_resume_chars)
    except ResumeParseError as exc:
        raise HTTPException(400, str(exc))

    try:
        report = await generate_interview_report(resume_text, self_desc, jd)
    except Exception:
        log.exception("report generation failed")
        raise HTTPException(502, "The AI service failed to generate a report. Please try again.")

    now = datetime.now(timezone.utc)
    doc = {
        "user": ObjectId(user["id"]),
        "resume": resume_text,
        "selfDescription": self_desc,
        "jobDescription": jd,
        **report,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db().interviewreports.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"message": "Interview report generated successfully", "report": _serialize(doc)}
