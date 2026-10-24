"""
AI Pedagogical & Reasoning Engine for AI Learning Partner 360
MBA Business Forecasting (SB6202)
Implements:
- AI Tutor (Ask -> Guide -> Hint -> Explain -> Solve)
- Socratic Learning Mode
- Teach the AI (Rubric Evaluator)
- Misconception Engine (Detection & Tracking)
- Model Selection Coach
- AI Independence Progression System
- RAG Knowledge Base (RV University MBA Syllabus Grounded)
"""
import re
from datetime import datetime

# ====================================================
# SYLLABUS RAG APPROVED KNOWLEDGE BASE
# ====================================================
SYLLABUS_KNOWLEDGE = {
    "course_overview": {
        "source": "RV University Syllabus SB6202",
        "section": "Course Outline & Objectives",
        "content": (
            "Course: SB6202 Business Forecasting, Semester III Elective, School of Business (SOB). "
            "Instructor: Dr Veena A. 4 Credits, 40 total teaching hours. "
            "Objectives: Help students understand the basics and importance of business forecasting, "
            "teach methods from traditional smoothing to advanced ML, and apply forecasting to real-world business decisions."
        )
    },
    "module_1": {
        "title": "Module 1: Introduction to Forecasting",
        "hours": 6,
        "source": "RV University SB6202, Module 1, Sessions 1-6",
        "topics": [
            "Nature and Importance of Forecasting", "Role in Managerial Planning and Control",
            "Components of Time Series", "Forecast Horizons (Short, Medium, Long-term)",
            "Forecasting Process: Steps and Challenges",
            "Forecast Accuracy Measures: MAE, MSE, RMSE, MAPE"
        ],
        "key_points": (
            "Forecasting is the basis of planning and budgetary control. "
            "Accuracy measures quantify model residuals: "
            "MAE gives linear penalty in original units; "
            "MSE heavily penalizes outliers; "
            "RMSE is the square root of MSE preserving data scale; "
            "MAPE measures relative percentage error, but becomes problematic when actuals approach zero."
        )
    },
    "module_2": {
        "title": "Module 2: Forecasting Techniques",
        "hours": 10,
        "source": "RV University SB6202, Module 2, Sessions 7-16",
        "topics": [
            "Data Patterns: Trend, Seasonality, Cyclical, and Random",
            "Moving Average Method", "Simple Exponential Smoothing (SES)",
            "Double Exponential Smoothing (Holt's Linear)",
            "Holt-Winters Model (Triple Exponential Smoothing)",
            "Forecasting time series with seasonal variation"
        ],
        "key_points": (
            "Moving Average provides simple smoothing but lags behind sharp trends. "
            "Simple Exponential Smoothing applies exponentially declining weights via smoothing parameter alpha (0 < alpha < 1). "
            "Holt's linear model incorporates trend parameter beta. "
            "Holt-Winters adds seasonal parameter gamma, handling additive or multiplicative seasonal swings."
        )
    },
    "module_3": {
        "title": "Module 3: Univariate Time series Models",
        "hours": 12,
        "source": "RV University SB6202, Module 3, Sessions 17-28",
        "topics": [
            "Autocorrelation (ACF) and Partial Autocorrelation (PACF)",
            "Moving Average process MA(q)", "Autoregressive process AR(p)",
            "Stationarity and Unit Root Tests (Augmented Dickey-Fuller / ADF Test)",
            "Differencing a time series, Lags",
            "ARMA process", "ARIMA process", "Seasonal ARIMA (SARIMA)"
        ],
        "key_points": (
            "Stationarity requires constant mean, constant variance, and autocovariance independent of time. "
            "ADF test tests H0: Unit root present (non-stationary). Rejection requires p < 0.05. "
            "Differencing of order d removes trend. "
            "ACF tail-off + PACF cut-off at lag p identifies AR(p). "
            "PACF tail-off + ACF cut-off at lag q identifies MA(q). "
            "SARIMA extends ARIMA with seasonal orders (P,D,Q)_s."
        )
    },
    "module_4": {
        "title": "Module 4: Multivariate Time Series Models",
        "hours": 8,
        "source": "RV University SB6202, Module 4, Sessions 29-36",
        "topics": [
            "Vector Autoregression (VAR) model", "VARIMAX model", "SARIMAX model"
        ],
        "key_points": (
            "VAR models multiple interrelated endogenous time series where every variable influences every other variable. "
            "SARIMAX incorporates external exogenous explanatory variables (e.g., price discounts, digital advertising spend) "
            "into a seasonal ARIMA framework. Remember: correlation between regressors and sales does not establish causality."
        )
    },
    "module_5": {
        "title": "Module 5: Supervised & Advanced Machine Learning Models",
        "hours": 4,
        "source": "RV University SB6202, Module 5, Sessions 37-40",
        "topics": [
            "Linear Regression", "Decision Tree Regressor", "KNN model",
            "Random Forest", "Gradient Boosting with XGBoost"
        ],
        "key_points": (
            "Time series is transformed into supervised learning via lag features (lag_1, lag_2, lag_12), "
            "rolling window aggregates, and calendar indicators. "
            "Random Forest and XGBoost capture complex non-linear interactions without rigid stationarity assumptions, "
            "but require strict out-of-time validation to prevent lookahead data leakage."
        )
    }
}

