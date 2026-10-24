"""
Database engine configuration — SQLite locally, PostgreSQL via DATABASE_URL env var.
"""
import os
import json
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, inspect
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from dotenv import load_dotenv

load_dotenv()

_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "forecasting_partner.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DB_FILE}")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(20), default="student")  # student, faculty, admin/dean
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(200), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    diagnostic_attempts = relationship("DiagnosticAttempt", back_populates="user")
    masteries = relationship("StudentMastery", back_populates="user")
    independence_sessions = relationship("IndependenceSession", back_populates="user")
    forecast_runs = relationship("ForecastRun", back_populates="user")


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), default="SB6202")
    title = Column(String(100), default="Business Forecasting")
    school = Column(String(50), default="SOB")
    instructor = Column(String(100), default="Dr Veena A")
    semester = Column(String(10), default="III")
    credits = Column(Integer, default=4)
    total_hours = Column(Integer, default=40)
    description = Column(Text)

    modules = relationship("Module", back_populates="course")
    outcomes = relationship("CourseOutcome", back_populates="course")


class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    module_number = Column(Integer, nullable=False)
    title = Column(String(150), nullable=False)
    teaching_hours = Column(Integer, default=6)
    description = Column(Text)

    course = relationship("Course", back_populates="modules")
    topics = relationship("Topic", back_populates="module")


class Topic(Base):
    __tablename__ = "topics"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    name = Column(String(150), nullable=False)
    order_index = Column(Integer, default=1)
    description = Column(Text)
    prerequisite_id = Column(Integer, ForeignKey("topics.id"), nullable=True)

    module = relationship("Module", back_populates="topics")
    questions = relationship("Question", back_populates="topic")
    masteries = relationship("StudentMastery", back_populates="topic")
    subtopics = relationship("SubTopic", back_populates="topic", cascade="all, delete-orphan")


class SubTopic(Base):
    __tablename__ = "subtopics"
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    name = Column(String(150), nullable=False)
    order_index = Column(Integer, default=1)
    description = Column(Text)

    topic = relationship("Topic", back_populates="subtopics")


class CourseOutcome(Base):
    __tablename__ = "course_outcomes"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    code = Column(String(10), nullable=False)
    description = Column(Text, nullable=False)

    course = relationship("Course", back_populates="outcomes")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    course_outcome_code = Column(String(10))
    question_text = Column(Text, nullable=False)
    question_type = Column(String(30), default="diagnostic")
    options_json = Column(Text, default="[]")
    option_a = Column(Text)
    option_b = Column(Text)
    option_c = Column(Text)
    option_d = Column(Text)
    correct_answer = Column(Text)
    explanation = Column(Text)
    difficulty = Column(String(20), default="medium")
    blooms_level = Column(String(30))
    category = Column(String(30))
    quiz_stage = Column(String(10), default="both")
    co_tag = Column(String(20))

    topic = relationship("Topic", back_populates="questions")


class DiagnosticAttempt(Base):
    __tablename__ = "diagnostic_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    score_percentage = Column(Float)
    mastery_level = Column(String(30))
    module_mastery_json = Column(Text, default="{}")
    topic_mastery_json = Column(Text, default="{}")
    gaps_json = Column(Text, default="{}")
    answers_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="diagnostic_attempts")


class StudentMastery(Base):
    __tablename__ = "student_mastery"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    mastery_score = Column(Float, default=0.0)
    pre_score = Column(Float, default=0.0)
    post_score = Column(Float, default=0.0)
    attempts = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="masteries")
    topic = relationship("Topic", back_populates="masteries")


class MasteryHistory(Base):
    __tablename__ = "mastery_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    mastery_score = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class Misconception(Base):
    __tablename__ = "misconceptions"
    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"))
    description = Column(Text, nullable=False)
    correct_understanding = Column(Text)
    recommended_action = Column(Text)


class StudentMisconception(Base):
    __tablename__ = "student_misconceptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    misconception_id = Column(Integer, ForeignKey("misconceptions.id"))
    identified_at = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)


class ForecastDataset(Base):
    __tablename__ = "forecast_datasets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    time_col = Column(String(100))
    target_col = Column(String(100))
    feature_cols_json = Column(Text, default="[]")
    frequency = Column(String(30))
    data_json = Column(Text, default="[]")
    is_sample = Column(Boolean, default=True)
    file_path = Column(Text)
    is_builtin = Column(Boolean, default=True)
    rows = Column(Integer)
    columns_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    runs = relationship("ForecastRun", back_populates="dataset")


