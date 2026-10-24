import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
import jwt
from openai import APIError, APITimeoutError
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from ..adapters.jobs import FastAPIJobs
from ..config import settings
from ..db import session
from ..deps import current_student
from ..models import AnalysisJob, Concept, Course, LearnerMap, Material, Message, Section, Student
from ..research_client import create_research_learner, research_request
from ..services import rag
from ..services import analysis
from ..services.compaction import compact_history
from ..services.tokens import signed_material_url, student_token, valid_material_signature
from ..services.rate_limit import client_ip, enforce

router = APIRouter()
logger = logging.getLogger("tangled.student")
passwords = PasswordHasher()


class JoinIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)
    consent: bool


class StudentCredentials(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8)
    code: str = Field(min_length=6, max_length=6)
    consent: bool


class StudentLogin(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8)


class ChatIn(BaseModel):
    text: str = Field(min_length=1, max_length=settings.max_chat_input_chars)
    session_id: str = Field(default="", max_length=100)
    material_id: int | None = Field(default=None)


class FeedbackIn(BaseModel):
    message_id: int
    value: str


class ResearchSubmission(BaseModel):
    code: str = Field(min_length=1, max_length=20000)


class ResearchAIChatIn(BaseModel):
    attempt_id: int
    message: str = Field(min_length=1, max_length=5000)


def _student_response(student: Student, course: Course, s: Session | None = None) -> dict:
    section = s.get(Section, student.section_id) if (s and student.section_id) else None
    return {
        "access_token": student_token(student.id, course.id),
        "token_type": "bearer",
        "course_id": course.id,
        "course_name": course.name,
        "section_id": student.section_id,
        "section_name": section.name if section else None,
    }


def _create_mapping(student: Student, s: Session) -> LearnerMap:
    existing = s.exec(select(LearnerMap).where(LearnerMap.user_id == student.id)).first()
    if existing:
        return existing
    result = create_research_learner(idempotency_key=f"tangled-student-{student.id}")
    mapping = LearnerMap(
        user_id=student.id,
        research_learner_id=int(result["id"]),
        research_learner_token=str(result.get("provisioning_token", "")),
    )
    s.add(mapping)
    try:
        s.commit()
    except Exception:
        s.rollback()
        existing = s.exec(select(LearnerMap).where(LearnerMap.user_id == student.id)).first()
        if existing:
            return existing
        raise HTTPException(503, "Could not persist research learner mapping.")
    s.refresh(mapping)
    return mapping


@router.post("/register")
def register_student(body: StudentCredentials, request: Request, s: Session = Depends(session)):
    if not body.consent:
        raise HTTPException(400, "Consent is required")
    course = s.exec(select(Course).where(Course.join_code == body.code.upper())).first()
    if not course or not course.joining_open:
        raise HTTPException(404, "Course not found or joining is closed")
    email = body.email.lower()
    if s.exec(select(Student).where(Student.email == email)).first():
        raise HTTPException(409, "Email already registered")
    student = Student(
        course_id=course.id,
        email=email,
        password_hash=passwords.hash(body.password),
        consent_version=settings.consent_version,
    )
    s.add(student)
    try:
        s.commit()
    except Exception:
        s.rollback()
        raise HTTPException(409, "Email already registered")
    s.refresh(student)
    _create_mapping(student, s)
    return _student_response(student, course, s)


@router.post("/login")
def login_student(body: StudentLogin, s: Session = Depends(session)):
    student = s.exec(select(Student).where(Student.email == body.email.lower())).first()
    if not student or not student.password_hash:
        raise HTTPException(401, "Invalid email or password")
    try:
        passwords.verify(student.password_hash, body.password)
    except (VerifyMismatchError, VerificationError):
        raise HTTPException(401, "Invalid email or password")
    course = s.get(Course, student.course_id)
    if not course:
        raise HTTPException(401, "Invalid student account")
    _create_mapping(student, s)
    return _student_response(student, course, s)


@router.get("/me")
def student_me(st: Student = Depends(current_student), s: Session = Depends(session)):
    course = s.get(Course, st.course_id)
    section = s.get(Section, st.section_id) if st.section_id else None
    return {
        "id": st.id,
        "email": st.email,
        "course_id": st.course_id,
        "course_name": course.name if course else "",
        "section_id": st.section_id,
        "section_name": section.name if section else None,
    }


