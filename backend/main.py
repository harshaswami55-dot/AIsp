"""
FastAPI Server for AI Learning Partner 360
MBA Business Forecasting (SB6202)
Connects all forecasting calculations, AI pedagogy engines, and role-based workflows.
"""
import os
import json
import io
import pandas as pd
import numpy as np
from collections import Counter
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import (
    get_db, init_db, User, Course, Module, Topic, SubTopic, CourseOutcome,
    Question, StudentMastery, MasteryHistory, Misconception,
    StudentMisconception, ForecastDataset, ForecastRun,
    IndependenceSession, FacultyIntervention, DiagnosticAttempt,
    LearningJourneyAttempt, LearningFatigueLog, Reflection,
    LearningRecommendation, QuizResult
)
from seed_data import seed_database, load_roster
from auth import (
    verify_password, create_access_token,
    get_current_user_payload, require_student, require_faculty, require_dean,
)
from recommendation_engine import generate_recommendations, get_persisted_recommendations
from learning_materials import get_topic_learning_material
from forecasting_engine import (
    calculate_metrics, perform_adf_test, compute_acf_pacf,
    decompose_series, run_classical_model, run_arima_model,
    run_ml_forecasting, compare_all_models, generate_managerial_insight
)
from ai_engine import (
    SYLLABUS_KNOWLEDGE, detect_misconceptions, evaluate_student_teaching,
    socratic_dialogue_step, ai_tutor_response, model_selection_coach,
    evaluate_independence_attempt
)
from agent import agent_chat, check_ollama_status, clear_history, list_llm_models, probe_llm_model
import learning
from learning import select_quiz, options_of, level, topics_to_study, PASS_MARK

app = FastAPI(
    title="AI Learning Partner 360 - MBA Business Forecasting",
    description="Intelligent Educational & Analytics Platform for RV University MBA SB6202",
    version="1.0.0"
)


@app.on_event("startup")
def initialize_database():
    init_db()
    seed_database()
    load_roster()
    learning.sync_question_bank()

app.include_router(learning.router)

cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


MAX_UPLOAD_BYTES = 2_000_000


# ====================================================
# PYDANTIC SCHEMAS
# ====================================================
class LoginRequest(BaseModel):
    username: str
    password: str

class DiagnosticSubmitRequest(BaseModel):
    user_id: int
    answers: Dict[str, str]  # question_id -> selected_answer

class AITutorRequest(BaseModel):
    query: str
    mode: Optional[str] = "standard"  # standard, socratic
    topic: Optional[str] = "ARIMA"
    turn_count: Optional[int] = 1

class TeachAIRequest(BaseModel):
    topic: str
    explanation: str

class ModelCoachRequest(BaseModel):
    is_multivariate: bool = False
    has_trend: bool = True
    has_seasonality: bool = True
    is_stationary: bool = False
    has_external_drivers: bool = False
    sample_size: int = 48
    need_high_interpretability: bool = True

class ForecastTrainRequest(BaseModel):
    dataset_id: int
    model_name: str
    target_col: Optional[str] = None
    horizon: int = 6
    parameters: Optional[Dict[str, Any]] = {}

class IndependenceSubmitRequest(BaseModel):
    current_level: int
    hints_used: int
    selected_model: str
    is_correct: bool

class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    page_context: Optional[str] = None
    model: Optional[str] = "llama3.2:3b"

class QuizSubmitRequest(BaseModel):
    user_id: int
    attempt_id: Optional[int] = None
    module_id: int
    topic_id: int
    subtopic_id: Optional[int] = None
    quiz_type: str  # "pre" or "post"
    answers: Dict[str, str]  # {str(question_id): selected_answer_text}
    tab_switches: int = 0

class MarkNotesReadRequest(BaseModel):
    attempt_id: int
    problems_completed: Optional[int] = 1

class PracticeCompletionRequest(BaseModel):
    attempt_id: int
    subtopic_id: Optional[int] = None