# ====================================================
# MISCONCEPTION DETECTOR
# ====================================================
MISCONCEPTIONS_CATALOG = [
    {
        "id": "MISC_01",
        "topic": "ARIMA",
        "pattern": r"(ma in arima means moving average forecast|ma in arima is moving average method|ma component is just moving average)",
        "name": "MA in ARIMA vs Moving Average Smoothing",
        "explanation": (
            "Misconception Detected: You mentioned that MA in ARIMA is the moving average forecasting method. "
            "In reality, the MA(q) component in ARIMA refers to the Moving Average of past random white-noise error terms (shocks), "
            "represented as e_t + theta_1*e_{t-1}. It is mathematically distinct from the simple moving average smoothing technique "
            "which averages historical observations y_t."
        )
    },
    {
        "id": "MISC_02",
        "topic": "ADF Test & Stationarity",
        "pattern": r"(p-value.*greater than.*0\.05.*(mean|prove).*stationar|p\s*>\s*0\.05.*(mean|prove).*stationar|high p-value.*(mean|prove).*stationar)",
        "name": "Inverse Interpretation of ADF p-value",
        "explanation": (
            "Misconception Detected: In the Augmented Dickey-Fuller (ADF) test, the Null Hypothesis (H0) is that the series "
            "HAS A UNIT ROOT (i.e., is Non-Stationary). Therefore, a p-value > 0.05 means you FAIL TO REJECT H0—the series is NON-STATIONARY! "
            "To confirm stationarity, you need a p-value < 0.05 (rejecting H0)."
        )
    },
    {
        "id": "MISC_03",
        "topic": "Forecast Accuracy",
        "pattern": r"(mape is always the best|use mape for everything|mape works fine when sales are zero|mape with zero)",
        "name": "Unconditional Use of MAPE",
        "explanation": (
            "Misconception Detected: MAPE (Mean Absolute Percentage Error) divides errors by the actual values (|y_t - y_pred| / y_t). "
            "When actual sales are zero or close to zero, MAPE divides by zero, generating infinite or extreme distortions. "
            "In MBA business cases with zero-demand periods, MAE (Mean Absolute Error) or RMSE is preferred."
        )
    },
    {
        "id": "MISC_04",
        "topic": "Multivariate Forecasting",
        "pattern": r"(var proves that.*causes|granger causality proves real causality|regression proves causality)",
        "name": "Equating Temporal Correlation with Business Causality",
        "explanation": (
            "Misconception Detected: Neither VAR nor regression proves true business causality. "
            "They measure statistical association and temporal precedence (lead-lag relationships). "
            "Confounding external variables (e.g. general macroeconomic growth) could simultaneously drive both advertising and sales."
        )
    },
    {
        "id": "MISC_05",
        "topic": "SARIMA & Differencing",
        "pattern": r"(first difference removes seasonality|d=1 removes seasonal variation|just difference once for seasonality)",
        "name": "Confusing First-Order Differencing with Seasonal Differencing",
        "explanation": (
            "Misconception Detected: Regular first-order differencing (y_t - y_{t-1}) removes deterministic linear trends. "
            "It does NOT remove recurring seasonal cycles. To eliminate seasonal non-stationarity, you must apply seasonal differencing "
            "(y_t - y_{t-s}, where s=12 for monthly data, i.e., D=1 in SARIMA)."
        )
    }
]


