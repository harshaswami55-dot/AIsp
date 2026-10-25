"""
Learning features driven by authored content in backend/content/:
question bank sync + adaptive quiz selection, reference-based scoring (Reflections, Teach the AI,
Caselets), day-wise learning gain, fatigue check, real student dashboard, Skill Studio, Caselets.
"""
import glob
import json
import math
import os
import random
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ai_engine import detect_misconceptions
from auth import require_faculty, require_student
from database import (
    CaseletProject, Course, LearningFatigueLog, LearningJourneyAttempt, Module, Question, QuizResult,
    Reflection, SessionLocal, Topic, User, get_db,
)

router = APIRouter(prefix="/api")
CONTENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "content")
PASS_MARK = 80.0
QUIZ_SIZE = 20


def normalize(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value or "").replace("�", "-").split()).casefold()


def _read_json(name, default):
    path = os.path.join(CONTENT_DIR, name)
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _load_topic_content() -> Dict[str, dict]:
    out = {}
    for path in sorted(glob.glob(os.path.join(CONTENT_DIR, "module_*.json"))):
        with open(path, encoding="utf-8") as f:
            for topic in json.load(f).get("topics", []):
                out[normalize(topic["topic"])] = topic
    return out


TOPIC_CONTENT = _load_topic_content()
CAREERS = _read_json("careers.json", {"roles": []})["roles"]
CASELETS = _read_json("caselets.json", {"caselets": []})["caselets"]


def ensure_access(payload: dict, user_id: int):
    """Students see their own data; faculty, dean and admin see everyone's."""
    if payload.get("sub") != str(user_id) and payload.get("role") not in {"faculty", "admin", "dean"}:
        raise HTTPException(status_code=403, detail="Cannot access another user's data")


def _me(payload: dict) -> int:
    return int(payload["sub"])


# ====================================================
# QUESTION BANK
# ====================================================
LEVELS = {"foundation": "easy", "easy": "easy", "intermediate": "medium", "application": "medium",
          "medium": "medium", "advanced": "hard", "challenge": "hard", "hard": "hard"}


def level(question: Question) -> str:
    return LEVELS.get((question.difficulty or "").lower(), "medium")


def sync_question_bank():
    """Inserts authored questions from content/module_*.json that are not yet in the database."""
    db = SessionLocal()
    try:
        topics = {normalize(t.name): t for t in db.query(Topic).all()}
        existing = {(q.topic_id, normalize(q.question_text)) for q in db.query(Question.topic_id, Question.question_text)}
        added = 0
        for key, content in TOPIC_CONTENT.items():
            topic = topics.get(key)
            if not topic:
                print(f"WARNING: content topic not in syllabus: {content['topic']!r}")
                continue
            for q in content.get("questions", []):
                if (topic.id, normalize(q["q"])) in existing:
                    continue
                db.add(Question(
                    module_id=topic.module_id, topic_id=topic.id, question_text=q["q"],
                    question_type="mcq", options_json=json.dumps(q["options"]), correct_answer=q["answer"],
                    explanation=q["explanation"], difficulty=q["difficulty"], category=q["concept"][:30],
                    co_tag=q["concept"][:20], quiz_stage="both",
                ))
                added += 1
        db.commit()
        print(f"Question bank sync: {added} new questions.")
    finally:
        db.close()


def capability(db: Session, user_id: int) -> float:
    recent = db.query(QuizResult.score_pct).filter(QuizResult.user_id == user_id).order_by(QuizResult.created_at.desc()).limit(10).all()
    return sum(s for (s,) in recent) / len(recent) if recent else 60.0


def difficulty_mix(score: float) -> Dict[str, int]:
    if score < 50:
        return {"easy": 10, "medium": 7, "hard": 3}
    if score < PASS_MARK:
        return {"easy": 5, "medium": 10, "hard": 5}
    return {"easy": 3, "medium": 7, "hard": 10}