# ====================================================
# AUTHENTICATION & DEMO ROLES
# ====================================================
@app.post("/api/auth/token")
def login_jwt(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticated login returning a signed JWT access token."""
    login = req.username.strip().lower()
    user = db.query(User).filter(
        (func.lower(User.username) == login) | (func.lower(User.email) == login)
    ).first()
    if not user or not verify_password(req.password, user.hashed_password or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role, "name": user.full_name})
    return {
        "access_token": token,
        "token_type": "bearer",
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
    }


@app.get("/api/auth/me")
def get_authenticated_user(payload: dict = Depends(get_current_user_payload), db: Session = Depends(get_db)):
    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account no longer exists")
    return {"id": user.id, "username": user.username, "email": user.email, "role": user.role, "full_name": user.full_name}



# ====================================================
# STUDENT DASHBOARD & LEARNING PROFILE
# ====================================================
# ====================================================
# DIAGNOSTIC TEST ENDPOINTS
# ====================================================
@app.get("/api/diagnostic/questions")
def get_diagnostic_questions(db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """Returns every valid diagnostic question across all course modules."""
    questions = db.query(Question).order_by(Question.id).all()
    out = []
    for q in questions:
        options = json.loads(q.options_json) if q.options_json else [option for option in [q.option_a, q.option_b, q.option_c, q.option_d] if option]
        if not options or not q.correct_answer or q.correct_answer not in options:
            continue
        out.append({
            "id": q.id,
            "module_id": q.module_id,
            "topic_id": q.topic_id,
            "course_outcome": q.course_outcome_code,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": options,
            "difficulty": q.difficulty,
            "blooms_level": q.blooms_level,
            "category": q.category
        })
    return {"total": len(out), "questions": out}

@app.post("/api/diagnostic/submit")
def submit_diagnostic(req: DiagnosticSubmitRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    """
    Evaluates student diagnostic responses.
    Calculates overall mastery, module mastery, topic mastery, and specific gaps:
    conceptual, calculation, model-selection, interpretation.
    """
    ensure_user_access(payload, req.user_id)
    questions = db.query(Question).order_by(Question.id).all()
    valid_questions = []
    for question in questions:
        options = json.loads(question.options_json) if question.options_json else [option for option in [question.option_a, question.option_b, question.option_c, question.option_d] if option]
        if options and question.correct_answer and question.correct_answer in options:
            valid_questions.append(question)
    q_map = {q.id: q for q in valid_questions}
    if not valid_questions or set(req.answers) != {str(q.id) for q in valid_questions}:
        raise HTTPException(status_code=400, detail="Answer every diagnostic question before submitting")

    total = len(valid_questions)
    correct_count = 0
    mod_scores = {1: {"correct": 0, "total": 0}, 2: {"correct": 0, "total": 0}, 3: {"correct": 0, "total": 0}, 4: {"correct": 0, "total": 0}, 5: {"correct": 0, "total": 0}}
    gaps_by_cat = {"conceptual": [], "calculation": [], "model_selection": [], "interpretation": []}

    for q_id_str, user_ans in req.answers.items():
        try:
            q_id = int(q_id_str)
        except ValueError:
            continue
        q = q_map.get(q_id)
        if not q:
            continue

        mod_num = q.module_id
        if mod_num in mod_scores:
            mod_scores[mod_num]["total"] += 1

        is_correct = (user_ans.strip().lower() == q.correct_answer.strip().lower())
        if is_correct:
            correct_count += 1
            if mod_num in mod_scores:
                mod_scores[mod_num]["correct"] += 1
        else:
            cat = q.category if q.category in gaps_by_cat else "conceptual"
            gaps_by_cat[cat].append({
                "question": q.question_text[:80] + "...",
                "explanation": q.explanation,
                "course_outcome": q.course_outcome_code
            })

    score_pct = round((correct_count / max(1, total)) * 100, 1)

    if score_pct >= 80:
        level = "Advanced"
    elif score_pct >= 60:
        level = "Proficient"
    elif score_pct >= 40:
        level = "Developing"
    else:
        level = "Needs Foundation"

    mod_pcts = {}
    for mod_num, data in mod_scores.items():
        mod_pcts[str(mod_num)] = round((data["correct"] / max(1, data["total"])) * 100, 1) if data["total"] > 0 else 60.0

    # Save diagnostic attempt
    attempt = DiagnosticAttempt(
        user_id=req.user_id,
        score_percentage=score_pct,
        mastery_level=level,
        module_mastery_json=json.dumps(mod_pcts),
        topic_mastery_json=json.dumps({}),
        gaps_json=json.dumps(gaps_by_cat),
        answers_json=json.dumps(req.answers)
    )
    db.add(attempt)
    db.commit()

    return {
        "score_percentage": score_pct,
        "mastery_level": level,
        "correct_answers": correct_count,
        "total_questions": total,
        "module_mastery": mod_pcts,
        "detected_gaps": gaps_by_cat,
        "recommendation": (
            f"Diagnostic complete across {total} questions. Your course path and topic-level results are available in the learning dashboard."
        )
    }


# ====================================================
# PERSONALIZED LEARNING PATH
# ====================================================
@app.get("/api/student/learning-path")
def get_personalized_learning_path(db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """
    Returns prerequisite dependency graph for Business Forecasting:
    Stationarity -> ADF Test -> Differencing -> ACF/PACF -> AR/MA -> ARIMA -> SARIMA -> ML Forecasting
    """
    path = [
        {
            "step": 1,
            "topic": "Time Series Components (Trend & Seasonality)",
            "module": "Module 2",
            "status": "completed",
            "mastery": 85,
            "prerequisite": None,
            "description": "Identify linear trend, holiday seasonality, and random noise patterns."
        },
        {
            "step": 2,
            "topic": "Forecast Accuracy Metrics (MAE, RMSE, MAPE)",
            "module": "Module 1",
            "status": "completed",
            "mastery": 82,
            "prerequisite": "Time Series Components",
            "description": "Quantify forecasting errors in physical units and relative percentages."
        },
        {
            "step": 3,
            "topic": "Stationarity and Unit Root Tests (ADF Test)",
            "module": "Module 3",
            "status": "in_progress",
            "mastery": 44,
            "prerequisite": "Forecast Accuracy Metrics",
            "description": "Evaluate H0 unit root hypothesis, test statistic, and p-value < 0.05 threshold."
        },
        {
            "step": 4,
            "topic": "Differencing a Time Series & Lags",
            "module": "Module 3",
            "status": "recommended_next",
            "mastery": 52,
            "prerequisite": "Stationarity and Unit Root Tests (ADF Test)",
            "description": "Apply first-order differencing d=1 and seasonal differencing D=1 to stabilize the mean."
        },
        {
            "step": 5,
            "topic": "Autocorrelation & Partial Autocorrelation (ACF, PACF)",
            "module": "Module 3",
            "status": "locked",
            "mastery": 50,
            "prerequisite": "Differencing a Time Series & Lags",
            "description": "Identify AR(p) order via PACF cut-off and MA(q) order via ACF cut-off."
        },
        {
            "step": 6,
            "topic": "ARIMA Modeling (p, d, q)",
            "module": "Module 3",
            "status": "locked",
            "mastery": 54,
            "prerequisite": "ACF, PACF",
            "description": "Integrate autoregression, differencing, and moving average error processes."
        },
        {
            "step": 7,
            "topic": "Seasonal ARIMA (SARIMA)",
            "module": "Module 3",
            "status": "locked",
            "mastery": 50,
            "prerequisite": "ARIMA Modeling",
            "description": "Extend ARIMA to handle seasonal cycles (P,D,Q)_s."
        },
        {
            "step": 8,
            "topic": "Supervised Machine Learning (Random Forest & XGBoost)",
            "module": "Module 5",
            "status": "locked",
            "mastery": 70,
            "prerequisite": "SARIMA",
            "description": "Lag-based supervised regression capturing non-linear interactions."
        }
    ]
    return {"learning_path": path}


# ====================================================
# AI TUTOR & SOCRATIC LEARNING
# ====================================================
@app.post("/api/ai/tutor")
def ask_ai_tutor(req: AITutorRequest, payload: dict = Depends(require_student)):
    """Business Forecasting AI Tutor endpoint. Tries Ollama agent first, falls back to static engine."""
    status_info = check_ollama_status()
    if status_info["online"]:
        result = agent_chat(
            user_message=req.query,
            session_id=f"tutor_{payload['sub']}",
            page_context="AI Tutor",
            model=status_info["models"][0] if status_info["models"] else "llama3.2:3b"
        )
        return {"query": req.query, "response": result["reply"], "agent": True}
    response = ai_tutor_response(req.mode, req.query)
    return {"query": req.query, "response": response, "agent": False}


# ====================================================
# AI AGENT ENDPOINTS (Ollama)
# ====================================================
@app.post("/api/agent/chat")
def agent_chat_endpoint(req: AgentChatRequest, payload: dict = Depends(require_student)):
    """
    Full agentic AI chat with Ollama LLM, tool-use, and multi-turn memory.
    Supports: ADF test tool, dataset info tool, syllabus RAG tool, accuracy metrics tool.
    """
    result = agent_chat(
        user_message=req.message,
        session_id=f"{payload['sub']}:{req.session_id}",
        page_context=req.page_context,
        model=req.model
    )
    return result

@app.get("/api/agent/status")
def get_agent_status(_: dict = Depends(require_student)):
    """Check Ollama availability and list available models."""
    return check_ollama_status()

@app.get("/api/agent/models")
def list_hosted_models(_: dict = Depends(require_faculty)):
    """Faculty-only: model ids the configured hosted-LLM key can use (to pick LLM_MODEL)."""
    return list_llm_models()

@app.get("/api/agent/probe")
def probe_hosted_model(model: str, _: dict = Depends(require_faculty)):
    """Faculty-only: time one short request to a model."""
    return probe_llm_model(model)

@app.post("/api/agent/clear")
def clear_agent_session(session_id: str = "default", payload: dict = Depends(require_student)):
    """Clear conversation history for a session (start fresh)."""
    clear_history(f"{payload['sub']}:{session_id}")
    return {"message": f"Session '{session_id}' cleared.", "session_id": session_id}

@app.post("/api/ai/socratic")
def socratic_dialogue(req: AITutorRequest, _: dict = Depends(require_student)):
    """Socratic inquiry engine: AI never gives away answers; prompts with guiding questions."""
    reply = socratic_dialogue_step(req.topic or "ARIMA", req.query, req.turn_count or 1)
    return {
        "topic": req.topic,
        "turn": req.turn_count,
        "student_message": req.query,
        "socratic_response": reply
    }

@app.post("/api/ai/teach")
def teach_the_ai(req: TeachAIRequest, _: dict = Depends(require_student)):
    """
    Teach-the-AI mode:
    Student explains a forecasting concept (MAPE, ARIMA, Stationarity, SARIMA, XGBoost)
    AI evaluates student's grasp against official 5-criterion rubric.
    """
    evaluation = evaluate_student_teaching(req.topic, req.explanation)
    return evaluation

@app.post("/api/ai/coach")
def get_model_recommendation(req: ModelCoachRequest, _: dict = Depends(require_student)):
    """Model Selection Coach ("Which forecasting model should I use?")."""
    res = model_selection_coach(req.dict())
    return res

@app.get("/api/rag/query")
def rag_search(q: str, _: dict = Depends(require_student)):
    """Course-specific RAG grounded in RV University SB6202 approved syllabus material."""
    q_low = q.lower()
    matches = []
    for key, item in SYLLABUS_KNOWLEDGE.items():
        if any(term in q_low for term in key.split("_")) or any(word in item.get("title", "").lower() for word in q_low.split()):
            matches.append(item)

    if not matches:
        matches.append(SYLLABUS_KNOWLEDGE["course_overview"])

    selected = matches[0]
    return {
        "query": q,
        "source": selected.get("source", "RV University SB6202 Syllabus"),
        "section": selected.get("title", selected.get("section", "Curricular Topics")),
        "content": selected.get("key_points", selected.get("content", "")),
        "citation": f"Approved Syllabus Reference: {selected.get('source')} - {selected.get('title', 'Module Review')}"
    }


# ====================================================
# FORECASTING LAB ENDPOINTS
# ====================================================
@app.get("/api/forecast/datasets")
def list_datasets(db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """Returns sample and uploaded datasets."""
    datasets = db.query(ForecastDataset).all()
    out = []
    for d in datasets:
        records = json.loads(d.data_json) if d.data_json else []
        out.append({
            "id": d.id,
            "name": d.name,
            "category": d.category,
            "description": d.description,
            "time_col": d.time_col,
            "target_col": d.target_col,
            "frequency": d.frequency,
            "row_count": len(records),
            "is_sample": d.is_sample
        })
    return {"datasets": out}

@app.get("/api/forecast/dataset/{dataset_id}")
def get_dataset_details(dataset_id: int, db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """Returns full records and schema for a specific dataset."""
    ds = db.query(ForecastDataset).filter(ForecastDataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    records = json.loads(ds.data_json)
    return {
        "id": ds.id,
        "name": ds.name,
        "category": ds.category,
        "description": ds.description,
        "time_col": ds.time_col,
        "target_col": ds.target_col,
        "frequency": ds.frequency,
        "feature_cols": json.loads(ds.feature_cols_json) if ds.feature_cols_json else [],
        "records": records
    }

@app.post("/api/forecast/upload")
async def upload_custom_dataset(file: UploadFile = File(...), name: Optional[str] = Form(None), db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """Upload custom CSV dataset."""
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="CSV must be under 2 MB.")
    try:
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    if len(df) < 8:
        raise HTTPException(status_code=400, detail="Dataset must contain at least 8 observations for time series modeling.")

    # Identify time column and numeric columns
    cols = list(df.columns)
    time_col = next((c for c in cols if 'date' in c.lower() or 'time' in c.lower() or 'month' in c.lower() or 'week' in c.lower()), cols[0])
    num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c]) and c != time_col]
    target_col = num_cols[0] if num_cols else cols[1]

    records = df.to_dict(orient="records")
    ds_name = name or file.filename.replace(".csv", "").title()

    new_ds = ForecastDataset(
        name=ds_name,
        category="Uploaded User Data",
        description=f"Custom CSV dataset with {len(df)} rows and {len(cols)} columns.",
        time_col=time_col,
        target_col=target_col,
        feature_cols_json=json.dumps([c for c in num_cols if c != target_col]),
        frequency="Monthly",
        data_json=json.dumps(records),
        is_sample=False
    )
    db.add(new_ds)
    db.commit()
    db.refresh(new_ds)

    return {
        "id": new_ds.id,
        "name": new_ds.name,
        "row_count": len(df),
        "time_col": time_col,
        "target_col": target_col,
        "message": "Dataset uploaded and parsed successfully!"
    }

@app.post("/api/forecast/analyse")
def analyse_time_series(req: Dict[str, Any], db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """
    Performs comprehensive statistical analysis:
    - Data table & summary stats
    - ADF stationarity test
    - ACF and PACF values with confidence bounds
    - Additive decomposition (Trend, Seasonal, Residual)
    - Rolling mean and rolling standard deviation
    """
    dataset_id = req.get("dataset_id", 1)
    target_col = req.get("target_col")

    ds = db.query(ForecastDataset).filter(ForecastDataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    records = json.loads(ds.data_json)
    df = pd.DataFrame(records)

    target = target_col or ds.target_col
    if target not in df.columns:
        target = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])][0]

    series = df[target].astype(float).values

    # ADF Test
    adf_res = perform_adf_test(series)

    # ACF / PACF
    acf_pacf_res = compute_acf_pacf(series, nlags=16)

    # Decomposition
    decomp_res = decompose_series(series, period=12 if len(series) >= 24 else 4)

    # Rolling statistics
    s_pd = pd.Series(series)
    roll_mean = [round(float(v), 2) if not pd.isna(v) else None for v in s_pd.rolling(3).mean()]
    roll_std = [round(float(v), 2) if not pd.isna(v) else None for v in s_pd.rolling(3).std()]

    # Summary statistics
    summary_stats = {
        "count": len(series),
        "mean": round(float(np.mean(series)), 2),
        "std": round(float(np.std(series)), 2),
        "min": round(float(np.min(series)), 2),
        "max": round(float(np.max(series)), 2),
        "median": round(float(np.median(series)), 2)
    }

    return {
        "dataset_name": ds.name,
        "target_column": target,
        "time_column": ds.time_col,
        "timestamps": df[ds.time_col].tolist(),
        "actual_values": [round(float(v), 2) for v in series],
        "summary_statistics": summary_stats,
        "adf_test": adf_res,
        "acf_pacf": acf_pacf_res,
        "decomposition": decomp_res,
        "rolling_statistics": {
            "rolling_mean_3": roll_mean,
            "rolling_std_3": roll_std
        }
    }

@app.post("/api/forecast/train")
def train_forecasting_model(req: ForecastTrainRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    """
    Fits real forecasting model:
    - Classical: Naive, Moving Average, SES, Holt, Holt-Winters
    - Univariate Time Series: ARIMA(p,d,q), SARIMA(p,d,q)x(P,D,Q)_s
    - Machine Learning: Linear Regression, Decision Tree, Random Forest, XGBoost
    Calculates REAL metrics (MAE, MSE, RMSE, MAPE) and translates into MBA Managerial Decisions.
    """
    ds = db.query(ForecastDataset).filter(ForecastDataset.id == req.dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    records = json.loads(ds.data_json)
    df = pd.DataFrame(records)
    target = req.target_col or ds.target_col
    series = df[target].astype(float).values

    # Train / Test split (80/20)
    split = max(len(series) - req.horizon, int(len(series) * 0.8))
    train_series = series[:split]
    test_series = series[split:]

    model_key = req.model_name.lower().replace(" ", "_")
    params = req.parameters or {}

    fit = None  # (train, test) -> result, for models evaluated on a holdout and then refit for the real future
    if model_key in ["naive", "moving_average", "ses", "holt", "holt_winters"]:
        fit = lambda tr, te: run_classical_model(model_type=model_key, train_series=tr, test_series=te, horizon=req.horizon, **params)

    elif "arima" in model_key or "sarima" in model_key:
        orders = {k: int(params.get(k, default)) for k, default in (("p", 1), ("d", 1), ("q", 1), ("P", 0), ("D", 0), ("Q", 0), ("s", 12))}
        fit = lambda tr, te: run_arima_model(train_series=tr, test_series=te, horizon=req.horizon, **orders)

    if fit:
        # Accuracy comes from the holdout; the plotted forecast comes from a refit on the full series,
        # so it starts after the last observation instead of re-predicting the test months.
        result = fit(train_series, test_series)
        if "error" not in result:
            future = fit(series, [])
            if "error" not in future:
                result["holdout_predictions"] = result.get("forecast_values", [])
                result["forecast_values"] = future.get("forecast_values", result.get("forecast_values"))

    elif model_key in ["random_forest", "xgboost", "linear_regression", "decision_tree"]:
        result = run_ml_forecasting(
            df=df,
            target_col=target,
            time_col=ds.time_col,
            model_type=model_key,
            horizon=req.horizon
        )

    else:
        # Default to Holt-Winters
        result = run_classical_model("holt_winters", train_series, test_series, horizon=req.horizon)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Future timestamps for charts
    timestamps = df[ds.time_col].tolist()
    last_ts = timestamps[-1]
    future_timestamps = [f"Horizon+{i+1}" for i in range(req.horizon)]

    # Record forecast run
    metrics = result.get("metrics", {})
    fr = ForecastRun(
        user_id=int(payload["sub"]),
        dataset_id=ds.id,
        model_name=result.get("model_name", req.model_name),
        parameters_json=json.dumps(params),
        results_json=json.dumps({
            "model_type": result.get("model_type", "Time Series"),
            "predictions": result.get("forecast_values", result.get("future_forecasts", [])),
            "business_interpretation": result.get("managerial", {}).get("business_interpretation", ""),
        }),
        rmse=metrics.get("rmse"),
        mae=metrics.get("mae"),
        mape=metrics.get("mape"),
        managerial_recommendation=result.get("managerial", {}).get("managerial_recommendation", "")
    )
    db.add(fr)
    db.commit()

    return {
        "dataset_name": ds.name,
        "timestamps": timestamps,
        "actual_values": [round(float(v), 2) for v in series],
        "future_timestamps": future_timestamps,
        "model_result": result
    }

@app.post("/api/forecast/compare")
def compare_forecasting_models(req: Dict[str, Any], db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """
    Head-to-head comparison across:
    Moving Average, Holt-Winters, ARIMA, SARIMA, Random Forest, XGBoost.
    Generates multi-criteria evaluation matrix and executive narrative.
    """
    dataset_id = req.get("dataset_id", 1)
    target_col = req.get("target_col")
    horizon = int(req.get("horizon", 6))

    ds = db.query(ForecastDataset).filter(ForecastDataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    records = json.loads(ds.data_json)
    df = pd.DataFrame(records)
    target = target_col or ds.target_col
    series = df[target].astype(float).values

    split = max(len(series) - horizon, int(len(series) * 0.8))
    train = series[:split]
    test = series[split:]

    comparison = compare_all_models(train, test, horizon=horizon, df_ml=df, target_col=target)
    return comparison


# ====================================================
# AI INDEPENDENCE MODE
# ====================================================
@app.get("/api/independence/challenge")
def get_independence_challenge(db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """
    Loads unseen forecasting challenge where student solves independently
    with progressively reduced AI scaffolding (Levels 0 to 5).
    """
    challenge = {
        "challenge_id": "CHAL_04_UNSEEN",
        "title": "Unseen Business Case: National Hotel Room Demand Shock",
        "current_scaffolding_level": 2,
        "level_title": "Level 2: Strategic Hints Only",
        "business_problem": (
            "A national resort chain experienced sudden volatile seasonal fluctuations. "
            "You have 36 months of room occupancy data. The Chief Commercial Officer needs "
            "a 6-month demand forecast for peak season staffing. "
            "The series exhibits significant summer seasonality and non-stationary drift."
        ),
        "available_models": ["Moving Average", "Simple Exponential Smoothing", "Holt's Linear", "SARIMA(1,1,1)x(1,1,1)_12", "Naive"],
        "correct_choice": "SARIMA(1,1,1)x(1,1,1)_12",
        "hints_remaining": 1,
        "fading_rule": "At Level 2, the AI will only provide 1 concise strategic hint upon request. The final model selection and residual diagnosis must be completed independently."
    }
    return challenge

@app.post("/api/independence/hint")
def request_independence_hint(level: int = 2, _: dict = Depends(require_student)):
    """Provides scaffolding according to current independence level."""
    hints = {
        0: "Full Guidance: Look at the 12-month seasonality and upward drift. An ordinary moving average will fail to capture the recurring peak. SARIMA(1,1,1)x(1,1,1)_12 is recommended.",
        1: "Guiding Question: Does this hotel dataset have fixed 12-month annual peaks? And does it have a unit root requiring differencing?",
        2: "Strategic Hint: Check seasonal period s=12. Models without a seasonal autoregressive/moving average parameter will flatten out future peaks.",
        3: "Concept Reminder: Review Module 3: Seasonal ARIMA (SARIMA) vs simple exponential smoothing.",
        4: "Scaffolding Inactive: No hints available at Level 4. You must rely on your own diagnostic workflow.",
        5: "Completely Independent: Scaffolding zero. Solve on your own."
    }
    return {"level": level, "hint": hints.get(level, "Rely on your statistical diagnostics.")}

@app.post("/api/independence/submit")
def submit_independence_solution(req: IndependenceSubmitRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    """Evaluates student's independent solution and computes AI Independence Gain."""
    eval_res = evaluate_independence_attempt(
        current_level=req.current_level,
        hints_used=req.hints_used,
        is_correct=req.is_correct,
        attempt_number=1
    )

    # Record session
    session = IndependenceSession(
        user_id=int(payload["sub"]),
        current_level=eval_res["new_level"],
        hints_used=req.hints_used,
        completed=eval_res["new_level"] >= 4,
        ai_independence_score=eval_res["final_unaided_score"],
        completed_at=datetime.utcnow() if eval_res["new_level"] >= 4 else None,
    )
    db.add(session)
    db.commit()

    return eval_res


# ====================================================
# FACULTY DASHBOARD & INTERVENTION ENGINE
# ====================================================
@app.get("/api/faculty/dashboard")
def get_faculty_dashboard(db: Session = Depends(get_db), _: dict = Depends(require_faculty)):
    """
    Returns faculty analytics:
    Class Mastery, Module Mastery, Topic Mastery, CO Achievement, Common Misconceptions,
    Interventions, and measured Learning Gain.
    """
    interventions = db.query(FacultyIntervention).all()
    journey_attempts = db.query(LearningJourneyAttempt).filter(LearningJourneyAttempt.post_completed_at.is_not(None), LearningJourneyAttempt.user_id.in_(db.query(User.id).filter(User.role == "student"))).all()
    students = {student.id: student for student in db.query(User).all()}
    student_aggregates = {}
    topic_aggregates = {}
    for attempt in journey_attempts:
        student = students.get(attempt.user_id)
        if not student:
            continue
        row = student_aggregates.setdefault(student.id, {"student_id": student.id, "student_name": student.full_name, "attempts": 0, "average_pre_score": 0.0, "average_post_score": 0.0, "average_learning_gain": 0.0})
        row["attempts"] += 1
        row["average_pre_score"] += attempt.pre_score_pct or 0
        row["average_post_score"] += attempt.post_score_pct or 0
        row["average_learning_gain"] += attempt.score_gain_pct or 0
        weak = json.loads(attempt.pre_weak_concepts_json or "[]") + json.loads(attempt.post_weak_concepts_json or "[]")
        stats = topic_aggregates.setdefault(attempt.topic_id, {"topic_id": attempt.topic_id, "topic": attempt.topic_name, "module": attempt.module_title, "students_affected": set(), "student_ids": set(), "relearn_suggestions": 0, "misconceptions": {}})
        stats["student_ids"].add(attempt.user_id)
        if weak:
            stats["students_affected"].add(attempt.user_id)
        for concept in weak:
            label = concept.get("category") or concept.get("question") or "Uncategorized misconception"
            stats["misconceptions"][label] = stats["misconceptions"].get(label, 0) + 1
    relearn_counts = Counter(tid for (tid,) in db.query(QuizResult.topic_id).filter(QuizResult.score_pct < PASS_MARK))
    for stats in topic_aggregates.values():
        stats["relearn_suggestions"] = relearn_counts.get(stats["topic_id"], 0)
    for row in student_aggregates.values():
        count = row["attempts"]
        for key in ("average_pre_score", "average_post_score", "average_learning_gain"):
            row[key] = round(row[key] / count, 1)
    topic_rows = [{**{key: value for key, value in row.items() if key not in ("students_affected", "misconceptions")}, "students_affected": len(row["students_affected"]), "student_ids": list(row["student_ids"]), "top_misconceptions": [{"label": label, "count": count} for label, count in sorted(row["misconceptions"].items(), key=lambda item: item[1], reverse=True)[:3]]} for row in topic_aggregates.values()]

    module_stats = {}
    for attempt in journey_attempts:
        stats = module_stats.setdefault(attempt.module_id, {"scores": [], "title": attempt.module_title})
        stats["scores"].append(attempt.post_score_pct or 0)
    module_mastery = [{"module": module_id, "name": stats["title"], "average_mastery": round(sum(stats["scores"]) / len(stats["scores"]), 1), "target": 75.0} for module_id, stats in module_stats.items()]
    module_names = {module.id: module.title for module in db.query(Module).all()}
    topic_module_ids = {attempt.topic_id: attempt.module_id for attempt in journey_attempts}
    difficult_topics = [{"topic": row["topic"], "module": module_names.get(topic_module_ids.get(row["topic_id"]), row["module"]), "students_at_risk": row["students_affected"], "common_error": row["top_misconceptions"][0]["label"] if row["top_misconceptions"] else "No weak-concept details recorded"} for row in topic_rows if row["relearn_suggestions"]]
    co_data = []
    student_count = db.query(User).filter(User.role == "student").count()
    average_gain = round(sum(row["average_learning_gain"] for row in student_aggregates.values()) / len(student_aggregates), 1) if student_aggregates else None
    completed_scores = [attempt.post_score_pct or 0 for attempt in journey_attempts]
    class_average = round(sum(completed_scores) / len(completed_scores), 1) if completed_scores else None

    interv_list = []
    for intv in interventions:
        interv_list.append({
            "id": intv.id,
            "topic": intv.topic,
            "issue": intv.misconception_description,
            "recommended_action": intv.recommended_action,
            "status": intv.status,
            "triggered_at": intv.triggered_at.isoformat() if intv.triggered_at else None
        })

    misc_list = [{"topic_id": row["topic_id"], "topic": row["topic"], "text": item["label"], "frequency": item["count"], "correction": "Review the explanation attached to the corresponding quiz question."} for row in topic_rows for item in row["top_misconceptions"]]

    return {
        "instructor": (db.query(Course).order_by(Course.id).first() or Course()).instructor,
        "course_code": (db.query(Course).order_by(Course.id).first() or Course()).code,
        "course_title": (db.query(Course).order_by(Course.id).first() or Course()).title,
        "total_enrolled_students": student_count,
        "class_average_mastery": class_average,
        "overall_learning_gain": average_gain,
        "class_retention_rate": None,
        "independent_solvers_pct": None,
        "module_mastery": module_mastery,
        "difficult_topics": difficult_topics,
        "course_outcomes": co_data,
        "active_interventions": interv_list,
        "aggregated_misconceptions": misc_list,
        "student_learning_gains": list(student_aggregates.values()),
        "topic_relearn_aggregates": topic_rows
    }

@app.post("/api/faculty/intervention/trigger")
def trigger_intervention(req: Dict[str, Any], db: Session = Depends(get_db), _: dict = Depends(require_faculty)):
    """Triggers and tracks a targeted faculty intervention."""
    topic = req.get("topic", "ADF Test Stationarity")
    new_intv = FacultyIntervention(
        topic=topic,
        topic_name=topic,
        issue_summary=req.get("misconception", "Theoretical vs practical application gap."),
        common_misconception=req.get("misconception", "Theoretical vs practical application gap."),
        misconception_description=req.get("misconception", "Theoretical vs practical application gap."),
        recommended_action=req.get("action", "Schedule 20-minute live demonstration."),
        status="Active",
        triggered_at=datetime.utcnow(),
    )
    db.add(new_intv)
    db.commit()
    return {"message": "Faculty intervention launched and student retesting scheduled!", "intervention_id": new_intv.id}


# ====================================================
# 6-STEP GUIDED AI LEARNING JOURNEY ENDPOINTS
# ====================================================
@app.get("/api/journey/modules")
def get_journey_modules(db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    modules = db.query(Module).order_by(Module.module_number).all()
    course_ids = {module.course_id for module in modules}
    courses = [{"id": course.id, "code": course.code, "title": course.title} for course in db.query(Course).filter(Course.id.in_(course_ids)).order_by(Course.id).all()]
    out = []
    for m in modules:
        if modules and m.course_id != modules[0].course_id:
            continue
        topics_data = []
        for t in sorted(m.topics, key=lambda topic: topic.order_index):
            topics_data.append({
                "id": t.id,
                "name": t.name,
                "order_index": t.order_index,
                "description": t.description,
                "subtopics": [{"id": sub.id, "name": sub.name, "order_index": sub.order_index, "description": sub.description} for sub in sorted(t.subtopics, key=lambda sub: sub.order_index)]
            })
        out.append({"id": m.id, "course_id": m.course_id, "module_number": m.module_number, "title": m.title, "teaching_hours": m.teaching_hours, "description": m.description, "topics": topics_data})
    return {"subjects": courses, "modules": out}

@app.get("/api/journey/quiz")
def get_journey_quiz(module_id: int, topic_id: int, quiz_type: str = "pre", subtopic_id: Optional[int] = None, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    """
    Fetches targeted quiz questions for a topic.
    quiz_type: 'pre' (baseline testing) or 'post' (mastery testing).
    """
    topic = db.query(Topic).filter(Topic.id == topic_id, Topic.module_id == module_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found for selected module")
    if quiz_type not in {"pre", "post"}:
        raise HTTPException(status_code=400, detail="quiz_type must be pre or post")
    if subtopic_id:
        subtopic = db.query(SubTopic).filter(SubTopic.id == subtopic_id, SubTopic.topic_id == topic_id).first()
        if not subtopic:
            raise HTTPException(status_code=404, detail="Subtopic not found for selected topic")
    questions = select_quiz(db, int(payload["sub"]), topic_id, quiz_type)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions are available for this topic yet")

    items = []
    for q in questions:
        # Strip out technical prefix for display
        clean_text = q.question_text
        for p in ["PRE-QUIZ: ", "POST-QUIZ: "]:
            if clean_text.startswith(p):
                clean_text = clean_text[len(p):]
        items.append({
            "id": q.id,
            "question_text": clean_text,
            "options": options_of(q),
            "difficulty": level(q),
            "category": q.category or q.co_tag or q.difficulty,
            "blooms_level": q.blooms_level
        })

    return {
        "module_id": module_id,
        "topic_id": topic_id,
        "quiz_type": quiz_type,
        "total_questions": len(items),
        "questions": items
    }

@app.post("/api/journey/submit-quiz")
def submit_journey_quiz(
    req: QuizSubmitRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    ensure_user_access(payload, req.user_id)
    """
    Grades a Pre or Post learning quiz, diagnoses weak concepts / misconceptions,
    computes score delta and mastery status, and returns detailed pedagogical analysis.
    """
    topic = db.query(Topic).filter(Topic.id == req.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if topic.module_id != req.module_id:
        raise HTTPException(status_code=400, detail="Topic does not belong to selected module")
    if req.quiz_type not in {"pre", "post"}:
        raise HTTPException(status_code=400, detail="quiz_type must be pre or post")
    if req.subtopic_id:
        subtopic = db.query(SubTopic).filter(SubTopic.id == req.subtopic_id, SubTopic.topic_id == req.topic_id).first()
        if not subtopic:
            raise HTTPException(status_code=404, detail="Subtopic not found for selected topic")
    module = db.query(Module).filter(Module.id == req.module_id).first()
    topic_name = topic.name if topic else f"Topic {req.topic_id}"
    module_title = module.title if module else f"Module {req.module_id}"

    allowed_questions = db.query(Question.id).filter(Question.topic_id == req.topic_id).all()
    allowed_ids = {str(question_id) for (question_id,) in allowed_questions}
    if not allowed_ids:
        fallback_qs = db.query(Question.id).filter(Question.topic_id == req.topic_id).all()
        allowed_ids = {str(qid) for (qid,) in fallback_qs}
    if not allowed_ids:
        raise HTTPException(status_code=409, detail="No questions are available for this quiz stage")

    # Flexible validation: grade whatever answers were submitted, rather than throwing a strict mismatch error
    stage_rows = db.query(Question).filter(Question.id.in_([int(i) for i in req.answers.keys() if i.isdigit()])) .all()
    if not stage_rows:
        stage_rows = db.query(Question).filter(Question.id.in_([int(i) for i in allowed_ids])).all()
    invalid_questions = [question.id for question in stage_rows if not question.correct_answer or not (json.loads(question.options_json) if question.options_json else [option for option in [question.option_a, question.option_b, question.option_c, question.option_d] if option])]
    if invalid_questions:
        raise HTTPException(status_code=409, detail="This quiz contains questions that are not ready to grade")
    for question in stage_rows:
        options = json.loads(question.options_json) if question.options_json else [option for option in [question.option_a, question.option_b, question.option_c, question.option_d] if option]
        if question.correct_answer not in options:
            raise HTTPException(status_code=409, detail="This quiz contains an invalid answer key")

    # Grade submitted answers
    correct_count = 0
    total_count = len(req.answers)
    graded_details = []
    weak_concepts = []

    for qid_str, student_ans in req.answers.items():
        try:
            qid = int(qid_str)
        except ValueError:
            continue
        q = db.query(Question).filter(Question.id == qid).first()
        if not q or q.topic_id != req.topic_id:
            continue
        is_correct = (student_ans.strip() == q.correct_answer.strip())
        if is_correct:
            correct_count += 1
        else:
            weak_concepts.append({
                "question": q.question_text,
                "student_answer": student_ans,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "category": q.category or q.co_tag or q.difficulty,
                "difficulty": q.difficulty
            })

        graded_details.append({
            "question_id": qid,
            "student_answer": student_ans,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "explanation": q.explanation
        })

    total_count = len(graded_details)
    score_pct = round((correct_count / total_count * 100.0), 1) if total_count > 0 else 0.0

    # Locate or create attempt record
    attempt = None
    if req.attempt_id:
        attempt = db.query(LearningJourneyAttempt).filter(LearningJourneyAttempt.id == req.attempt_id).first()

    if attempt and attempt.user_id != req.user_id:
        raise HTTPException(status_code=403, detail="Attempt does not belong to this student")
    if attempt and (attempt.topic_id != req.topic_id or attempt.module_id != req.module_id or attempt.subtopic_id != req.subtopic_id):
        raise HTTPException(status_code=400, detail="Attempt does not match the selected learning path")
    if attempt and req.quiz_type == "pre" and attempt.pre_completed_at:
        raise HTTPException(status_code=409, detail="This quiz has already been completed")
    if not attempt and req.quiz_type == "post":
        raise HTTPException(status_code=409, detail="Complete Quiz 1 before Quiz 2")
    if not attempt:
        attempt = db.query(LearningJourneyAttempt).filter(
            LearningJourneyAttempt.user_id == req.user_id,
            LearningJourneyAttempt.topic_id == req.topic_id,
            LearningJourneyAttempt.subtopic_id == req.subtopic_id,
            LearningJourneyAttempt.pre_completed_at.is_(None),
            LearningJourneyAttempt.post_completed_at.is_(None)
        ).order_by(LearningJourneyAttempt.created_at.desc()).first()

    if not attempt:
        attempt = LearningJourneyAttempt(
            user_id=req.user_id,
            module_id=req.module_id,
            topic_id=req.topic_id,
            subtopic_id=req.subtopic_id,
            topic_name=topic_name,
            module_title=module_title
        )
        db.add(attempt)
        db.flush()

    if req.quiz_type == "pre":
        attempt.pre_score_pct = score_pct
        attempt.pre_answers_json = json.dumps(graded_details)
        attempt.pre_weak_concepts_json = json.dumps(weak_concepts)
        attempt.pre_completed_at = datetime.utcnow()
        attempt.mastery_status = "Pre-Assessment Completed"
    else:
        if attempt.pre_completed_at is None:
            raise HTTPException(status_code=409, detail="Complete Quiz 1 before Quiz 2")
        if (attempt.pre_score_pct or 0) < PASS_MARK and not attempt.practice_problems_completed:
            raise HTTPException(status_code=409, detail="Complete targeted practice before Quiz 2")
        attempt.post_score_pct = score_pct
        attempt.post_answers_json = json.dumps(graded_details)
        attempt.post_weak_concepts_json = json.dumps(weak_concepts)
        attempt.post_completed_at = datetime.utcnow()
        gain = round(attempt.post_score_pct - (attempt.pre_score_pct or 0.0), 1)
        attempt.score_gain_pct = gain

        # Determine mastery status
        if score_pct >= PASS_MARK:
            attempt.mastery_status = "Mastered"
        elif score_pct >= 60.0:
            attempt.mastery_status = "Competent"
        else:
            attempt.mastery_status = "Needs Revision"

        # Generate targeted revision recommendations
        recs = []
        if weak_concepts:
            for wc in weak_concepts[:2]:
                recs.append(f"Review core rule: {wc['explanation'][:160]}...")
            recs.append("Retake the practice problem on this topic using ARIA Socratic mode.")
        else:
            recs.append("Excellent mastery! You are ready to tackle the advanced multi-step forecasting challenge in the Lab.")
        attempt.revision_recommended_json = json.dumps(recs)

    if req.quiz_type == "pre" and score_pct >= PASS_MARK:
        attempt.mastery_status = "Mastered"
    db.add(QuizResult(
        user_id=req.user_id, attempt_id=attempt.id, module_id=req.module_id, topic_id=req.topic_id,
        topic_name=topic_name, quiz_type=req.quiz_type, score_pct=score_pct, correct=correct_count,
        total=total_count, weak_concepts_json=json.dumps(weak_concepts), tab_switches=max(0, req.tab_switches),
    ))
    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "quiz_type": req.quiz_type,
        "passed": score_pct >= PASS_MARK,
        "topics_to_study": topics_to_study(weak_concepts, topic, db, score_pct >= PASS_MARK),
        "score_percentage": score_pct,
        "correct_count": correct_count,
        "total_questions": total_count,
        "pre_score_pct": attempt.pre_score_pct,
        "post_score_pct": attempt.post_score_pct,
        "score_gain_pct": attempt.score_gain_pct,
        "mastery_status": attempt.mastery_status,
        "graded_details": graded_details,
        "weak_concepts": weak_concepts,
        "revision_recommendations": json.loads(attempt.revision_recommended_json or "[]")
    }

@app.get("/api/journey/learn/{topic_id}")
def get_journey_learning_content(topic_id: int, subtopic_id: Optional[int] = None, db: Session = Depends(get_db), _: dict = Depends(require_student)):
    """
    Returns comprehensive, easy-to-digest study notes, LaTeX formulas,
    real-world company cases, 'Why Students Go Wrong' cognitive traps,
    and interactive practice problems for Step 4.
    """
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    subtopic = None
    if subtopic_id:
        subtopic = db.query(SubTopic).filter(SubTopic.id == subtopic_id, SubTopic.topic_id == topic_id).first()
        if not subtopic:
            raise HTTPException(status_code=404, detail="Subtopic not found for selected topic")
    topic_name = topic.name if not subtopic_id else subtopic.name
    module_title = topic.module.title if topic.module else "SB6202 Business Forecasting"
    material = get_topic_learning_material(topic_id, topic_name, module_title)
    return material

@app.post("/api/journey/complete-practice")
def complete_journey_practice(req: PracticeCompletionRequest, db: Session = Depends(get_db), payload: dict = Depends(require_student)):
    attempt = db.query(LearningJourneyAttempt).filter(LearningJourneyAttempt.id == req.attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    ensure_user_access(payload, attempt.user_id)
    if not attempt.pre_completed_at:
        raise HTTPException(status_code=409, detail="Complete Quiz 1 before practice")
    attempt.practice_problems_completed = (attempt.practice_problems_completed or 0) + 1
    db.commit()
    return {"status": "success", "practice_sessions": attempt.practice_problems_completed}


@app.post("/api/journey/mark-notes-read")
def mark_journey_notes_read(
    req: MarkNotesReadRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """Marks AI notes as reviewed without completing targeted practice."""
    attempt = db.query(LearningJourneyAttempt).filter(LearningJourneyAttempt.id == req.attempt_id).first()
    if attempt:
        ensure_user_access(payload, attempt.user_id)
        attempt.ai_notes_read = True
        db.commit()
        return {"status": "success", "attempt_id": attempt.id}
    return {"status": "not_found"}

@app.get("/api/journey/dashboard/{user_id}")
def get_journey_user_dashboard(
    user_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    ensure_user_access(payload, user_id)
    """
    Returns full comparative learning history across all topics for the student:
    Pre vs Post scores, learning gains (+%), weak concept heatmaps, and next revision steps.
    """
    attempts = db.query(LearningJourneyAttempt).filter(
        LearningJourneyAttempt.user_id == user_id,
        LearningJourneyAttempt.post_completed_at.is_not(None)
    ).order_by(LearningJourneyAttempt.updated_at.desc()).all()

    history = []
    total_pre = 0.0
    total_post = 0.0
    total_gain = 0.0
    completed_topics = 0
    weak_concepts_all = []

    for a in attempts:
        has_post = a.post_completed_at is not None
        if has_post:
            completed_topics += 1
            total_pre += (a.pre_score_pct or 0.0)
            total_post += (a.post_score_pct or 0.0)
            total_gain += (a.score_gain_pct or 0.0)

        weak_list = json.loads(a.post_weak_concepts_json or "[]")
        for w in weak_list:
            weak_concepts_all.append({
                "topic": a.topic_name,
                "module": a.module_title,
                "question": w.get("question"),
                "explanation": w.get("explanation"),
                "category": w.get("category")
            })

        history.append({
            "id": a.id,
            "module_id": a.module_id,
            "topic_id": a.topic_id,
            "module_title": a.module_title,
            "topic_name": a.topic_name,
            "pre_score_pct": a.pre_score_pct,
            "post_score_pct": a.post_score_pct,
            "score_gain_pct": a.score_gain_pct,
            "mastery_status": a.mastery_status,
            "pre_completed_at": a.pre_completed_at.isoformat() if a.pre_completed_at else None,
            "post_completed_at": a.post_completed_at.isoformat() if a.post_completed_at else None,
            "weak_concepts_count": len(weak_list),
            "revision_recommended": json.loads(a.revision_recommended_json or "[]")
        })

    avg_pre = round(total_pre / completed_topics, 1) if completed_topics > 0 else 0.0
    avg_post = round(total_post / completed_topics, 1) if completed_topics > 0 else 0.0
    avg_gain = round(total_gain / completed_topics, 1) if completed_topics > 0 else 0.0

    return {
        "user_id": user_id,
        "completed_topics": completed_topics,
        "average_pre_score": avg_pre,
        "average_post_score": avg_post,
        "average_score_gain": avg_gain,
        "attempts_history": history,
        "diagnosed_weak_concepts": weak_concepts_all[:6]
    }


# ====================================================
# AI LEARNING RECOMMENDATIONS
# ====================================================

class FatigueLogRequest(BaseModel):
    user_id: int
    session_minutes: int
    fatigue_score: float
    quiz_score: Optional[float] = None
    break_taken: bool = False

class ReflectionRequest(BaseModel):
    user_id: int
    topic_id: Optional[int] = None
    topic_name: str = ""
    understanding: str = ""
    confusion: str = ""
    key_insight: str = ""
    self_score: int = 3
    ai_suggested: bool = False

class ActionRecommendationRequest(BaseModel):
    recommendation_id: int


def ensure_user_access(payload: dict, user_id: int):
    if payload.get("sub") != str(user_id) and payload.get("role") not in {"faculty", "admin", "dean"}:
        raise HTTPException(status_code=403, detail="Cannot access another user's data")


@app.get("/api/recommendations/{user_id}")
def get_recommendations(
    user_id: int,
    refresh: bool = False,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """Get AI-powered learning recommendations for a student."""
    ensure_user_access(payload, user_id)
    if refresh:
        return generate_recommendations(user_id, db)
    existing = get_persisted_recommendations(user_id, db)
    if not existing:
        return generate_recommendations(user_id, db)
    return existing


@app.post("/api/recommendations/action")
def action_recommendation(
    req: ActionRecommendationRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """Mark a recommendation as actioned."""
    rec = db.query(LearningRecommendation).filter(LearningRecommendation.id == req.recommendation_id).first()
    if rec:
        ensure_user_access(payload, rec.user_id)
        rec.actioned = True
        db.commit()
    return {"status": "ok"}


@app.post("/api/fatigue/log")
def log_fatigue(
    req: FatigueLogRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """Log a learning fatigue data point for a student session."""
    ensure_user_access(payload, req.user_id)
    entry = LearningFatigueLog(
        user_id=req.user_id,
        session_minutes=req.session_minutes,
        fatigue_score=req.fatigue_score,
        quiz_score=req.quiz_score,
        break_taken=req.break_taken,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "status": "logged"}


@app.get("/api/fatigue/history/{user_id}")
def get_fatigue_history(
    user_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """Retrieve the last 14 fatigue session logs for a student."""
    ensure_user_access(payload, user_id)
    rows = (
        db.query(LearningFatigueLog)
        .filter(LearningFatigueLog.user_id == user_id)
        .order_by(LearningFatigueLog.recorded_at.desc())
        .limit(14)
        .all()
    )
    return [
        {
            "id": r.id,
            "session_minutes": r.session_minutes,
            "fatigue_score": r.fatigue_score,
            "quiz_score": r.quiz_score,
            "break_taken": r.break_taken,
            "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None,
        }
        for r in reversed(rows)
    ]


@app.post("/api/reflections")
def save_reflection(
    req: ReflectionRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """Save a student learning reflection."""
    ensure_user_access(payload, req.user_id)
    ref = Reflection(
        user_id=req.user_id,
        topic_id=req.topic_id,
        topic_name=req.topic_name,
        understanding=req.understanding,
        confusion=req.confusion,
        key_insight=req.key_insight,
        self_score=req.self_score,
        ai_suggested=req.ai_suggested,
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return {"id": ref.id, "status": "saved"}


@app.get("/api/reflections/{user_id}")
def get_reflections(
    user_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    """Return all reflections for a student."""
    ensure_user_access(payload, user_id)
    rows = (
        db.query(Reflection)
        .filter(Reflection.user_id == user_id)
        .order_by(Reflection.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "topic_id": r.topic_id,
            "topic_name": r.topic_name,
            "understanding": r.understanding,
            "confusion": r.confusion,
            "key_insight": r.key_insight,
            "self_score": r.self_score,
            "ai_suggested": r.ai_suggested,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@app.delete("/api/reflections/{reflection_id}")
def delete_reflection(
    reflection_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_student),
):
    ref = db.query(Reflection).filter(Reflection.id == reflection_id).first()
    if ref:
        ensure_user_access(payload, ref.user_id)
        db.delete(ref)
        db.commit()
    return {"status": "deleted"}


@app.get("/api/dean/department")
def get_department_overview(
    db: Session = Depends(get_db),
    _: dict = Depends(require_dean),
):
    """Department-level analytics for the Dean portal."""
    total_students = db.query(User).filter(User.role == "student").count()
    students = db.query(User).filter(User.role == "student").all()
    student_names = {student.id: student.full_name for student in students}
    completed = db.query(LearningJourneyAttempt).filter(LearningJourneyAttempt.post_completed_at.is_not(None), LearningJourneyAttempt.user_id.in_(db.query(User.id).filter(User.role == "student"))).all()
    scores_by_student = {}
    for attempt in completed:
        scores_by_student.setdefault(attempt.user_id, []).append(attempt.post_score_pct or 0)
    student_averages = [sum(scores) / len(scores) for scores in scores_by_student.values()]
    avg_mastery = round(sum(student_averages) / len(student_averages), 1) if student_averages else None
    at_risk_students = sum(1 for score in student_averages if score < 50)
    modules = db.query(Module).order_by(Module.module_number).all()
    module_scores = {}
    for attempt in completed:
        entry = module_scores.setdefault(attempt.module_id, {"scores": [], "students": set()})
        entry["scores"].append(attempt.post_score_pct or 0)
        entry["students"].add(attempt.user_id)
    modules_data = [{
        "id": module.id,
        "name": module.title,
        "mastery": round(sum(module_scores.get(module.id, {}).get("scores", [])) / len(module_scores[module.id]["scores"]), 1) if module_scores.get(module.id, {}).get("scores") else None,
        "strong": sum(1 for attempt in completed if attempt.module_id == module.id and (attempt.post_score_pct or 0) >= 80),
        "weak": sum(1 for attempt in completed if attempt.module_id == module.id and (attempt.post_score_pct or 0) < 50),
        "students": len(module_scores.get(module.id, {}).get("students", set())),
    } for module in modules]
    courses = db.query(Course).order_by(Course.id).all()
    interventions = db.query(FacultyIntervention).all()
    faculty = db.query(User).filter(User.role.in_(["faculty", "admin"])).order_by(User.full_name).all()
    return {
        "total_students": total_students,
        "avg_department_mastery": avg_mastery,
        "subjects_running": len(courses),
        "at_risk_students": at_risk_students,
        "subjects": [{
            "id": course.id,
            "code": course.code,
            "name": course.title,
            "students": total_students,
            "avg_mastery": avg_mastery,
            "completion": round(len(scores_by_student) / total_students * 100, 1) if total_students else None,
            "at_risk": at_risk_students,
            "trend": None,
        } for course in courses],
        "modules": modules_data,
        "faculty": [{
            "id": person.id,
            "name": person.full_name,
            "subject": courses[0].title if courses else "—",
            "avg_mastery": avg_mastery,
            "students_above_80": sum(1 for score in student_averages if score >= 80),
            "interventions": len(interventions),
        } for person in faculty],
    }


# Mount frontend build if exists
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