def detect_misconceptions(text):
    """Scans text for common student misconceptions."""
    findings = []
    text_lower = text.lower()
    for misc in MISCONCEPTIONS_CATALOG:
        if re.search(misc["pattern"], text_lower):
            findings.append(misc)
    return findings


# ====================================================
# TEACH-THE-AI EVALUATION RUBRIC
# ====================================================
def evaluate_student_teaching(topic, student_explanation):
    """
    Evaluates student's explanation to the AI based on the official RV University CIE rubric:
    1. Conceptual Understanding (25%)
    2. Knowledge of Terminology (25%)
    3. Analytical Reasoning & Formula (20%)
    4. Business Interpretation (15%)
    5. Accuracy / Freedom from Misconceptions (15%)
    """
    text = student_explanation.strip()
    words = text.split()
    word_count = len(words)

    # Detect any known misconceptions
    detected_misc = detect_misconceptions(text)

    # Topic-specific keywords
    topic_keywords = {
        "MAPE": ["percentage", "actual", "error", "zero", "relative", "outlier", "scale", "symmetric"],
        "ARIMA": ["autoregressive", "moving average", "differencing", "stationarity", "lag", "p", "d", "q", "acf", "pacf"],
        "Stationarity": ["mean", "variance", "autocovariance", "unit root", "adf", "differencing", "time"],
        "SARIMA": ["seasonality", "seasonal", "period", "p,d,q", "p,d,q", "annual", "quarterly", "sarimax"],
        "XGBoost": ["lag", "supervised", "decision tree", "gradient boosting", "features", "overfitting", "non-linear"]
    }

    keywords = topic_keywords.get(topic, ["forecasting", "model", "data", "business", "trend"])
    found_keywords = [kw for kw in keywords if kw in text.lower()]
    keyword_coverage = len(found_keywords) / max(1, len(keywords))

    # Scoring rubric out of 4 (1=Needs Improvement, 2=Satisfactory, 3=Good, 4=Excellent)
    if word_count < 15:
        score_concept = 1
        score_terms = 1
        score_reasoning = 1
        score_biz = 1
    elif word_count < 40:
        score_concept = 3 if keyword_coverage >= 0.3 else 2
        score_terms = 3 if keyword_coverage >= 0.3 else 2
        score_reasoning = 2
        score_biz = 2
    elif word_count < 100:
        score_concept = 4 if keyword_coverage >= 0.35 else 3
        score_terms = 4 if keyword_coverage >= 0.35 else 3
        score_reasoning = 3 if any(b in text.lower() for b in ["because", "therefore", "dividing", "formula", "zero"]) else 2
        score_biz = 3 if any(b in text.lower() for b in ["inventory", "sales", "manager", "decision", "risk", "demand", "executive"]) else 2
    else:
        score_concept = 4 if keyword_coverage >= 0.4 else 3
        score_terms = 4 if keyword_coverage >= 0.4 else 3
        score_reasoning = 4 if any(b in text.lower() for b in ["because", "therefore", "formula", "dividing"]) else 3
        score_biz = 4 if any(b in text.lower() for b in ["inventory", "sales", "manager", "decision", "risk", "demand", "budget", "executive"]) else 3

    score_accuracy = 4
    if detected_misc:
        score_accuracy = max(1, score_accuracy - (len(detected_misc) * 2))

    total_weighted = (
        (score_concept * 0.25) +
        (score_terms * 0.25) +
        (score_reasoning * 0.20) +
        (score_biz * 0.15) +
        (score_accuracy * 0.15)
    )
    scaled_100 = round((total_weighted / 4.0) * 100, 1)

    if scaled_100 >= 80:
        grade = "Advanced Mastery"
        feedback = "Outstanding pedagogical delivery! You demonstrated comprehensive technical grasp and linked the technique to executive decision-making."
    elif scaled_100 >= 60:
        grade = "Proficient"
        feedback = "Solid explanation! You covered the core principles well. Deepen your explanation of boundary conditions (e.g. edge cases, zeros, seasonal differences)."
    elif scaled_100 >= 40:
        grade = "Developing"
        feedback = "Developing grasp. You have an intuitive understanding, but you missed key mathematical definitions and managerial applications."
    else:
        grade = "Needs Foundation"
        feedback = "Needs Foundation. Review the underlying syllabus lecture notes before explaining again."

    return {
        "topic": topic,
        "overall_score": scaled_100,
        "grade": grade,
        "rubric_breakdown": {
            "conceptual_understanding": {"score": score_concept, "max": 4, "weight": "25%"},
            "knowledge_of_terminology": {"score": score_terms, "max": 4, "weight": "25%"},
            "analytical_reasoning": {"score": score_reasoning, "max": 4, "weight": "20%"},
            "business_interpretation": {"score": score_biz, "max": 4, "weight": "15%"},
            "freedom_from_misconceptions": {"score": score_accuracy, "max": 4, "weight": "15%"}
        },
        "detected_misconceptions": [m["explanation"] for m in detected_misc],
        "strengths": [f"Incorporated key terms: {', '.join(found_keywords[:4])}"] if found_keywords else ["Constructive start to explaining."],
        "missing_concepts": [kw for kw in keywords if kw not in found_keywords][:3],
        "ai_tutor_feedback": feedback
    }


