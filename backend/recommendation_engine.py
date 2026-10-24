"""
AI-powered learning recommendations engine.
Consumes quiz/mastery/fatigue/reflection signals and returns prioritized recommendations.
"""
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database import (
    StudentMastery, LearningJourneyAttempt, DiagnosticAttempt,
    LearningFatigueLog, Reflection, LearningRecommendation, Topic
)


def _topic_name(db: Session, topic_id: int) -> str:
    t = db.query(Topic).filter(Topic.id == topic_id).first()
    return t.name if t else f"Topic {topic_id}"


def generate_recommendations(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """
    Rule-based + data-driven recommendation engine.
    Returns a list of recommendation dicts sorted by priority.
    """
    recs: List[Dict[str, Any]] = []

    # 1. Low-mastery topics → review/practice
    masteries = (
        db.query(StudentMastery)
        .filter(StudentMastery.user_id == user_id)
        .all()
    )
    for m in sorted(masteries, key=lambda x: x.mastery_score):
        if m.mastery_score < 50:
            recs.append({
                "type": "review",
                "topic_id": m.topic_id,
                "title": f"Review: {_topic_name(db, m.topic_id)}",
                "reason": f"Mastery is {m.mastery_score:.0f}% — well below target. Revisit key concepts before advancing.",
                "priority": 1,
            })
        elif m.mastery_score < 75:
            recs.append({
                "type": "practice",
                "topic_id": m.topic_id,
                "title": f"Practice: {_topic_name(db, m.topic_id)}",
                "reason": f"Mastery is {m.mastery_score:.0f}%. Targeted practice will consolidate understanding.",
                "priority": 2,
            })

    # 2. High fatigue → break recommendation
    latest_fatigue = (
        db.query(LearningFatigueLog)
        .filter(LearningFatigueLog.user_id == user_id)
        .order_by(LearningFatigueLog.recorded_at.desc())
        .first()
    )
    if latest_fatigue and latest_fatigue.fatigue_score >= 60 and not latest_fatigue.break_taken:
        recs.append({
            "type": "break",
            "topic_id": None,
            "title": "Take a scheduled break",
            "reason": f"Fatigue score is {latest_fatigue.fatigue_score:.0f}%. Research shows a 10-min break improves subsequent session scores by ~17%.",
            "priority": 1,
        })

    # 3. Learning gain analysis — suggest advancing if gain is strong
    recent_attempts = (
        db.query(LearningJourneyAttempt)
        .filter(LearningJourneyAttempt.user_id == user_id)
        .order_by(LearningJourneyAttempt.started_at.desc())
        .limit(5)
        .all()
    )
    for attempt in recent_attempts:
        gain = (attempt.post_score or 0) - (attempt.pre_score or 0)
        if gain >= 30:
            recs.append({
                "type": "next_topic",
                "topic_id": attempt.topic_id,
                "title": f"Advance: {_topic_name(db, attempt.topic_id)}",
                "reason": f"Strong learning gain of +{gain:.0f}% detected. You are ready to progress to the next topic.",
                "priority": 3,
            })
        elif gain < 0:
            recs.append({
                "type": "review",
                "topic_id": attempt.topic_id,
                "title": f"Revisit: {_topic_name(db, attempt.topic_id)}",
                "reason": f"Post-quiz score dropped vs pre-quiz on this topic. Returning to fundamentals is advised.",
                "priority": 1,
            })

    # 4. Unanswered reflective confusions → suggest AI tutor
    confusions = (
        db.query(Reflection)
        .filter(Reflection.user_id == user_id, Reflection.confusion != None, Reflection.confusion != "")
        .order_by(Reflection.created_at.desc())
        .limit(3)
        .all()
    )
    for ref in confusions:
        recs.append({
            "type": "tutor",
            "topic_id": ref.topic_id,
            "title": "Clarify with AI Tutor",
            "reason": f"You noted confusion in a recent reflection. Ask the AI Tutor to explain it now.",
            "priority": 2,
        })

    # Deduplicate by (type, topic_id), keep highest priority
    seen = {}
    for rec in recs:
        key = (rec["type"], rec.get("topic_id"))
        if key not in seen or rec["priority"] < seen[key]["priority"]:
            seen[key] = rec

    results = sorted(seen.values(), key=lambda r: r["priority"])

    # Persist to DB (upsert-style: clear and re-insert latest batch)
    db.query(LearningRecommendation).filter(
        LearningRecommendation.user_id == user_id,
        LearningRecommendation.actioned == False,
    ).delete()
    for rec in results[:10]:
        db.add(LearningRecommendation(
            user_id=user_id,
            topic_id=rec.get("topic_id"),
            recommendation_type=rec["type"],
            title=rec["title"],
            reason=rec["reason"],
            priority=rec["priority"],
            created_at=datetime.utcnow(),
        ))
    db.commit()

    return results


def get_persisted_recommendations(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """Return the latest persisted recommendations for a student."""
    rows = (
        db.query(LearningRecommendation)
        .filter(LearningRecommendation.user_id == user_id, LearningRecommendation.actioned == False)
        .order_by(LearningRecommendation.priority, LearningRecommendation.created_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "id": r.id,
            "type": r.recommendation_type,
            "topic_id": r.topic_id,
            "title": r.title,
            "reason": r.reason,
            "priority": r.priority,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