@router.get("/courses")
def student_courses(st: Student = Depends(current_student), s: Session = Depends(session)):
    """Return all courses associated with this student's account."""
    courses = []
    student_records = s.exec(select(Student).where(Student.email == st.email)).all() if st.email else [st]
    for sr in student_records:
        c = s.get(Course, sr.course_id)
        if c:
            mat_count = len(s.exec(select(Material).where(Material.course_id == c.id)).all())
            msg_count = len(s.exec(select(Message).where(Message.student_id == sr.id, Message.course_id == c.id)).all())
            courses.append({
                "id": c.id,
                "name": c.name,
                "join_code": c.join_code,
                "is_current": c.id == st.course_id,
                "materials_count": mat_count,
                "questions_count": msg_count,
                "joined_at": sr.created_at.isoformat() if sr.created_at else None,
            })
    return courses


@router.get("/join/{code}")
def join_info(code: str, s: Session = Depends(session)):
    course = s.exec(select(Course).where(Course.join_code == code.upper())).first()
    if not course:
        raise HTTPException(404, "Course not found")
    return {"name": course.name, "joining_open": course.joining_open}


@router.post("/join")
def join(body: JoinIn, request: Request, s: Session = Depends(session)):
    enforce(f"join:{client_ip(request)}", settings.join_rate_limit_per_min)
    if not body.consent:
        raise HTTPException(400, "Consent is required")
    course = s.exec(select(Course).where(Course.join_code == body.code.upper())).first()
    if not course:
        raise HTTPException(404, "Course not found")
    if not course.joining_open:
        raise HTTPException(403, "Joining is closed")
    student = Student(course_id=course.id, consent_version=settings.consent_version)
    s.add(student)
    s.commit()
    s.refresh(student)
    return _student_response(student, course)


def student_material(material: Material, student: Student) -> dict:
    return {"id": material.id, "filename": material.filename, "kind": material.kind,
            "size_kb": material.size_kb, "status": material.status, "chunks": material.chunks,
            "error": material.error, "file_url": signed_material_url(material.id, student.id)
            if material.kind == "PDF" and material.status == "indexed" else None}


@router.post("/switch-course/{target_course_id}")
def switch_course(target_course_id: int, st: Student = Depends(current_student), s: Session = Depends(session)):
    """Switch active course for a student enrolled in multiple courses under the same email."""
    if not st.email:
        raise HTTPException(400, "Anonymous session cannot switch courses. Please sign in.")
    target_student = s.exec(
        select(Student).where(Student.email == st.email, Student.course_id == target_course_id)
    ).first()
    if not target_student:
        raise HTTPException(404, "You are not enrolled in this course.")
    token = student_token(target_student.id, target_student.course_id)
    return {"access_token": token, "token_type": "bearer", "course_id": target_course_id}


@router.get("/materials")
def materials(course_id: Optional[int] = Query(None), st: Student = Depends(current_student), s: Session = Depends(session)):
    target_course_id = course_id if course_id is not None else st.course_id
    target_st = st
    if course_id is not None and course_id != st.course_id and st.email:
        alt = s.exec(select(Student).where(Student.email == st.email, Student.course_id == course_id)).first()
        if alt:
            target_st = alt
    rows = s.exec(select(Material).where(Material.course_id == target_course_id)).all()
    return [student_material(material, target_st) for material in rows]