# ====================================================
# SOCRATIC & AI TUTOR STATE MACHINE
# ====================================================
def socratic_dialogue_step(topic, student_message, turn_count=1):
    """
    Socratic teaching mode: AI never gives away answers;
    Guides student towards realization via structured inquiry.
    """
    text_lower = student_message.lower()

    # Detect misconceptions
    misc = detect_misconceptions(student_message)
    misc_note = f"\n\n[Pedagogical Alert: {misc[0]['explanation']}]" if misc else ""

    if "arima" in topic.lower():
        if turn_count == 1:
            reply = (
                "Welcome to the Socratic Exploration of ARIMA. Let us build the model from first principles.\n\n"
                "Before we write down ARIMA(p,d,q), what fundamental statistical condition must a time series "
                "satisfy before we can model it as an autoregressive or moving-average process?"
            )
        elif any(w in text_lower for w in ["stationarity", "stationary", "constant mean", "unit root"]):
            reply = (
                "Spot on! The series must be stationary. Now tell me:\n"
                "If you plot your monthly retail sales data and notice that average sales grow upward year after year, "
                "is the series stationary? And what mathematical operation in ARIMA converts it to a stationary series?"
            )
        elif any(w in text_lower for w in ["difference", "differencing", "d", "subtract"]):
            reply = (
                "Excellent reasoning: differencing (order d) removes the stochastic trend!\n"
                "Now, once the series is stationary, you inspect the Autocorrelation Function (ACF) and Partial Autocorrelation (PACF).\n"
                "If the PACF cuts off abruptly after lag 2 while the ACF tails off gradually, what ARIMA order (p or q) would you select?"
            )
        elif any(w in text_lower for w in ["ar(2)", "ar 2", "p=2", "p = 2", "autoregressive"]):
            reply = (
                "Phenomenal! That indicates an AR(2) process with p=2, d=1, and q=0 (ARIMA(2,1,0)).\n\n"
                "Final Socratic challenge: As an MBA Operations Director, why is an ARIMA model often preferred over "
                "a simple 3-month moving average when planning annual warehouse lease agreements?"
            )
        else:
            reply = (
                "Consider the underlying assumptions of time series modeling. "
                "If the mean or variance keeps changing over time, can historical averages reliably predict future intervals? "
                "What do we call a time series whose mean and variance do not depend on time?"
            )

    elif "stationarity" in topic.lower() or "adf" in topic.lower():
        if turn_count == 1:
            reply = (
                "Let's explore Stationarity and Unit Root Testing.\n\n"
                "When you run an Augmented Dickey-Fuller (ADF) test on a company's revenue series, "
                "what is the Null Hypothesis (H0)? Is H0 'stationary' or 'non-stationary'?"
            )
        elif "non" in text_lower or "unit root" in text_lower:
            reply = (
                "Exactly: H0 states that the series possesses a unit root (it is non-stationary).\n"
                "Suppose your software outputs an ADF test statistic of -3.85 with a p-value of 0.002. "
                "At a 5% significance level, do you reject or fail to reject H0? And does this mean the series is stationary?"
            )
        else:
            reply = (
                "Careful! This is one of the most common pitfalls in business analytics. "
                "Recall that in classical hypothesis testing for unit roots, the default assumption (H0) assumes the presence "
                "of a random walk with drift. Does a random walk represent a stationary or non-stationary process?"
            )

    else:
        # Generic socratic fallback
        reply = (
            f"You are exploring '{topic}'. In business forecasting, we never accept model outputs blindly.\n\n"
            "What business risk arises if an operations team selects a model based purely on training R-squared "
            "without evaluating out-of-sample forecast accuracy on unseen test data?"
        )

    return reply + misc_note