def select_quiz(db: Session, user_id: int, topic_id: int, quiz_type: str) -> List[Question]:
    """20 questions mixed by the student's capability; Quiz 2 avoids questions already seen on this topic."""
    pool = [q for q in db.query(Question).filter(Question.topic_id == topic_id).all() if _gradable(q)]
    attempt = None
    if quiz_type == "post":
        attempt = db.query(LearningJourneyAttempt).filter(
            LearningJourneyAttempt.user_id == user_id, LearningJourneyAttempt.topic_id == topic_id,
            LearningJourneyAttempt.pre_completed_at.is_not(None),
        ).order_by(LearningJourneyAttempt.created_at.desc()).first()
    basis = attempt.post_score_pct if attempt and attempt.post_completed_at else (attempt.pre_score_pct if attempt else None)
    mix = difficulty_mix(basis if basis is not None else capability(db, user_id))
    seen = set()
    if attempt:
        for key in ("pre_answers_json", "post_answers_json"):
            seen |= {d.get("question_id") for d in json.loads(getattr(attempt, key) or "[]")}
    rng = random.Random()
    by_level = defaultdict(list)
    for q in pool:
        by_level[level(q)].append(q)
    chosen = []
    for lvl, n in mix.items():
        # unseen questions first; repeat seen ones of the same level before breaking the difficulty mix
        candidates = sorted(by_level[lvl], key=lambda q: (q.id in seen, rng.random()))
        chosen += candidates[:n]
    leftovers = [q for q in pool if q not in chosen]
    leftovers.sort(key=lambda q: (q.id in seen, rng.random()))
    chosen += leftovers[:max(0, QUIZ_SIZE - len(chosen))]
    order = {"easy": 0, "medium": 1, "hard": 2}
    return sorted(chosen, key=lambda q: order[level(q)])


def options_of(q: Question) -> List[str]:
    return json.loads(q.options_json) if q.options_json and q.options_json != "[]" else [o for o in (q.option_a, q.option_b, q.option_c, q.option_d) if o]


def _gradable(q: Question) -> bool:
    return bool(q.correct_answer) and q.correct_answer in options_of(q)


def topics_to_study(weak_concepts: list, topic: Topic, db: Session, passed: bool) -> list:
    """Groups wrong answers by concept; on a pass, points to the next topic in the syllabus."""
    counts = Counter(w.get("category") or "General" for w in weak_concepts)
    first_expl = {}
    for w in weak_concepts:
        first_expl.setdefault(w.get("category") or "General", w.get("explanation"))
    items = [{"concept": c, "topic": topic.name, "missed": n, "why": first_expl[c]} for c, n in counts.most_common(6)]
    if passed:
        nxt = next_topic(db, topic)
        if nxt:
            items.append({"concept": "Next learning path", "topic": nxt.name, "missed": 0, "why": "You cleared 80% - move on to the next syllabus topic.", "topic_id": nxt.id, "module_id": nxt.module_id})
    return items


def next_topic(db: Session, topic: Topic) -> Optional[Topic]:
    ordered = db.query(Topic).join(Module).order_by(Module.module_number, Topic.order_index, Topic.id).all()
    ids = [t.id for t in ordered]
    i = ids.index(topic.id) if topic.id in ids else -1
    return ordered[i + 1] if 0 <= i < len(ordered) - 1 else None


# ====================================================
# REFERENCE-BASED SCORING
# ====================================================
STOP = set("a an the and or of to in on for is are was were be been it its this that these those with as by at from "
           "we you i they he she can will would should could may might into than then so such which who what when how "
           "do does did not no but if also about there their our your more most very".split())
BUSINESS_TERMS = {"manager", "management", "decision", "inventory", "stock", "cost", "budget", "plan", "planning",
                  "revenue", "sales", "demand", "customer", "staffing", "capacity", "profit", "risk", "business", "price"}