@router.get("/materials/{material_id}/file")
def material_file(
    material_id: int,
    student_id: Optional[int] = Query(None),
    expires: Optional[int] = Query(None),
    signature: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    s: Session = Depends(session),
):
    authenticated_student_id = None
    if student_id and expires and signature:
        if valid_material_signature(material_id, student_id, expires, signature):
            authenticated_student_id = student_id

    if not authenticated_student_id:
        raw_token = token
        if not raw_token and authorization and authorization.startswith("Bearer "):
            raw_token = authorization[7:].strip()
        if raw_token:
            try:
                payload = jwt.decode(raw_token, settings.jwt_secret, algorithms=["HS256"])
                if payload.get("role") == "student":
                    authenticated_student_id = int(payload["student_id"])
            except Exception:
                pass

    if not authenticated_student_id:
        raise HTTPException(401, "Invalid or expired file URL")

    material = s.get(Material, material_id)
    if not material or material.status != "indexed":
        raise HTTPException(404, "Material not found")

    student = s.get(Student, authenticated_student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    is_authorized = (student.course_id == material.course_id)
    if not is_authorized and student.email:
        alt = s.exec(select(Student).where(Student.email == student.email, Student.course_id == material.course_id)).first()
        if alt:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(403, "Material does not belong to your enrolled course")

    path = Path(settings.upload_dir) / f"{material.id}_{material.filename}"
    if not path.exists():
        alt_path = Path("data/demo_materials") / material.filename
        if alt_path.exists():
            path = alt_path
        else:
            raise HTTPException(404, "Material file not found")

    headers = {
        "Content-Disposition": f'inline; filename="{material.filename}"',
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=3600",
    }
    return FileResponse(
        path,
        filename=material.filename,
        media_type="application/pdf",
        content_disposition_type="inline",
        headers=headers,
    )


@router.get("/materials/{material_id}/content")
def material_content(
    material_id: int,
    st: Student = Depends(current_student),
    s: Session = Depends(session),
):
    material = s.get(Material, material_id)
    if not material or material.status != "indexed":
        raise HTTPException(404, "Material not found or not indexed")

    is_authorized = (material.course_id == st.course_id)
    if not is_authorized and st.email:
        alt = s.exec(select(Student).where(Student.email == st.email, Student.course_id == material.course_id)).first()
        if alt:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(403, "Material does not belong to your enrolled course")

    path = Path(settings.upload_dir) / f"{material.id}_{material.filename}"
    if not path.exists():
        alt_path = Path("data/demo_materials") / material.filename
        if alt_path.exists():
            path = alt_path
        else:
            raise HTTPException(404, "Material file not found")

    sections = []
    suffix = path.suffix.lower()
    try:
        if suffix == ".pdf":
            from pypdf import PdfReader
            reader = PdfReader(path)
            for idx, page in enumerate(reader.pages):
                txt = (page.extract_text() or "").strip()
                if txt:
                    sections.append({"label": f"Page {idx + 1}", "content": txt})
        elif suffix in {".md", ".txt"}:
            txt = path.read_text(encoding="utf-8", errors="ignore").strip()
            sections.append({"label": "Full Document", "content": txt})
        else:
            from ..services.ingest import EXT
            if suffix in EXT:
                raw = EXT[suffix](path)
                for label, txt in raw:
                    if txt.strip():
                        sections.append({"label": label, "content": txt.strip()})
    except Exception as exc:
        logger.warning("Error extracting text for material %s: %s", material_id, exc)

    full_text = "\n\n".join(sec["content"] for sec in sections)
    return {
        "id": material.id,
        "filename": material.filename,
        "kind": material.kind,
        "size_kb": material.size_kb,
        "sections": sections,
        "full_text": full_text,
        "file_url": signed_material_url(material.id, st.id),
    }


def enforce_rate_limit(student: Student, s: Session) -> None:
    since = datetime.now(timezone.utc) - timedelta(minutes=1)
    count = len(s.exec(select(Message).where(Message.student_id == student.id,
                                             Message.course_id == student.course_id,
                                             Message.created_at >= since)).all())
    if count >= settings.rate_limit_per_min:
        raise HTTPException(429, "Please wait before sending another question")


@router.post("/chat")
async def chat(body: ChatIn, background: BackgroundTasks,
               request: Request, st: Student = Depends(current_student), s: Session = Depends(session)):
    started = datetime.now(timezone.utc)
    enforce(f"chat-ip:{client_ip(request)}", settings.chat_ip_rate_limit_per_min)
    enforce(f"chat-student:{st.id}", settings.chat_student_rate_limit_per_min)
    enforce_rate_limit(st, s)

    # Validate material scoping
    if body.material_id:
        mat = s.get(Material, body.material_id)
        if not mat or mat.course_id != st.course_id:
            raise HTTPException(404, "Specified material does not belong to your course.")

    # Context compaction: Retrieve prior turns for session to preserve recent context while compacting older history
    prior_msgs = []
    if body.session_id:
        prior_msgs = s.exec(
            select(Message)
            .where(
                Message.student_id == st.id,
                Message.course_id == st.course_id,
                Message.session_id == body.session_id,
            )
            .order_by(Message.created_at)
        ).all()

    history_turns = []
    for pm in prior_msgs:
        history_turns.append({"role": "user", "content": pm.text})
        if pm.answer:
            history_turns.append({"role": "assistant", "content": pm.answer})

    compacted_summary, verbatim_turns = compact_history(history_turns)

    hits = await asyncio.to_thread(rag.retrieve, st.course_id, body.text, None, body.material_id)
    similarity = hits[0]["sim"] if hits else 0.0
    topic_key = rag.topic_of(hits)
    concept = s.exec(select(Concept).where(Concept.course_id == st.course_id,
                                             Concept.key == topic_key)).first() if topic_key else None
    if rag.grounding_refused(hits):
        message = Message(course_id=st.course_id, student_id=st.id, session_id=body.session_id,
                          material_id=body.material_id, text=body.text, answer=rag.REFUSAL,
                          concept_id=None, similarity=similarity, intent="gap")
        s.add(message)
        s.commit()
        s.refresh(message)
        logger.info("chat_metrics student_id=%s latency_ms=%d retrieved=%d refusal=yes",
                    st.id, int((datetime.now(timezone.utc) - started).total_seconds() * 1000), len(hits))
        return {"message_id": message.id, "answer": rag.REFUSAL, "sources": []}
    try:
        answer, sources = await rag.answer(
            body.text,
            hits,
            history_messages=verbatim_turns,
            compacted_summary=compacted_summary,
        )
    except (APIError, APITimeoutError, ConnectionError, TimeoutError):
        raise HTTPException(503, "The tutor is temporarily unavailable. Please try again.")
    message = Message(course_id=st.course_id, student_id=st.id, session_id=body.session_id,
                      material_id=body.material_id, text=body.text, answer=answer,
                      concept_id=concept.id if concept else None, similarity=similarity,
                      intent="" if concept else "gap")
    s.add(message)
    s.commit()
    s.refresh(message)
    if not s.exec(select(AnalysisJob).where(AnalysisJob.message_id == message.id)).first():
        s.add(AnalysisJob(message_id=message.id, course_id=st.course_id))
        s.commit()
    FastAPIJobs(background).enqueue(analysis.analyze, message.id)
    logger.info("chat_metrics student_id=%s latency_ms=%d retrieved=%d refusal=no",
                st.id, int((datetime.now(timezone.utc) - started).total_seconds() * 1000), len(hits))
    return {"message_id": message.id, "answer": answer, "sources": sources}


@router.get("/messages")
def messages(course_id: Optional[int] = Query(None), st: Student = Depends(current_student), s: Session = Depends(session)):
    target_course_id = course_id if course_id is not None else st.course_id
    target_student_id = st.id
    if course_id is not None and course_id != st.course_id and st.email:
        alt = s.exec(select(Student).where(Student.email == st.email, Student.course_id == course_id)).first()
        if alt:
            target_student_id = alt.id
    rows = s.exec(select(Message).where(Message.student_id == target_student_id,
                                        Message.course_id == target_course_id)
                 .order_by(Message.created_at)).all()
    return [{"message_id": row.id, "question": row.text, "answer": row.answer,
             "feedback": row.feedback, "session_id": row.session_id,
             "material_id": row.material_id} for row in rows]


@router.get("/conversations")
def conversations(st: Student = Depends(current_student), s: Session = Depends(session)):
    """List student conversation sessions grouped by session_id."""
    msgs = s.exec(
        select(Message)
        .where(Message.student_id == st.id, Message.course_id == st.course_id)
        .order_by(Message.created_at.desc())
    ).all()
    sessions: dict[str, dict] = {}
    for m in msgs:
        sid = m.session_id or "default"
        if sid not in sessions:
            sessions[sid] = {
                "session_id": sid,
                "last_message_at": m.created_at.isoformat() if m.created_at else None,
                "snippet": m.text[:60] if m.text else "",
                "count": 0,
                "material_id": m.material_id,
            }
        sessions[sid]["count"] += 1
    return list(sessions.values())


@router.post("/feedback")
def feedback(body: FeedbackIn, st: Student = Depends(current_student), s: Session = Depends(session)):
    if body.value not in ("clear", "unclear"):
        raise HTTPException(400, "Invalid feedback")
    message = s.exec(select(Message).where(Message.id == body.message_id,
                                            Message.student_id == st.id,
                                             Message.course_id == st.course_id)).first()
    if not message:
        raise HTTPException(404, "Message not found")
    message.feedback = body.value
    s.add(message)
    s.commit()
    return {"ok": True}


# Consent & Research Ethics Endpoints
@router.get("/consent")
def student_consent_status(st: Student = Depends(current_student), s: Session = Depends(session)):
    """Return student consent record and voluntary research participation status."""
    mapping = s.exec(select(LearnerMap).where(LearnerMap.user_id == st.id)).first()
    status = mapping.research_participation_status if mapping else "none"
    return {
        "student_id": st.id,
        "consent_version": st.consent_version,
        "consented_at": st.created_at.isoformat() if st.created_at else None,
        "research_participation_status": status,
        "is_participating": status == "active",
        "study_name": "Cognitive Load and Generative AI in Introductory Computer Science Education (Pilot Evaluation)",
        "protocol_version": "v0.4-pilot-protocol-draft",
        "can_withdraw": status == "active",
    }


@router.post("/consent/withdraw")
def student_withdraw_consent(st: Student = Depends(current_student), s: Session = Depends(session)):
    """Voluntarily withdraw student from research study without impacting normal course materials."""
    mapping = s.exec(select(LearnerMap).where(LearnerMap.user_id == st.id)).first()
    if not mapping:
        raise HTTPException(404, "Research learner mapping not found")
    mapping.research_participation_status = "withdrawn"
    mapping.updated_at = datetime.now(timezone.utc)
    s.add(mapping)
    s.commit()
    try:
        research_request("POST", f"/learners/{mapping.research_learner_id}/withdraw", mapping)
    except Exception as exc:
        logger.warning("Failed to proxy research withdrawal: %s", exc)
    return {"ok": True, "participation_status": "withdrawn"}


def _research_mapping(student: Student, s: Session) -> LearnerMap:
    mapping = s.exec(select(LearnerMap).where(LearnerMap.user_id == student.id)).first()
    if not mapping:
        mapping = _create_mapping(student, s)
    return mapping


@router.get("/research/loops")
def research_loops(st: Student = Depends(current_student), s: Session = Depends(session)):
    mapping = _research_mapping(st, s)
    if mapping.research_participation_status != "active":
        raise HTTPException(403, "Research participation is withdrawn. Course materials remain accessible.")
    return research_request("GET", "/learning/loops", mapping)


@router.post("/research/loops/start")
def research_loops_start(st: Student = Depends(current_student), s: Session = Depends(session)):
    mapping = _research_mapping(st, s)
    if mapping.research_participation_status != "active":
        raise HTTPException(403, "Research participation is withdrawn. Course materials remain accessible.")
    return research_request("POST", "/learning/loops/start", mapping)


@router.get("/research/tasks")
def research_tasks(st: Student = Depends(current_student), s: Session = Depends(session)):
    mapping = _research_mapping(st, s)
    if mapping.research_participation_status != "active":
        return []
    return research_request("GET", "/tasks/learner/" + str(mapping.research_learner_id), mapping)


@router.post("/research/tasks/{task_id}/start")
def research_task_start(task_id: int, st: Student = Depends(current_student), s: Session = Depends(session)):
    mapping = _research_mapping(st, s)
    if mapping.research_participation_status != "active":
        raise HTTPException(403, "Research participation is withdrawn.")
    return research_request("POST", f"/tasks/{task_id}/start", mapping)


@router.post("/research/tasks/{task_id}/submit")
def research_task_submit(
    task_id: int,
    body: ResearchSubmission,
    st: Student = Depends(current_student),
    s: Session = Depends(session),
):
    mapping = _research_mapping(st, s)
    if mapping.research_participation_status != "active":
        raise HTTPException(403, "Research participation is withdrawn.")
    return research_request("POST", f"/tasks/{task_id}/submit", mapping, body.model_dump())


@router.get("/research/learner")
def research_learner(st: Student = Depends(current_student), s: Session = Depends(session)):
    mapping = _research_mapping(st, s)
    return research_request("GET", f"/learners/{mapping.research_learner_id}", mapping)


@router.get("/research/learner/status")
def research_learner_status(st: Student = Depends(current_student), s: Session = Depends(session)):
    mapping = _research_mapping(st, s)
    if mapping.research_participation_status != "active":
        return {
            "learner_id": mapping.research_learner_id,
            "participation_status": "withdrawn",
            "has_future_assessments": False,
            "next_assessment_at": None,
        }
    return research_request("GET", f"/learners/{mapping.research_learner_id}/status", mapping)


@router.post("/research/ai/chat")
def research_ai_chat(
    body: ResearchAIChatIn,
    st: Student = Depends(current_student),
    s: Session = Depends(session),
):
    mapping = _research_mapping(st, s)
    if mapping.research_participation_status != "active":
        raise HTTPException(403, "Research participation is withdrawn.")
    return research_request("POST", "/ai/chat", mapping, body.model_dump())