def ai_tutor_response(mode, query, user_mastery=65.0):
    """
    AI Tutor pipeline:
    ASK -> GUIDE -> HINT -> EXPLAIN -> SOLVE
    Grounds answers in SB6202 RV University syllabus.
    """
    q_lower = query.lower()

    # Misconception scan
    misc = detect_misconceptions(query)
    misc_prefix = f"⚠️ **Misconception Clarification First:**\n{misc[0]['explanation']}\n\n---\n\n" if misc else ""

    if "what is arima" in q_lower or "explain arima" in q_lower:
        response = (
            "**ARIMA (Autoregressive Integrated Moving Average)** is a classical statistical framework for univariate time series forecasting.\\n\\n"
            "### 1. Mathematical Components:\\n"
            "• **AR(p)**: Autoregression models the variable as a linear function of its own past $p$ lags: $y_t = c + \\phi_1 y_{t-1} + ... + \\epsilon_t$\\n"
            "• **I(d)**: Integration represents the degree of differencing $d$ applied to transform a non-stationary series into a stationary one.\\n"
            "• **MA(q)**: Moving Average models the series as a linear combination of past forecast error terms (shocks): $\\epsilon_t + \\theta_1 \\epsilon_{t-1} + ...$\\n\\n"
            "### 2. MBA Managerial Relevance:\\n"
            "Unlike simple smoothing methods, ARIMA captures autocorrelated shock propagation (e.g., how a supply chain delay in month $t$ continues to impact orders over subsequent quarters).\\n\\n"
            "**Source Reference:** *RV University SB6202 Syllabus, Module 3 (Sessions 17–26)*; Dinesh Kumar, *Business Analytics*."
        )
    elif "mape" in q_lower or "accuracy" in q_lower or "rmse" in q_lower:
        response = (
            "**Forecast Accuracy Evaluation in MBA Decision Making:**\n\n"
            "1. **MAE (Mean Absolute Error):** Measures average absolute deviation. Expressed in original physical units (e.g., number of cars sold). Robust to outliers.\n"
            "2. **MSE & RMSE (Root Mean Squared Error):** Squaring errors penalizes large forecasting misses disproportionately. Ideal when a large stockout carries severe contractual penalties.\n"
            "3. **MAPE (Mean Absolute Percentage Error):** Normalized percentage error, allowing executives to compare forecast accuracy across different product categories.\n"
            "   - *Critical Limitation:* If actual demand equals 0, MAPE produces division-by-zero errors or infinite distortions.\n\n"
            "**Source Reference:** *RV University SB6202 Syllabus, Module 1 (Sessions 4–6)*; Hyndman & Athanasopoulos, *Forecasting: Principles & Practice*."
        )
    elif "adf" in q_lower or "stationar" in q_lower or "unit root" in q_lower:
        response = (
            "**Augmented Dickey-Fuller (ADF) Test & Stationarity Framework:**\n\n"
            "### 1. What is Stationarity?\n"
            "A time series is weakly stationary (covariance stationary) if:\n"
            "• **Constant Mean:** $E[y_t] = \\mu$ for all periods $t$ (no upward or downward trend drift).\n"
            "• **Constant Variance:** $Var(y_t) = \\sigma^2$ (homoskedasticity over time).\n"
            "• **Constant Autocovariance:** $Cov(y_t, y_{t-k})$ depends solely on the lag separation $k$, not on calendar time $t$.\n\n"
            "### 2. The Augmented Dickey-Fuller (ADF) Test:\n"
            "The ADF test investigates the presence of a **unit root** (stochastic trend):\n"
            "• **Null Hypothesis ($H_0$):** $\\gamma = 0$ → The series has a unit root (**Non-Stationary**).\n"
            "• **Alternative Hypothesis ($H_1$):** $\\gamma < 0$ → The series is **Stationary**.\n\n"
            "### 3. Managerial Decision Rule:\n"
            "• **If p-value < 0.05** (and test statistic is more negative than the 5% critical value, e.g. -3.85 < -2.93):\n"
            "  → **Reject $H_0$** → The series is **Stationary**! You can proceed with ARMA/ARIMA modeling with $d=0$.\n"
            "• **If p-value ≥ 0.05**:\n"
            "  → **Fail to Reject $H_0$** → The series is **Non-Stationary**! You must apply first-order differencing: $\\Delta y_t = y_t - y_{t-1}$ ($d=1$) and re-test before fitting an ARIMA model.\n\n"
            "### 4. Boardroom Pitfall:\n"
            "Fitting regression or ARIMA models on non-stationary data causes **spurious regression**—where $R^2 > 0.90$ and t-statistics appear artificially high, but the model has zero out-of-sample predictive power.\n\n"
            "**Source Reference:** *RV University SB6202 Syllabus, Module 3 (Sessions 17–28)*; Dr. Veena A."
        )
    elif "holt" in q_lower or "smoothing" in q_lower or "exponential" in q_lower:
        response = (
            "**Exponential Smoothing & Holt-Winters Framework:**\n\n"
            "1. **Simple Exponential Smoothing (SES):** Used when data has no trend and no seasonality. Updates the level via smoothing parameter $\\alpha \\in (0, 1)$:\n"
            "   $$\\hat{y}_{t+1} = \\alpha y_t + (1-\\alpha)\\hat{y}_t$$\n"
            "2. **Holt's Linear Smoothing:** Adds a trend smoothing parameter $\\beta \\in (0, 1)$ to capture upward or downward linear slopes:\n"
            "   $$\\hat{y}_{t+h} = L_t + h b_t$$\n"
            "3. **Holt-Winters Model (Triple Exponential):** Adds a seasonal parameter $\\gamma \\in (0, 1)$ to capture repeating cycles of period $s$:\n"
            "   • **Additive Holt-Winters:** Used when seasonal swings remain constant in dollar/unit amplitude regardless of overall sales level.\n"
            "   • **Multiplicative Holt-Winters:** Required when seasonal peaks expand proportionally as total business volume grows.\n\n"
            "**Source Reference:** *RV University SB6202 Syllabus, Module 2 (Sessions 7–16)*."
        )
    elif "var" in q_lower or "multivariate" in q_lower:
        response = (
            "**Vector Autoregression (VAR) & Multivariate Modeling:**\n\n"
            "1. **Core Concept:** In univariate ARIMA, a variable is predicted solely from its own past. In VAR, all variables are mutually endogenous—each variable is modeled as a linear function of its own lagged values AND the lagged values of all other variables in the corporate system.\n"
            "2. **Stationarity Requirement:** All series in a VAR model MUST be stationary before estimation. If non-stationary, difference each series or test for cointegration (VECM).\n"
            "3. **Granger Causality:** Tests whether past values of variable $X$ contain statistically significant information that improves forecasts of variable $Y$ above and beyond past $Y$ alone.\n"
            "4. **Impulse Response Functions (IRF):** Traces how a 1-standard-deviation marketing or macroeconomic shock propagates across all interconnected business variables over time.\n\n"
            "**Source Reference:** *RV University SB6202 Syllabus, Module 4 (Sessions 29–36)*."
        )
    elif "xgboost" in q_lower or "machine learning" in q_lower or "random forest" in q_lower:
        response = (
            "**Supervised Machine Learning & XGBoost for Time Series:**\n\n"
            "1. **Tabular Transformation:** Time series cannot be fed directly into tree algorithms. They must be reformatted into supervised feature matrices using **lag features** ($y_{t-1}, y_{t-2}$), **rolling window metrics** (7-day rolling mean, rolling std), and **calendar flags** (day-of-week, holiday markers).\n"
            "2. **Crucial Limitation (Extrapolation):** Decision trees partition feature space into rectangles and output step-wise constant averages. They CANNOT extrapolate higher values beyond the maximum target value seen in historical training data without prior detrending.\n"
            "3. **Cross-Validation Rule:** Standard random k-fold cross-validation is strictly prohibited on time series because it causes catastrophic future-to-past data leakage. Use **TimeSeriesSplit** (expanding window rolling CV).\n\n"
            "**Source Reference:** *RV University SB6202 Syllabus, Module 5 (Sessions 37–40)*."
        )
    elif "which model" in q_lower or "model selection" in q_lower:
        response = (
            "**Model Selection Framework for Business Forecasters:**\n\n"
            "1. **Is the data stationary with no trend or seasonality?**\n"
            "   → Use *Simple Exponential Smoothing* or *ARMA(p,q)*.\n"
            "2. **Is there linear trend without strong seasonality?**\n"
            "   → Use *Holt's Linear Exponential Smoothing* or *ARIMA(p,1,q)*.\n"
            "3. **Does the series exhibit recurring seasonal cycles (e.g., quarterly or monthly peaks)?**\n"
            "   → Use *Holt-Winters (Triple Exponential)* or *SARIMA(p,d,q)x(P,D,Q)_s*.\n"
            "4. **Are there external promotional/pricing regressors driving sales?**\n"
            "   → Use *SARIMAX* or *Supervised Machine Learning (Random Forest / XGBoost)*.\n"
            "5. **Are multiple interrelated time series influencing one another?**\n"
            "   → Use *Vector Autoregression (VAR)*.\n\n"
            "**Source Reference:** *RV University SB6202 Syllabus, Modules 2–5*."
        )
    else:
        response = (
            f"Regarding your inquiry on **'{query}'**:\n\n"
            "In MBA Business Forecasting (SB6202), we systematically analyze historical time-series components "
            "(Trend, Seasonality, Cyclical, and Irregular/Random) to evaluate uncertainty and formulate operational contingencies.\n\n"
            "To help you apply this effectively: are you seeking to determine model parameters (like p,d,q), "
            "perform hypothesis testing (like ADF), or translate forecast metrics into working-capital decisions?\n\n"
            "**Source Reference:** *RV University SOB SB6202 Course Outline (Dr Veena A)*."
        )

    return misc_prefix + response