class ForecastRun(Base):
    __tablename__ = "forecast_runs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    dataset_id = Column(Integer, ForeignKey("forecast_datasets.id"))
    model_name = Column(String(50))
    parameters_json = Column(Text, default="{}")
    results_json = Column(Text, default="{}")
    rmse = Column(Float)
    mae = Column(Float)
    mape = Column(Float)
    managerial_recommendation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="forecast_runs")
    dataset = relationship("ForecastDataset", back_populates="runs")


class IndependenceSession(Base):
    __tablename__ = "independence_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    current_level = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    ai_independence_score = Column(Float, default=0.0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="independence_sessions")


class FacultyIntervention(Base):
    __tablename__ = "faculty_interventions"
    id = Column(Integer, primary_key=True, index=True)
    topic_name = Column(String(100), nullable=False, default="")
    module_number = Column(Integer)
    issue_summary = Column(Text, nullable=False, default="")
    students_below_proficiency_pct = Column(Float)
    common_misconception = Column(Text, nullable=False, default="")
    pre_mastery = Column(Float)
    post_mastery = Column(Float)
    learning_gain = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    topic = Column(String(150))
    misconception_description = Column(Text)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    triggered_at = Column(DateTime, default=datetime.utcnow)


class LearningJourneyAttempt(Base):
    __tablename__ = "learning_journey_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    module_id = Column(Integer, ForeignKey("modules.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"))
    subtopic_id = Column(Integer, ForeignKey("subtopics.id"), nullable=True)
    module_title = Column(String(150), default="")
    topic_name = Column(String(150), default="")
    pre_score_pct = Column(Float, default=0.0)
    post_score_pct = Column(Float, default=0.0)
    score_gain_pct = Column(Float, default=0.0)
    pre_answers_json = Column(Text, default="[]")
    post_answers_json = Column(Text, default="[]")
    pre_weak_concepts_json = Column(Text, default="[]")
    post_weak_concepts_json = Column(Text, default="[]")
    pre_completed_at = Column(DateTime, nullable=True)
    post_completed_at = Column(DateTime, nullable=True)
    mastery_status = Column(String(50), default="Not Started")
    ai_notes_read = Column(Boolean, default=False)
    practice_problems_completed = Column(Integer, default=0)
    practice_completed_subtopics_json = Column(Text, default="[]")
    started_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    revision_recommended_json = Column(Text, default="[]")