def _stem(word: str) -> str:
    for suffix in ("ations", "ation", "ing", "ies", "ed", "es", "s"):
        if len(word) > len(suffix) + 3 and word.endswith(suffix):
            return word[: -len(suffix)]
    return word


def tokens(text: str) -> List[str]:
    return [_stem(w) for w in re.findall(r"[a-z0-9]+", (text or "").lower()) if w not in STOP]


def _cosine(a: Counter, b: Counter) -> float:
    dot = sum(a[k] * b[k] for k in a if k in b)
    norm = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


def rubric_band(score: float) -> str:
    return "Excellent (4)" if score >= 85 else "Good (3)" if score >= 70 else "Satisfactory (2)" if score >= 50 else "Needs Improvement (1)"


def score_against_reference(text: str, references: List[str], key_concepts: List[str]) -> dict:
    """Concept coverage (60%) + closeness to the nearest reference answer (40%), scaled down for very short answers."""
    toks = tokens(text)
    tok_set = set(toks)
    matched, missing = [], []
    for concept in key_concepts:
        parts = tokens(concept)
        (matched if parts and all(p in tok_set for p in parts) else missing).append(concept)
    coverage = len(matched) / len(key_concepts) if key_concepts else 0.0
    sims = [_cosine(Counter(toks), Counter(tokens(r))) for r in references]
    best = max(range(len(sims)), key=lambda i: sims[i]) if sims else None
    similarity = sims[best] if sims else 0.0
    words = len(re.findall(r"\w+", text or ""))
    length_factor = min(1.0, words / 40)
    score = round(100 * (0.6 * min(1.0, coverage / 0.6) + 0.4 * min(1.0, similarity / 0.45)) * length_factor, 1)
    misconceptions = [{"name": m["name"], "explanation": m["explanation"]} for m in detect_misconceptions(text or "")]
    if misconceptions:
        score = round(score * 0.8, 1)
    return {
        "score": score,
        "band": rubric_band(score),
        "concept_coverage_pct": round(coverage * 100, 1),
        "reference_similarity_pct": round(min(1.0, similarity / 0.45) * 100, 1),
        "matched_concepts": matched,
        "missing_concepts": missing[:6],
        "closest_reference": references[best] if best is not None else None,
        "closest_reference_index": (best + 1) if best is not None else None,
        "misconceptions": misconceptions,
        "word_count": words,
    }


def topic_reference(topic_name: str) -> dict:
    content = TOPIC_CONTENT.get(normalize(topic_name))
    if not content:
        raise HTTPException(status_code=409, detail="Reference answers for this topic are not available yet")
    return content


def course_label(db: Session) -> str:
    course = db.query(Course).order_by(Course.id).first()
    return f"{course.code} {course.title}" if course else "Your courses"


@router.get("/public/stats")
def public_stats(db: Session = Depends(get_db)):
    """Course-level counts for the public front page (no personal data)."""
    return {
        "modules": db.query(Module).count(),
        "topics": db.query(Topic).count(),
        "questions": sum(len(c.get("questions", [])) for c in TOPIC_CONTENT.values()),
        "reference_answers": sum(len(c.get("references", [])) for c in TOPIC_CONTENT.values()),
        "job_roles": len(CAREERS),
        "skills": sum(len(r.get("skills", [])) for r in CAREERS),
        "caselets": len(CASELETS),
        "courses": [{
            "code": c.code, "title": c.title,
            "modules": [{"number": m.module_number, "title": m.title, "hours": m.teaching_hours,
                         "topics": [t.name for t in sorted(m.topics, key=lambda t: t.order_index)]}
                        for m in sorted(c.modules, key=lambda m: m.module_number)],
        } for c in db.query(Course).order_by(Course.id)],
    }


def completed_topic_ids(db: Session, user_id: int) -> List[int]:
    return [tid for (tid,) in db.query(QuizResult.topic_id).filter(QuizResult.user_id == user_id).distinct()]