# ====================================================
# MODEL SELECTION COACH
# ====================================================
def model_selection_coach(answers):
    """
    Interactive diagnostic coach guiding student to select the right model.
    answers: dict containing:
    - is_multivariate (bool)
    - has_trend (bool)
    - has_seasonality (bool)
    - is_stationary (bool)
    - has_external_drivers (bool)
    - sample_size (int)
    - need_high_interpretability (bool)
    """
    is_multi = answers.get("is_multivariate", False)
    has_trend = answers.get("has_trend", True)
    has_season = answers.get("has_seasonality", True)
    is_stat = answers.get("is_stationary", False)
    has_drivers = answers.get("has_external_drivers", False)
    sample_size = answers.get("sample_size", 48)
    interpretability = answers.get("need_high_interpretability", True)

    recommendations = []
    justifications = []

    if is_multi:
        recommendations.append("Vector Autoregression (VAR)")
        justifications.append("Multiple interrelated endogenous time series where shocks propagate across all variables.")

    if has_drivers:
        recommendations.append("SARIMAX or Supervised Machine Learning (XGBoost/Random Forest)")
        justifications.append("Exogenous variables (pricing, ad spend) must be included as external regressors.")

    if has_season and not has_drivers:
        if interpretability or sample_size < 30:
            recommendations.append("Holt-Winters Exponential Smoothing")
            justifications.append("Clear recurring seasonal pattern with moderate historical sample size requiring high boardroom transparency.")
        else:
            recommendations.append("SARIMA (Seasonal ARIMA)")
            justifications.append("Formal statistical capture of seasonal autocorrelation and stochastic drift.")

    if not has_season and has_trend:
        recommendations.append("Holt's Linear Smoothing or ARIMA(p,1,q)")
        justifications.append("Trend component present without complex seasonal oscillations.")

    if is_stat and not has_trend and not has_season:
        recommendations.append("Simple Exponential Smoothing (SES) or ARMA(p,q)")
        justifications.append("Stationary baseline; smoothing level parameter alpha handles stationary noise.")

    if not recommendations:
        recommendations.append("ARIMA(1,1,1) Benchmark")
        justifications.append("Standard universal time series benchmark.")

    primary = recommendations[0]

    return {
        "primary_recommendation": primary,
        "all_candidate_models": recommendations,
        "managerial_justification": " ".join(justifications),
        "boardroom_takeaway": (
            f"For this business case, prioritize **{primary}**. "
            "Ensure you evaluate out-of-sample RMSE and MAPE before finalizing production inventory allocations."
        )
    }