class LearningRecommendation(Base):
    """Persisted AI learning recommendations per student."""
    __tablename__ = "learning_recommendations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    recommendation_type = Column(String(50))  # next_topic, practice, review, break
    title = Column(String(200))
    reason = Column(Text)
    priority = Column(Integer, default=1)
    actioned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LearningFatigueLog(Base):
    """Stores per-session fatigue signals."""
    __tablename__ = "learning_fatigue_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    session_minutes = Column(Integer, default=0)
    fatigue_score = Column(Float, default=0.0)
    quiz_score = Column(Float, nullable=True)
    break_taken = Column(Boolean, default=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class Reflection(Base):
    """Student reflections on learning sessions."""
    __tablename__ = "reflections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    topic_name = Column(String(150), default="")
    understanding = Column(Text)
    confusion = Column(Text)
    key_insight = Column(Text)
    self_score = Column(Integer, default=3)
    ai_suggested = Column(Boolean, default=False)
    score = Column(Float, nullable=True)
    feedback_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizResult(Base):
    """One row per submitted Quiz 1 / Quiz 2 - drives day-wise learning gain and relearn counts."""
    __tablename__ = "quiz_results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    attempt_id = Column(Integer, ForeignKey("learning_journey_attempts.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    topic_id = Column(Integer, ForeignKey("topics.id"), index=True)
    topic_name = Column(String(150), default="")
    quiz_type = Column(String(10))
    score_pct = Column(Float, default=0.0)
    correct = Column(Integer, default=0)
    total = Column(Integer, default=0)
    weak_concepts_json = Column(Text, default="[]")
    tab_switches = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class CaseletProject(Base):
    """A student's project built on a caselet."""
    __tablename__ = "caselet_projects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    caselet_id = Column(String(50))
    model_name = Column(String(80))
    metrics_json = Column(Text, default="{}")
    skills_json = Column(Text, default="[]")
    recommendation = Column(Text)
    score = Column(Float, default=0.0)
    feedback_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_columns(table, columns):
    with engine.begin() as connection:
        existing = {column["name"] for column in inspect(connection).get_columns(table)}
        for name, definition in columns.items():
            if name not in existing:
                connection.exec_driver_sql(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {definition}')


def init_db():
    Base.metadata.create_all(bind=engine)
    _add_columns("reflections", {"score": "FLOAT", "feedback_json": "TEXT"})
    with engine.begin() as connection:
        question_columns = {column["name"] for column in inspect(connection).get_columns("questions")}
        question_additions = {
            "module_id": "INTEGER",
            "course_outcome_code": "VARCHAR(10)",
            "options_json": "TEXT DEFAULT '[]'",
            "blooms_level": "VARCHAR(30)",
            "category": "VARCHAR(30)",
            "quiz_stage": "VARCHAR(10) DEFAULT 'both'",
        }
        for name, definition in question_additions.items():
            if name not in question_columns:
                connection.exec_driver_sql(f'ALTER TABLE questions ADD COLUMN "{name}" {definition}')
        if engine.dialect.name == "sqlite":
            question_columns = {column["name"] for column in inspect(connection).get_columns("questions")}
            for name, definition in {
                "option_a": "TEXT",
                "option_b": "TEXT",
                "option_c": "TEXT",
                "option_d": "TEXT",
                "co_tag": "VARCHAR(20)",
            }.items():
                if name not in question_columns:
                    connection.exec_driver_sql(f'ALTER TABLE questions ADD COLUMN "{name}" {definition}')
        dataset_columns = {column["name"] for column in inspect(connection).get_columns("forecast_datasets")}
        dataset_additions = {
            "category": "VARCHAR(100)",
            "time_col": "VARCHAR(100)",
            "target_col": "VARCHAR(100)",
            "feature_cols_json": "TEXT DEFAULT '[]'",
            "frequency": "VARCHAR(30)",
            "data_json": "TEXT DEFAULT '[]'",
            "is_sample": "BOOLEAN DEFAULT TRUE",
        }
        for name, definition in dataset_additions.items():
            if name not in dataset_columns:
                connection.exec_driver_sql(f'ALTER TABLE forecast_datasets ADD COLUMN "{name}" {definition}')
        if engine.dialect.name == "sqlite":
            user_columns = {column["name"] for column in inspect(connection).get_columns("users")}
            if "hashed_password" not in user_columns:
                connection.exec_driver_sql('ALTER TABLE users ADD COLUMN "hashed_password" VARCHAR(200) DEFAULT \'\'')
            subtopic_columns = {column["name"] for column in inspect(connection).get_columns("learning_journey_attempts")}
            if "subtopic_id" not in subtopic_columns:
                connection.exec_driver_sql('ALTER TABLE learning_journey_attempts ADD COLUMN "subtopic_id" INTEGER REFERENCES subtopics(id)')
            if "practice_completed_subtopics_json" not in subtopic_columns:
                connection.exec_driver_sql('ALTER TABLE learning_journey_attempts ADD COLUMN "practice_completed_subtopics_json" TEXT DEFAULT \'[]\'')
            connection.exec_driver_sql("INSERT INTO subtopics (topic_id, name, order_index, description) SELECT topics.id, topics.name || ': Core Concepts', 1, topics.description FROM topics WHERE NOT EXISTS (SELECT 1 FROM subtopics WHERE subtopics.topic_id = topics.id)")
            legacy_columns = {
                "questions": {"option_a": "TEXT", "option_b": "TEXT", "option_c": "TEXT", "option_d": "TEXT", "co_tag": "VARCHAR(20)"},
                "forecast_datasets": {"file_path": "TEXT", "is_builtin": "BOOLEAN DEFAULT 1", "rows": "INTEGER", "columns_json": "TEXT DEFAULT '[]'"},
                "forecast_runs": {"dataset_id": "INTEGER", "results_json": "TEXT DEFAULT '{}'", "rmse": "FLOAT", "mae": "FLOAT", "mape": "FLOAT"},
                "independence_sessions": {"completed": "BOOLEAN DEFAULT 0", "ai_independence_score": "FLOAT DEFAULT 0", "started_at": "DATETIME", "completed_at": "DATETIME"},
                "mastery_history": {"topic_id": "INTEGER", "mastery_score": "FLOAT", "recorded_at": "DATETIME"},
                "misconceptions": {"topic_id": "INTEGER", "description": "TEXT", "correct_understanding": "TEXT", "recommended_action": "TEXT"},
                "student_mastery": {"topic_id": "INTEGER", "mastery_score": "FLOAT DEFAULT 0", "pre_score": "FLOAT DEFAULT 0", "post_score": "FLOAT DEFAULT 0", "attempts": "INTEGER DEFAULT 0", "last_updated": "DATETIME"},
                "student_misconceptions": {"misconception_id": "INTEGER", "identified_at": "DATETIME"},
            }
            for table, additions in legacy_columns.items():
                columns = {column["name"] for column in inspect(connection).get_columns(table)}
                for name, definition in additions.items():
                    if name not in columns:
                        connection.exec_driver_sql(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {definition}')
            for table, additions in {
                "faculty_interventions": {
                    "topic": "VARCHAR(150)", "misconception_description": "TEXT", "recommended_action": "TEXT",
                    "status": "VARCHAR(20) DEFAULT 'pending'", "triggered_at": "DATETIME", "topic_name": "VARCHAR(100) DEFAULT ''",
                    "issue_summary": "TEXT DEFAULT ''", "common_misconception": "TEXT DEFAULT ''", "module_number": "INTEGER",
                    "students_below_proficiency_pct": "FLOAT", "pre_mastery": "FLOAT", "post_mastery": "FLOAT",
                    "learning_gain": "FLOAT", "created_at": "DATETIME",
                },
                "learning_journey_attempts": {
                    "subtopic_id": "INTEGER", "practice_completed_subtopics_json": "TEXT DEFAULT '[]'",
                    "module_title": "VARCHAR(150) DEFAULT ''", "topic_name": "VARCHAR(150) DEFAULT ''",
                    "pre_score_pct": "FLOAT DEFAULT 0", "post_score_pct": "FLOAT DEFAULT 0", "score_gain_pct": "FLOAT DEFAULT 0",
                    "pre_answers_json": "TEXT DEFAULT '[]'", "post_answers_json": "TEXT DEFAULT '[]'",
                    "pre_weak_concepts_json": "TEXT DEFAULT '[]'", "post_weak_concepts_json": "TEXT DEFAULT '[]'",
                    "pre_completed_at": "DATETIME", "post_completed_at": "DATETIME", "mastery_status": "VARCHAR(50) DEFAULT 'Not Started'",
                    "ai_notes_read": "BOOLEAN DEFAULT 0", "practice_problems_completed": "INTEGER DEFAULT 0",
                    "started_at": "DATETIME", "created_at": "DATETIME", "updated_at": "DATETIME", "revision_recommended_json": "TEXT DEFAULT '[]'",
                },
                "reflections": {"topic_name": "VARCHAR(150) DEFAULT ''"},
            }.items():
                table_columns = {column["name"] for column in inspect(connection).get_columns(table)}
                for name, definition in additions.items():
                    if name not in table_columns:
                        connection.exec_driver_sql(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {definition}')

            intervention_columns = {column["name"] for column in inspect(connection).get_columns("faculty_interventions")}
            intervention_additions = {
                "topic": "VARCHAR(150)",
                "misconception_description": "TEXT",
                "recommended_action": "TEXT",
                "status": "VARCHAR(20) DEFAULT 'pending'",
                "triggered_at": "DATETIME",
                "topic_name": "VARCHAR(100) DEFAULT ''",
                "issue_summary": "TEXT DEFAULT ''",
                "common_misconception": "TEXT DEFAULT ''",
                "module_number": "INTEGER",
                "students_below_proficiency_pct": "FLOAT",
                "pre_mastery": "FLOAT",
                "post_mastery": "FLOAT",
                "learning_gain": "FLOAT",
                "created_at": "DATETIME",
            }
            for name, definition in intervention_additions.items():
                if name not in intervention_columns:
                    connection.exec_driver_sql(f'ALTER TABLE faculty_interventions ADD COLUMN "{name}" {definition}')
            reflection_columns = {column["name"] for column in inspect(connection).get_columns("reflections")}
            if "topic_name" not in reflection_columns:
                connection.exec_driver_sql('ALTER TABLE reflections ADD COLUMN "topic_name" VARCHAR(150) DEFAULT \'\'')
            columns = {column["name"] for column in inspect(connection).get_columns("learning_journey_attempts")}
            additions = {
                "module_title": "VARCHAR(150) DEFAULT ''",
                "topic_name": "VARCHAR(150) DEFAULT ''",
                "pre_score_pct": "FLOAT DEFAULT 0",
                "post_score_pct": "FLOAT DEFAULT 0",
                "score_gain_pct": "FLOAT DEFAULT 0",
                "pre_weak_concepts_json": "TEXT DEFAULT '[]'",
                "post_weak_concepts_json": "TEXT DEFAULT '[]'",
                "pre_completed_at": "DATETIME",
                "post_completed_at": "DATETIME",
                "mastery_status": "VARCHAR(50) DEFAULT 'Not Started'",
                "ai_notes_read": "BOOLEAN DEFAULT 0",
                "practice_problems_completed": "INTEGER DEFAULT 0",
                "started_at": "DATETIME",
                "created_at": "DATETIME",
                "updated_at": "DATETIME",
                "revision_recommended_json": "TEXT DEFAULT '[]'",
            }
            for name, definition in additions.items():
                if name not in columns:
                    connection.exec_driver_sql(f'ALTER TABLE learning_journey_attempts ADD COLUMN "{name}" {definition}')