@router.get("/topics/completed")
def get_completed_topics(db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    ids = completed_topic_ids(db, _me(payload))
    topics = db.query(Topic).filter(Topic.id.in_(ids)).all() if ids else []
    return [{"id": t.id, "name": t.name, "module_id": t.module_id, "has_reference": normalize(t.name) in TOPIC_CONTENT} for t in topics]


# ====================================================
# REFLECTIONS (daily recall scored against three references)
# ====================================================
class RecallRequest(BaseModel):
    topic_id: int
    recall_text: str = Field(min_length=1, max_length=500)


def _reflection_out(r: Reflection, student_name: Optional[str] = None) -> dict:
    return {
        "id": r.id, "user_id": r.user_id, "student_name": student_name, "topic_id": r.topic_id, "topic_name": r.topic_name,
        "recall_text": r.understanding, "score": r.score, "feedback": json.loads(r.feedback_json) if r.feedback_json else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.post("/reflections/recall")
def save_recall(req: RecallRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    user_id = _me(payload)
    topic = db.query(Topic).filter(Topic.id == req.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    content = topic_reference(topic.name)
    feedback = score_against_reference(req.recall_text, content["references"], content["key_concepts"])
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    row = db.query(Reflection).filter(Reflection.user_id == user_id, Reflection.topic_id == topic.id, Reflection.created_at >= today).first()
    if not row:
        row = Reflection(user_id=user_id, topic_id=topic.id, topic_name=topic.name)
        db.add(row)
    row.understanding = req.recall_text.strip()
    row.score = feedback["score"]
    row.feedback_json = json.dumps(feedback)
    row.created_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return {**_reflection_out(row), "references": content["references"]}


@router.get("/reflections/mine")
def my_recalls(db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    rows = db.query(Reflection).filter(Reflection.user_id == _me(payload)).order_by(Reflection.created_at.desc()).all()
    return [_reflection_out(r) for r in rows]


@router.get("/faculty/reflections")
def faculty_reflections(db: Session = Depends(get_db), _: dict = Depends(require_faculty)):
    names = {u.id: u.full_name for u in db.query(User).filter(User.role == "student")}
    rows = db.query(Reflection).filter(Reflection.user_id.in_(names)).order_by(Reflection.created_at.desc()).all() if names else []
    return [_reflection_out(r, names.get(r.user_id)) for r in rows]


# ====================================================
# TEACH THE AI
# ====================================================
class TeachRequest(BaseModel):
    topic_id: int
    explanation: str = Field(min_length=1, max_length=3000)


@router.get("/teach/topic")
def teach_topic(exclude: Optional[int] = None, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    """AI picks a topic from the student's completed syllabus, favouring the weakest ones."""
    user_id = _me(payload)
    best = {}
    for tid, score in db.query(QuizResult.topic_id, QuizResult.score_pct).filter(QuizResult.user_id == user_id):
        best[tid] = max(best.get(tid, 0), score or 0)
    topics = {t.id: t for t in db.query(Topic).filter(Topic.id.in_(best)).all()} if best else {}
    candidates = [tid for tid in best if tid in topics and tid != exclude and normalize(topics[tid].name) in TOPIC_CONTENT]
    if not candidates:
        candidates = [tid for tid in best if tid in topics and normalize(topics[tid].name) in TOPIC_CONTENT]
    if not candidates:
        return {"topic_id": None, "message": "Take Quiz 1 on any topic in the AI Study Planner first — Teach the AI picks from topics you have studied."}
    weakest = sorted(candidates, key=lambda tid: best[tid])[:3]
    topic = topics[random.choice(weakest)]
    return {"topic_id": topic.id, "topic_name": topic.name, "your_best_quiz_score": best[topic.id],
            "prompt": f"Explain \"{topic.name}\" in your own words, as you would to a manager who has never studied forecasting."}


@router.post("/teach/evaluate")
def teach_evaluate(req: TeachRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    topic = db.query(Topic).filter(Topic.id == req.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    content = topic_reference(topic.name)
    result = score_against_reference(req.explanation, content["references"], content["key_concepts"])
    business = len(BUSINESS_TERMS & set(re.findall(r"[a-z]+", req.explanation.lower())))
    criteria = [
        {"criterion": "Conceptual Understanding", "weight": 30, "score": round(min(100, result["concept_coverage_pct"] / 0.6), 1)},
        {"criterion": "Knowledge of Terminology", "weight": 25, "score": round(min(100, len(result["matched_concepts"]) * 20), 1)},
        {"criterion": "Reasoning & Structure", "weight": 20, "score": result["reference_similarity_pct"]},
        {"criterion": "Business Interpretation", "weight": 15, "score": min(100, business * 34)},
        {"criterion": "Free of Misconceptions", "weight": 10, "score": 0 if result["misconceptions"] else 100},
    ]
    return {**result, "topic_name": topic.name, "criteria": criteria, "references": content["references"]}


# ====================================================
# LEARNING GAIN (day-wise, from quiz scores)
# ====================================================
def learning_gain_data(db: Session, user_id: int) -> dict:
    rows = db.query(QuizResult).filter(QuizResult.user_id == user_id).order_by(QuizResult.created_at).all()
    days = defaultdict(lambda: {"pre": [], "post": [], "topics": set()})
    first_pre, best_post, names = {}, {}, {}
    for r in rows:
        d = days[r.created_at.date().isoformat()]
        d[r.quiz_type].append(r.score_pct)
        d["topics"].add(r.topic_name)
        names[r.topic_id] = r.topic_name
        if r.quiz_type == "pre":
            first_pre.setdefault(r.topic_id, r.score_pct)
        else:
            best_post[r.topic_id] = max(best_post.get(r.topic_id, 0), r.score_pct)
    avg = lambda xs: round(sum(xs) / len(xs), 1) if xs else None
    day_rows = []
    for day, d in sorted(days.items()):
        pre, post = avg(d["pre"]), avg(d["post"])
        day_rows.append({"date": day, "quiz1_avg": pre, "quiz2_avg": post,
                         "gain": round(post - pre, 1) if pre is not None and post is not None else None,
                         "quizzes": len(d["pre"]) + len(d["post"]), "topics": sorted(d["topics"])})
    topic_rows = [{"topic_id": tid, "topic": names[tid], "quiz1": first_pre.get(tid), "quiz2_best": best_post.get(tid),
                   "gain": round(best_post[tid] - first_pre[tid], 1) if tid in best_post and tid in first_pre else None,
                   "mastered": best_post.get(tid, first_pre.get(tid, 0)) >= PASS_MARK}
                  for tid in names]
    gains = [t["gain"] for t in topic_rows if t["gain"] is not None]
    insights = []
    if day_rows:
        scored = [d for d in day_rows if d["quiz2_avg"] is not None or d["quiz1_avg"] is not None]
        latest = scored[-1]
        insights.append(f"Studied on {len(day_rows)} day(s); {sum(d['quizzes'] for d in day_rows)} quizzes taken.")
        if gains:
            insights.append(f"Average gain from Quiz 1 to best Quiz 2: {round(sum(gains) / len(gains), 1)} points across {len(gains)} topic(s).")
        best_day = max((d for d in day_rows if d["gain"] is not None), key=lambda d: d["gain"], default=None)
        if best_day and best_day["gain"] > 0:
            insights.append(f"Best day: {best_day['date']} (+{best_day['gain']} points).")
        weak = [t["topic"] for t in topic_rows if not t["mastered"]]
        if weak:
            insights.append(f"Not yet at 80%: {', '.join(weak[:4])}.")
        if len(scored) >= 2:
            a = scored[-2]["quiz2_avg"] or scored[-2]["quiz1_avg"]
            b = latest["quiz2_avg"] or latest["quiz1_avg"]
            insights.append("Scores are trending up." if b >= a else "Scores dipped on the latest day - check Learning Fatigue.")
    else:
        insights.append("No quizzes yet. Start a topic in the AI Study Planner.")
    return {
        "user_id": user_id, "days": day_rows, "topics": topic_rows,
        "average_gain": round(sum(gains) / len(gains), 1) if gains else None,
        "topics_mastered": sum(1 for t in topic_rows if t["mastered"]), "topics_attempted": len(topic_rows),
        "insights": insights,
    }


@router.get("/learning-gain/{user_id}")
def get_learning_gain(user_id: int, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    ensure_access(payload, user_id)
    return learning_gain_data(db, user_id)


@router.get("/faculty/student-insights")
def faculty_student_insights(db: Session = Depends(get_db), _: dict = Depends(require_faculty)):
    students = db.query(User).filter(User.role == "student").order_by(User.full_name).all()
    out = []
    for s in students:
        data = learning_gain_data(db, s.id)
        out.append({"student_id": s.id, "student_name": s.full_name, "username": s.username, **{k: data[k] for k in ("days", "topics", "average_gain", "topics_mastered", "topics_attempted", "insights")}})
    return out


# ====================================================
# LEARNING FATIGUE CHECK (after a Quiz 2 below 80%)
# ====================================================
class FatigueCheckRequest(BaseModel):
    topic_id: Optional[int] = None
    session_minutes: int = Field(ge=0, le=600)
    energy: int = Field(ge=1, le=5)
    focus: int = Field(ge=1, le=5)


SUGGESTIONS = [
    "Take a 10-15 minute break away from the screen, then come back to the topics listed below.",
    "Switch to a lighter activity: write a 3-line Reflection recall on what you just studied.",
    "Hydrate and stretch - short physical breaks restore attention better than scrolling.",
    "Study the missed concepts in short 20-minute blocks instead of one long session.",
    "If it is late, stop for today; sleep consolidates what you practised.",
]


@router.post("/fatigue/check")
def fatigue_check(req: FatigueCheckRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    """Combines session length, quizzes taken today, score trend and self-report into a 0-100 fatigue score."""
    user_id = _me(payload)
    since = datetime.utcnow() - timedelta(hours=12)
    today = db.query(QuizResult).filter(QuizResult.user_id == user_id, QuizResult.created_at >= since).order_by(QuizResult.created_at).all()
    reasons = []
    score = 0.0
    score += min(30, req.session_minutes / 2)
    if req.session_minutes >= 45:
        reasons.append(f"{req.session_minutes} minutes of continuous study")
    score += min(20, max(0, len(today) - 2) * 5)
    if len(today) >= 4:
        reasons.append(f"{len(today)} quizzes in the last 12 hours")
    if len(today) >= 2 and today[-1].score_pct < today[-2].score_pct:
        score += 15
        reasons.append("your latest quiz score dropped")
    self_report = ((5 - req.energy) + (5 - req.focus)) / 8  # 0..1
    score += self_report * 35
    if req.energy <= 2 or req.focus <= 2:
        reasons.append("you reported low energy or focus")
    score = round(min(100, score), 1)
    # A student who reports both low energy and low focus is fatigued, however short the session.
    fatigued = score >= 50 or (req.energy <= 2 and req.focus <= 2)
    db.add(LearningFatigueLog(user_id=user_id, session_minutes=req.session_minutes, fatigue_score=score,
                              quiz_score=today[-1].score_pct if today else None, break_taken=fatigued))
    db.commit()
    return {"fatigued": fatigued, "fatigue_score": score, "reasons": reasons or ["no strong fatigue signals"],
            "suggestions": SUGGESTIONS if fatigued else [], "next": "take_break" if fatigued else "continue_practice"}


@router.get("/fatigue/summary/{user_id}")
def fatigue_summary(user_id: int, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    ensure_access(payload, user_id)
    logs = db.query(LearningFatigueLog).filter(LearningFatigueLog.user_id == user_id).order_by(LearningFatigueLog.recorded_at).all()
    return {
        "checks": [{"at": l.recorded_at.isoformat(), "fatigue_score": l.fatigue_score, "session_minutes": l.session_minutes,
                    "quiz_score": l.quiz_score, "break_suggested": l.break_taken} for l in logs[-30:]],
        "latest": logs[-1].fatigue_score if logs else None,
        "breaks_suggested": sum(1 for l in logs if l.break_taken),
        "suggestions": SUGGESTIONS,
    }


# ====================================================
# STUDENT DASHBOARD (all derived from the student's own records)
# ====================================================
@router.get("/student/dashboard")
def student_dashboard(user_id: Optional[int] = None, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    user_id = user_id or _me(payload)
    ensure_access(payload, user_id)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student account not found")
    gain = learning_gain_data(db, user_id)
    modules = db.query(Module).order_by(Module.module_number).all()
    topic_module = {t.id: t.module_id for t in db.query(Topic).all()}
    topics_per_module = Counter(topic_module.values())
    best_by_topic = {t["topic_id"]: (t["quiz2_best"] if t["quiz2_best"] is not None else t["quiz1"]) for t in gain["topics"]}
    module_rows = []
    for m in modules:
        scores = [s for tid, s in best_by_topic.items() if topic_module.get(tid) == m.id and s is not None]
        module_rows.append({"module_id": m.id, "module_number": m.module_number, "title": m.title,
                            "topics_total": topics_per_module.get(m.id, 0), "topics_attempted": len(scores),
                            "mastery": round(sum(scores) / len(scores), 1) if scores else None})
    ranked = sorted(gain["topics"], key=lambda t: best_by_topic.get(t["topic_id"]) or 0)
    reflections = db.query(Reflection).filter(Reflection.user_id == user_id, Reflection.score.is_not(None)).all()
    fatigue = db.query(LearningFatigueLog).filter(LearningFatigueLog.user_id == user_id).order_by(LearningFatigueLog.recorded_at.desc()).first()
    projects = db.query(CaseletProject).filter(CaseletProject.user_id == user_id).count()
    scores = [s for s in best_by_topic.values() if s is not None]
    return {
        "student_name": user.full_name,
        "course_title": course_label(db),
        "overall_mastery": round(sum(scores) / len(scores), 1) if scores else None,
        "topics_attempted": gain["topics_attempted"], "topics_mastered": gain["topics_mastered"],
        "topics_total": sum(topics_per_module.values()),
        "average_gain": gain["average_gain"],
        "modules": module_rows,
        "weak_topics": [{"topic_id": t["topic_id"], "topic": t["topic"], "score": best_by_topic.get(t["topic_id"])} for t in ranked if not t["mastered"]][:5],
        "strong_topics": [{"topic_id": t["topic_id"], "topic": t["topic"], "score": best_by_topic.get(t["topic_id"])} for t in reversed(ranked) if t["mastered"]][:5],
        "recent_days": gain["days"][-7:],
        "reflection_avg": round(sum(r.score for r in reflections) / len(reflections), 1) if reflections else None,
        "reflections_count": len(reflections),
        "latest_fatigue": fatigue.fatigue_score if fatigue else None,
        "caselet_projects": projects,
        "insights": gain["insights"],
    }


# ====================================================
# SKILL STUDIO
# ====================================================
def _skill_readiness(db: Session, user_id: int, skill: dict) -> dict:
    wanted = {normalize(t) for t in skill.get("topics", [])}
    topics = [t for t in db.query(Topic).all() if normalize(t.name) in wanted]
    best = {}
    for tid, score in db.query(QuizResult.topic_id, QuizResult.score_pct).filter(QuizResult.user_id == user_id, QuizResult.topic_id.in_([t.id for t in topics])):
        best[tid] = max(best.get(tid, 0), score or 0)
    scores = [best.get(t.id) for t in topics]
    attempted = [s for s in scores if s is not None]
    readiness = round(sum(attempted) / len(topics), 1) if topics and attempted else 0.0
    return {**skill, "topic_refs": [{"topic_id": t.id, "module_id": t.module_id, "name": t.name, "best_score": best.get(t.id)} for t in topics],
            "readiness": readiness, "needs_practice": readiness < PASS_MARK}


@router.get("/skills/roles")
def list_roles(_: dict = Depends(require_student)):
    return [{k: r[k] for k in ("id", "title", "industry", "description", "salary_band") if k in r} | {"skill_count": len(r.get("skills", []))} for r in CAREERS]


@router.get("/skills/roles/{role_id}")
def role_detail(role_id: str, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    role = next((r for r in CAREERS if r["id"] == role_id), None)
    if not role:
        raise HTTPException(status_code=404, detail="Job role not found")
    skills = [_skill_readiness(db, _me(payload), s) for s in role.get("skills", [])]
    skills.sort(key=lambda s: s["readiness"])
    return {**role, "skills": skills, "role_readiness": round(sum(s["readiness"] for s in skills) / len(skills), 1) if skills else 0.0}


# ====================================================
# CASELETS
# ====================================================
class CaseletProjectRequest(BaseModel):
    model_name: str = Field(min_length=1, max_length=80)
    metrics: Dict[str, float] = {}
    skills: List[str] = []
    recommendation: str = Field(min_length=1, max_length=2500)


@router.get("/caselets")
def list_caselets(db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    done = {c for (c,) in db.query(CaseletProject.caselet_id).filter(CaseletProject.user_id == _me(payload))}
    skill_names = {s["id"]: s["name"] for r in CAREERS for s in r.get("skills", [])}
    return [{**{k: v for k, v in c.items() if k != "reference_recommendation"},
             "skill_names": [skill_names.get(s, s) for s in c.get("skills", [])], "submitted": c["id"] in done} for c in CASELETS]


@router.post("/caselets/{caselet_id}/project")
def submit_caselet_project(caselet_id: str, req: CaseletProjectRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    caselet = next((c for c in CASELETS if c["id"] == caselet_id), None)
    if not caselet:
        raise HTTPException(status_code=404, detail="Caselet not found")
    feedback = score_against_reference(req.recommendation, [caselet["reference_recommendation"]], caselet.get("key_concepts", []))
    if req.metrics:
        feedback["evidence_bonus"] = "Accuracy metrics attached from the lab run."
        feedback["score"] = min(100.0, round(feedback["score"] + 5, 1))
        feedback["band"] = rubric_band(feedback["score"])
    project = CaseletProject(user_id=_me(payload), caselet_id=caselet_id, model_name=req.model_name,
                             metrics_json=json.dumps(req.metrics), skills_json=json.dumps(req.skills),
                             recommendation=req.recommendation.strip(), score=feedback["score"], feedback_json=json.dumps(feedback))
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, **feedback, "reference_recommendation": caselet["reference_recommendation"]}


@router.get("/caselets/projects/mine")
def my_projects(db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    titles = {c["id"]: c["title"] for c in CASELETS}
    rows = db.query(CaseletProject).filter(CaseletProject.user_id == _me(payload)).order_by(CaseletProject.created_at.desc()).all()
    return [{"id": p.id, "caselet_id": p.caselet_id, "caselet_title": titles.get(p.caselet_id, p.caselet_id), "model_name": p.model_name,
             "metrics": json.loads(p.metrics_json or "{}"), "skills": json.loads(p.skills_json or "[]"), "recommendation": p.recommendation,
             "score": p.score, "feedback": json.loads(p.feedback_json or "{}"), "created_at": p.created_at.isoformat()} for p in rows]