# ====================================================
# AI INDEPENDENCE MANAGER
# ====================================================
def evaluate_independence_attempt(current_level, hints_used, is_correct, attempt_number):
    """
    Evaluates student performance in AI Independence Mode.
    Progresses from Level 0 (Full AI Guidance) to Level 5 (Completely Independent).
    Tracks AI Independence Gain.
    """
    # Level definitions:
    # Level 0: Full step-by-step guidance
    # Level 1: Guiding questions only
    # Level 2: Small hints
    # Level 3: Concept reminder only
    # Level 4: No solution assistance (verification only)
    # Level 5: Completely independent (blind assessment)

    new_level = current_level
    if is_correct and hints_used == 0:
        new_level = min(5, current_level + 1)
    elif not is_correct and hints_used >= 2:
        new_level = max(0, current_level - 1)

    initial_unaided = 50.0
    supported_performance = 76.0 + (new_level * 2.5)
    final_unaided = 50.0 + (new_level * 6.4)
    independence_gain = round(final_unaided - initial_unaided, 1)

    level_labels = [
        "Level 0: Full AI Scaffolding",
        "Level 1: Socratic Guiding Questions",
        "Level 2: Strategic Hints Only",
        "Level 3: Concept Reminder Only",
        "Level 4: Solution Verification Only",
        "Level 5: Completely Independent Forecaster"
    ]

    return {
        "previous_level": current_level,
        "new_level": new_level,
        "level_title": level_labels[new_level],
        "is_correct": is_correct,
        "hints_used": hints_used,
        "initial_unaided_score": initial_unaided,
        "supported_performance": supported_performance,
        "final_unaided_score": round(final_unaided, 1),
        "ai_independence_gain": f"+{independence_gain} percentage points",
        "readiness_verdict": "Autonomous Forecaster Ready" if new_level >= 4 else "Building Independence",
        "feedback": (
            "Congratulations! You solved this forecasting challenge without relying on generative answers."
            if new_level >= 4 else
            "Good attempt. Continue practicing with fewer hint requests to strengthen your independent forecasting instincts."
        )
    }
