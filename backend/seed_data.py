"""
Seed Data Generator for AI Learning Partner 360
MBA Business Forecasting (SB6202)
Contains:
1. Exact syllabus hierarchy (RV University SOB)
2. 25 Diagnostic Assessment Questions
3. 5 Realistic Business Datasets
4. Demo Student & Demo Faculty profiles with realistic analytics
5. Interventions & Misconceptions
"""
import csv
import json
import math
import os
import unicodedata
import numpy as np
import pandas as pd
from datetime import datetime
from sqlalchemy import func
from database import (
    SessionLocal, init_db, User, Course, Module, Topic, SubTopic, CourseOutcome,
    Question, StudentMastery, MasteryHistory, Misconception, ForecastDataset,
    FacultyIntervention, IndependenceSession, DiagnosticAttempt
)
from auth import hash_password, verify_password

# Roster with real logins is never committed: local backend/users.csv, or a Render Secret File.
ROSTER_PATHS = [
    os.getenv("ROSTER_CSV", ""),
    "/etc/secrets/users.csv",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.csv"),
]
DEMO_USERNAMES = ["demostudent", "demofaculty", "demoadmin"]
ROSTER_ROLES = {"student": "student", "faculty": "faculty", "admin": "admin", "dean": "admin"}


def load_roster():
    """Creates/updates accounts from the roster CSV (name,email,password,role,status,usn).
    Inactive rows lose their password. Demo accounts can't log in in production, and once a real
    roster exists they are retired (role 'retired') so they drop out of every student/faculty/dean list."""
    db = SessionLocal()
    try:
        if os.getenv("ENVIRONMENT") == "production":
            db.query(User).filter(User.username.in_(DEMO_USERNAMES)).update(
                {User.hashed_password: ""}, synchronize_session=False
            )
        path = next((p for p in ROSTER_PATHS if p and os.path.exists(p)), None)
        if not path:
            print("WARNING: no roster CSV found; no new accounts loaded.")
            db.commit()
            return
        db.query(User).filter(User.username.in_(DEMO_USERNAMES)).update(
            {User.hashed_password: "", User.role: "retired"}, synchronize_session=False
        )
        # Seeded sample interventions carry invented cohort statistics; real ones (triggered by faculty) have no pre_mastery.
        db.query(FacultyIntervention).filter(FacultyIntervention.pre_mastery.is_not(None)).delete(synchronize_session=False)
        with open(path, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                email = (row.get("email") or "").strip().lower()
                role = ROSTER_ROLES.get((row.get("role") or "").strip().lower())
                if not email or not role:
                    print(f"WARNING: skipping roster row with bad email/role: {row.get('email')!r}")
                    continue
                user = db.query(User).filter(func.lower(User.email) == email).first()
                if not user:
                    user = User(email=email, username=((row.get("usn") or "").strip() or email.split("@")[0]).lower())
                    db.add(user)
                user.full_name = row["name"].strip()
                user.role = role
                password = row["password"].strip()
                if (row.get("status") or "active").strip().lower() != "active":
                    user.hashed_password = ""
                elif not verify_password(password, user.hashed_password or ""):
                    user.hashed_password = hash_password(password)
        db.commit()
    finally:
        db.close()

def generate_sample_datasets():
    """Generates 5 realistic MBA business forecasting time-series datasets."""
    datasets = []

    # 1. Monthly Retail Sales (48 months: Jan 2021 to Dec 2024)
    # Pattern: Baseline ~1000 + Linear Trend (+15/month) + Annual Seasonality (Nov/Dec holiday spikes) + Random Noise
    np.random.seed(42)
    retail_dates = pd_date_range = [f"2021-{m:02d}-01" for m in range(1, 13)] + \
                                   [f"2022-{m:02d}-01" for m in range(1, 13)] + \
                                   [f"2023-{m:02d}-01" for m in range(1, 13)] + \
                                   [f"2024-{m:02d}-01" for m in range(1, 13)]
    retail_records = []
    base = 1000.0
    for idx, dt in enumerate(retail_dates):
        month = (idx % 12) + 1
        trend = idx * 18.5
        # Seasonal multiplier: summer bump, massive Nov/Dec holiday spike
        seasonal_mult = 1.0
        if month in [6, 7]:
            seasonal_mult = 1.15
        elif month == 11:
            seasonal_mult = 1.45
        elif month == 12:
            seasonal_mult = 1.65
        elif month in [1, 2]:
            seasonal_mult = 0.85

        noise = np.random.normal(0, 35)
        sales = round((base + trend) * seasonal_mult + noise, 1)
        retail_records.append({"date": dt, "sales": sales, "month": month, "trend_index": idx + 1})

    datasets.append({
        "name": "Retail Monthly Sales",
        "category": "Retail & Consumer",
        "description": "48 months of multi-store departmental retail revenue displaying pronounced upward secular trend and heavy Q4 holiday seasonality.",
        "time_col": "date",
        "target_col": "sales",
        "feature_cols_json": json.dumps(["month", "trend_index"]),
        "frequency": "Monthly",
        "data_json": json.dumps(retail_records)
    })

    # 2. FMCG Product Demand (52 weekly periods)
    # Pattern: High volume staple food product with price fluctuations and promotional discount weeks
    fmcg_records = []
    base_fmcg = 5000.0
    for week in range(1, 53):
        dt = f"2024-W{week:02d}"
        price = 25.0 if week not in [10, 11, 24, 25, 42, 43, 50] else 19.99
        promo = 1 if price < 22 else 0
        elasticity_boost = 1800.0 if promo == 1 else 0.0
        noise = np.random.normal(0, 120)
        demand = round(base_fmcg + elasticity_boost - (price - 25.0) * 80 + noise, 1)
        fmcg_records.append({"week": dt, "demand": demand, "price": price, "promotion_active": promo})

    datasets.append({
        "name": "FMCG Product Demand",
        "category": "Fast Moving Consumer Goods",
        "description": "52 weeks of packaged food inventory demand capturing consumer price sensitivity and deep promotional discount surges.",
        "time_col": "week",
        "target_col": "demand",
        "feature_cols_json": json.dumps(["price", "promotion_active"]),
        "frequency": "Weekly",
        "data_json": json.dumps(fmcg_records)
    })

    # 3. Hotel Room Occupancy (36 months: Jan 2022 to Dec 2024)
    # Pattern: Vacation destination hotel with May-July summer peak and sharp winter off-season
    hotel_records = []
    hotel_dates = [f"2022-{m:02d}-01" for m in range(1, 13)] + \
                  [f"2023-{m:02d}-01" for m in range(1, 13)] + \
                  [f"2024-{m:02d}-01" for m in range(1, 13)]
    for idx, dt in enumerate(hotel_dates):
        month = (idx % 12) + 1
        # Occupancy rate percentage
        if month in [5, 6, 7]:
            occ = 88.0 + np.random.normal(0, 3.5)
        elif month in [12, 1]:
            occ = 42.0 + np.random.normal(0, 4.0)
        else:
            occ = 64.0 + np.random.normal(0, 4.5)
        occ = max(15.0, min(99.0, round(occ, 1)))
        adr = round(120.0 + (occ * 1.8) + np.random.normal(0, 5), 1)  # Average daily rate
        hotel_records.append({"date": dt, "occupancy_rate": occ, "average_daily_rate": adr, "month": month})

    datasets.append({
        "name": "Hotel Occupancy Rate",
        "category": "Hospitality & Travel",
        "description": "36 months of luxury resort room occupancy rates displaying cyclical vacation patterns and dynamic ADR pricing.",
        "time_col": "date",
        "target_col": "occupancy_rate",
        "feature_cols_json": json.dumps(["average_daily_rate", "month"]),
        "frequency": "Monthly",
        "data_json": json.dumps(hotel_records)
    })

    # 4. E-Commerce Order Volume (36 months)
    # Pattern: Fast-scaling e-commerce marketplace with exponential adoption trend and Mega Sale spikes
    ecom_records = []
    base_orders = 12000.0
    for idx, dt in enumerate(hotel_dates):
        month = (idx % 12) + 1
        growth = (1.03) ** idx  # 3% monthly compounding growth
        sale_spike = 1.6 if month in [10, 11] else 1.0  # Festive mega-sales
        noise = np.random.normal(0, 400)
        orders = round(base_orders * growth * sale_spike + noise, 0)
        marketing_spend_k = round(20 + (idx * 1.5) + (35 if sale_spike > 1.2 else 0), 1)
        ecom_records.append({"date": dt, "orders": orders, "marketing_spend_k": marketing_spend_k, "month": month})

    datasets.append({
        "name": "E-Commerce Order Volume",
        "category": "Digital Commerce",
        "description": "36 months of e-commerce fulfillment orders showing rapid platform scaling and mega festive sale spikes.",
        "time_col": "date",
        "target_col": "orders",
        "feature_cols_json": json.dumps(["marketing_spend_k", "month"]),
        "frequency": "Monthly",
        "data_json": json.dumps(ecom_records)
    })

    # 5. Advertising Spend vs Sales (36 months multivariate)
    # Pattern: Sales driven by Digital Ad Spend, TV Ad Spend, and Unit Price with lag effects
    ad_records = []
    for idx, dt in enumerate(hotel_dates):
        digital_spend = round(40.0 + idx * 1.8 + np.random.normal(0, 6), 1)
        tv_spend = round(70.0 + np.sin(idx / 3.0) * 15 + np.random.normal(0, 8), 1)
        unit_price = 45.0 if idx < 18 else 49.0
        # Sales formula: baseline + 3.2*digital + 1.8*tv - 12*(price-45) + noise
        sales_vol = round(350.0 + (3.2 * digital_spend) + (1.8 * tv_spend) - (12.0 * (unit_price - 45.0)) + np.random.normal(0, 20), 1)
        ad_records.append({
            "date": dt,
            "sales_volume": sales_vol,
            "digital_ad_spend": digital_spend,
            "tv_ad_spend": tv_spend,
            "unit_price": unit_price
        })

    datasets.append({
        "name": "Advertising Spend vs Sales",
        "category": "Marketing Analytics",
        "description": "36 months of multivariate market data tracking the relative impact of digital marketing vs broadcast TV advertising on top-line revenue.",
        "time_col": "date",
        "target_col": "sales_volume",
        "feature_cols_json": json.dumps(["digital_ad_spend", "tv_ad_spend", "unit_price"]),
        "frequency": "Monthly",
        "data_json": json.dumps(ad_records)
    })

    return datasets


def generate_diagnostic_questions(module_ids, topic_ids):
    """
    Creates 25 thorough questions covering all 5 Modules of the RV University SB6202 syllabus.
    Includes MCQ, numerical calculations, conceptual, model-selection, and business interpretation.
    """
    questions = [
        # Module 1: Introduction to Forecasting & Accuracy Measures (Q1 to Q5)
        {
            "module_id": module_ids[1],
            "topic_id": topic_ids["Forecast Accuracy: MAE, MSE, RMSE, MAPE"],
            "course_outcome_code": "CO1",
            "question_text": "In a quarterly revenue forecast, the actual sales values were [100, 120, 150] and the model forecasts were [110, 115, 140]. What is the Mean Absolute Error (MAE) of this forecast?",
            "question_type": "numerical",
            "options_json": json.dumps(["5.0", "8.33", "10.0", "12.5"]),
            "correct_answer": "8.33",
            "explanation": "Absolute errors are: |100 - 110| = 10, |120 - 115| = 5, |150 - 140| = 10. The MAE is (10 + 5 + 10) / 3 = 25 / 3 = 8.33.",
            "difficulty": "Intermediate",
            "blooms_level": "Apply",
            "category": "calculation",
            "quiz_stage": "pre"
        },
        {
            "module_id": module_ids[1],
            "topic_id": topic_ids["Forecast Accuracy: MAE, MSE, RMSE, MAPE"],
            "course_outcome_code": "CO1",
            "question_text": "An executive supply chain dashboard shows a Mean Absolute Percentage Error (MAPE) of undefined / infinite error during a specific product line audit. What is the most probable cause of this mathematical failure?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "The forecasted values were all negative.",
                "Actual demand in one or more periods was zero, causing division by zero in |(y - y_hat)/y|.",
                "The time series has non-zero autocorrelation.",
                "The model was evaluated using in-sample instead of out-of-sample data."
            ]),
            "correct_answer": "Actual demand in one or more periods was zero, causing division by zero in |(y - y_hat)/y|.",
            "explanation": "The formula for MAPE divides by the actual value y_t. When actual demand is zero or near zero, the denominator produces a division by zero or severely distorted percentage values.",
            "difficulty": "Foundation",
            "blooms_level": "Understand",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[1],
            "topic_id": topic_ids["Role of Forecasting in Managerial Planning and Control"],
            "course_outcome_code": "CO1",
            "question_text": "Which forecasting time horizon is typically utilized by MBA corporate executives for capital budgeting, facility location decisions, and strategic multi-year capacity planning?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "Short-term forecast (1 to 30 days)",
                "Medium-term forecast (1 to 6 months)",
                "Long-term forecast (2 to 5+ years)",
                "Immediate real-time dispatch forecast"
            ]),
            "correct_answer": "Long-term forecast (2 to 5+ years)",
            "explanation": "Long-term forecasting (typically 2 to 5 years or more) governs structural strategic decisions such as new factory construction, technology investments, and merger planning.",
            "difficulty": "Foundation",
            "blooms_level": "Remember",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[1],
            "topic_id": topic_ids["Forecast Accuracy: MAE, MSE, RMSE, MAPE"],
            "course_outcome_code": "CO1",
            "question_text": "When comparing two demand forecasting models for an aerospace manufacturing firm where a severe stockout triggers massive contractual liquidated damages, which metric should be prioritized to penalize large errors most severely?",
            "question_type": "model_selection",
            "options_json": json.dumps(["Mean Absolute Error (MAE)", "Root Mean Squared Error (RMSE)", "Mean Percentage Error (MPE)", "R-squared"]),
            "correct_answer": "Root Mean Squared Error (RMSE)",
            "explanation": "Because RMSE squares the error terms prior to averaging, it disproportionately penalizes large outlier forecasting errors compared to linear MAE.",
            "difficulty": "Application",
            "blooms_level": "Evaluate",
            "category": "model_selection"
        },
        {
            "module_id": module_ids[1],
            "topic_id": topic_ids["Forecasting Process: Steps and Challenges"],
            "course_outcome_code": "CO1",
            "question_text": "In the formal business forecasting process, what critical step must occur immediately after determining the forecasting objective and before model selection?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "Deploying predictions to production ERP",
                "Data collection, cleaning, and time series pattern identification",
                "Hyperparameter tuning of XGBoost",
                "Publishing the annual shareholder report"
            ]),
            "correct_answer": "Data collection, cleaning, and time series pattern identification",
            "explanation": "The proper systematic sequence is: Define Objective -> Data Collection & Cleaning -> Pattern Identification (Trend/Seasonality) -> Model Selection -> Fitting -> Validation -> Implementation.",
            "difficulty": "Foundation",
            "blooms_level": "Remember",
            "category": "conceptual"
        },

        # Module 2: Classical Forecasting Techniques (Q6 to Q10)
        {
            "module_id": module_ids[2],
            "topic_id": topic_ids["Moving Average Method"],
            "course_outcome_code": "CO2",
            "question_text": "Monthly sales for the past 4 months were: Month 1: 200, Month 2: 240, Month 3: 220, Month 4: 260. Using a 3-month simple moving average, what is the forecasted sales for Month 5?",
            "question_type": "numerical",
            "options_json": json.dumps(["230", "240", "250", "260"]),
            "correct_answer": "240",
            "explanation": "The 3-month moving average for Month 5 averages the most recent three periods (Months 2, 3, 4): (240 + 220 + 260) / 3 = 720 / 3 = 240.",
            "difficulty": "Foundation",
            "blooms_level": "Apply",
            "category": "calculation"
        },
        {
            "module_id": module_ids[2],
            "topic_id": topic_ids["Simple exponential Smoothing(ES)"],
            "course_outcome_code": "CO2",
            "question_text": "In Simple Exponential Smoothing (SES), what happens to the forecast's responsiveness to recent changes as the smoothing constant alpha approaches 1.0?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "The forecast becomes heavily smoothed and ignores recent observations.",
                "The forecast becomes almost identical to the naive method, placing nearly 100% weight on the single most recent observation.",
                "The model automatically estimates a quadratic trend.",
                "The smoothing weight is distributed equally across all historical periods."
            ]),
            "correct_answer": "The forecast becomes almost identical to the naive method, placing nearly 100% weight on the single most recent observation.",
            "explanation": "The SES equation is F_{t+1} = alpha * y_t + (1 - alpha) * F_t. When alpha = 1.0, F_{t+1} = y_t, which is the naive last-value forecast.",
            "difficulty": "Intermediate",
            "blooms_level": "Understand",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[2],
            "topic_id": topic_ids["Double Exponential Smoothing(SES)"],
            "course_outcome_code": "CO2",
            "question_text": "A retail manager observes that weekly sales have been consistently growing at an average of 40 units per week over the last 6 months. Why is Simple Exponential Smoothing (SES) inadequate for this dataset?",
            "question_type": "interpretation",
            "options_json": json.dumps([
                "SES cannot process weekly timestamps.",
                "SES exhibits a systematic downward lagging bias when a persistent trend is present.",
                "SES requires stationary errors with zero variance.",
                "SES produces imaginary numbers when sales exceed 1000 units."
            ]),
            "correct_answer": "SES exhibits a systematic downward lagging bias when a persistent trend is present.",
            "explanation": "Simple Exponential Smoothing assumes a stationary level without trend. When an upward trend exists, SES constantly lags behind actual values. Holt's Double Exponential Smoothing is needed to track the trend.",
            "difficulty": "Intermediate",
            "blooms_level": "Analyse",
            "category": "interpretation"
        },
        {
            "module_id": module_ids[2],
            "topic_id": topic_ids["HOLT-WINTER model"],
            "course_outcome_code": "CO2",
            "question_text": "Which classical smoothing model incorporates three distinct smoothing equations for Level (alpha), Trend (beta), and Seasonal Variations (gamma)?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "Naive Seasonal Method",
                "Simple Exponential Smoothing",
                "Holt's Linear Trend Model",
                "Holt-Winters Triple Exponential Smoothing"
            ]),
            "correct_answer": "Holt-Winters Triple Exponential Smoothing",
            "explanation": "Holt-Winters extends exponential smoothing with three smoothing parameters: alpha for the level, beta for trend, and gamma for the seasonal component.",
            "difficulty": "Foundation",
            "blooms_level": "Remember",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[2],
            "topic_id": topic_ids["Data Patterns: Trend, Seasonality, Cyclical, and Random"],
            "course_outcome_code": "CO2",
            "question_text": "What is the primary difference between a Seasonal pattern and a Cyclical pattern in business time series analytics?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "Seasonal patterns have fixed, known durations tied to the calendar; cyclical patterns have variable durations tied to broader macroeconomic business cycles.",
                "Seasonal patterns only occur in agriculture; cyclical patterns only occur in finance.",
                "Seasonal patterns are strictly non-linear; cyclical patterns are always linear.",
                "Seasonal patterns have zero variance; cyclical patterns have infinite variance."
            ]),
            "correct_answer": "Seasonal patterns have fixed, known durations tied to the calendar; cyclical patterns have variable durations tied to broader macroeconomic business cycles.",
            "explanation": "Seasonality repeats at known fixed intervals (e.g. 12 months, 4 quarters, 7 days). Cyclical patterns fluctuate with economic booms and recessions and have irregular, multi-year durations.",
            "difficulty": "Intermediate",
            "blooms_level": "Understand",
            "category": "conceptual"
        },

        # Module 3: Univariate Time Series Models (ARIMA/SARIMA) (Q11 to Q16)
        {
            "module_id": module_ids[3],
            "topic_id": topic_ids["Stationarity and Unit Root Tests (ADF Test)"],
            "course_outcome_code": "CO3",
            "question_text": "You execute an Augmented Dickey-Fuller (ADF) test on a company's raw quarterly sales data. The test returns an ADF test statistic of -1.45 with a p-value of 0.558 (5% critical value is -2.88). What is the correct statistical conclusion?",
            "question_type": "interpretation",
            "options_json": json.dumps([
                "Reject the null hypothesis; the series is stationary.",
                "Fail to reject the null hypothesis; the series is non-stationary and has a unit root.",
                "The model is fully calibrated and ARIMA(0,0,0) should be fitted.",
                "The test is inconclusive because p-values must always be greater than 0.95."
            ]),
            "correct_answer": "Fail to reject the null hypothesis; the series is non-stationary and has a unit root.",
            "explanation": "In the ADF test, H0 states that the series has a unit root (non-stationary). Since p-value (0.558) > 0.05 and the test statistic (-1.45) is greater than the critical value (-2.88), we fail to reject H0.",
            "difficulty": "Intermediate",
            "blooms_level": "Evaluate",
            "category": "interpretation"
        },
        {
            "module_id": module_ids[3],
            "topic_id": topic_ids["Differencing a time series, Lags"],
            "course_outcome_code": "CO3",
            "question_text": "If a non-stationary time series exhibits a strong linear upward trend, what standard mathematical transformation is applied in Box-Jenkins methodology to achieve stationarity in the mean?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "Taking the exponential of each value",
                "First-order differencing: y'_t = y_t - y_{t-1}",
                "Squaring the time series values",
                "Multiplying the series by a random white-noise vector"
            ]),
            "correct_answer": "First-order differencing: y'_t = y_t - y_{t-1}",
            "explanation": "First-order differencing (d=1) subtracts the previous observation from the current observation, effectively removing deterministic and stochastic linear trends.",
            "difficulty": "Foundation",
            "blooms_level": "Understand",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[3],
            "topic_id": topic_ids["Autocorrelation and Partial Autocorrelation (ACF, PACF)"],
            "course_outcome_code": "CO3",
            "question_text": "After first-order differencing, you examine the correlograms: the PACF displays a sharp, statistically significant spike at lag 1 and cuts off to zero thereafter, while the ACF decays exponentially. What Box-Jenkins model is indicated?",
            "question_type": "model_selection",
            "options_json": json.dumps(["ARIMA(0, 1, 1)", "ARIMA(1, 1, 0)", "ARIMA(0, 1, 0)", "SARIMA(0, 1, 2)"]),
            "correct_answer": "ARIMA(1, 1, 0)",
            "explanation": "A sharp cut-off in the PACF at lag p combined with exponential tailing-off in the ACF indicates an Autoregressive process of order p. With d=1 differencing, this represents an ARIMA(1,1,0).",
            "difficulty": "Application",
            "blooms_level": "Analyse",
            "category": "model_selection"
        },
        {
            "module_id": module_ids[3],
            "topic_id": topic_ids["Moving Average process MA(q)"],
            "course_outcome_code": "CO3",
            "question_text": "In the notation ARIMA(p, d, q), what does the parameter 'q' represent?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "The number of seasonal quarters in a fiscal year",
                "The order of the autoregressive lag terms",
                "The order of the moving average of past random error shocks (theta)",
                "The number of times the series was differenced"
            ]),
            "correct_answer": "The order of the moving average of past random error shocks (theta)",
            "explanation": "In ARIMA(p,d,q), p is the autoregressive order, d is the degree of differencing, and q is the moving average order representing dependencies on past shock residuals.",
            "difficulty": "Foundation",
            "blooms_level": "Remember",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[3],
            "topic_id": topic_ids["Seasonal ARIMA (SARIMA)"],
            "course_outcome_code": "CO3",
            "question_text": "In a monthly retail business forecasting model denoted as SARIMA(1,1,1)x(1,1,1)_12, what does the subscript '12' denote?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "A forecast horizon of 12 years",
                "The length of the seasonal cycle (12 monthly periods per year)",
                "The minimum number of data points needed to fit the model",
                "A 12% confidence interval buffer"
            ]),
            "correct_answer": "The length of the seasonal cycle (12 monthly periods per year)",
            "explanation": "The seasonal period 's' (here 12) specifies the recurring span of the seasonal cycle, indicating annual seasonality across the 12 calendar months.",
            "difficulty": "Foundation",
            "blooms_level": "Understand",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[3],
            "topic_id": topic_ids["Autocorrelation and Partial Autocorrelation (ACF, PACF)"],
            "course_outcome_code": "CO3",
            "question_text": "A student analyzes the residual diagnostic plot of a fitted ARIMA(2,1,1) model and observes that the ACF of the residuals exhibits statistically significant spikes at lags 1 and 2. What does this indicate?",
            "question_type": "interpretation",
            "options_json": json.dumps([
                "The model is optimal and ready for management sign-off.",
                "The residuals are white noise, confirming zero autocorrelation.",
                "The residuals still contain unmodeled autocorrelation; the model parameters are inadequate.",
                "The series has negative variance."
            ]),
            "correct_answer": "The residuals still contain unmodeled autocorrelation; the model parameters are inadequate.",
            "explanation": "If model residuals show significant autocorrelation, the model has failed to capture all systematic temporal structure, violating the white-noise assumption.",
            "difficulty": "Advanced",
            "blooms_level": "Evaluate",
            "category": "interpretation"
        },

        # Module 4: Multivariate Time Series Models (VAR/SARIMAX) (Q17 to Q20)
        {
            "module_id": module_ids[4],
            "topic_id": topic_ids["VAR model"],
            "course_outcome_code": "CO4",
            "question_text": "When is a Vector Autoregression (VAR) model preferred over a set of independent univariate ARIMA models in corporate forecasting?",
            "question_type": "model_selection",
            "options_json": json.dumps([
                "When there is only one time series available with no external factors.",
                "When multiple endogenous time series exert simultaneous bidirectional feedback on one another over time.",
                "When the dataset contains missing values and text reviews.",
                "When the forecast horizon is strictly limited to 1 day."
            ]),
            "correct_answer": "When multiple endogenous time series exert simultaneous bidirectional feedback on one another over time.",
            "explanation": "VAR models systems of multiple endogenous time series where each variable is expressed as a linear combination of its own past lags and the past lags of all other variables.",
            "difficulty": "Intermediate",
            "blooms_level": "Understand",
            "category": "model_selection"
        },
        {
            "module_id": module_ids[4],
            "topic_id": topic_ids["SARIMAX model"],
            "course_outcome_code": "CO4",
            "question_text": "In the acronym SARIMAX, what does the suffix 'X' signify?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "Extreme value theory constraints",
                "Exogenous explanatory regressor variables (e.g. price discounts, marketing spend)",
                "Cross-sectional validation folds",
                "Exponential smoothing parameters"
            ]),
            "correct_answer": "Exogenous explanatory regressor variables (e.g. price discounts, marketing spend)",
            "explanation": "The 'X' in SARIMAX denotes exogenous variables—external factors outside the univariate series that provide explanatory power for forecasting.",
            "difficulty": "Foundation",
            "blooms_level": "Remember",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[4],
            "topic_id": topic_ids["VAR model"],
            "course_outcome_code": "CO4",
            "question_text": "A marketing analytics team proves that digital ad spend 'Granger-causes' sales revenue with p = 0.01. Does this result prove that increasing digital ad spend will directly cause sales to grow?",
            "question_type": "interpretation",
            "options_json": json.dumps([
                "Yes, Granger causality proves true physical and economic cause-and-effect.",
                "No; Granger causality only tests for statistical precedence (whether past ad spend improves the forecast of sales beyond past sales alone), not true structural causality.",
                "Yes, provided the R-squared of the regression is greater than 0.90.",
                "No, because VAR models are only valid for non-financial variables."
            ]),
            "correct_answer": "No; Granger causality only tests for statistical precedence (whether past ad spend improves the forecast of sales beyond past sales alone), not true structural causality.",
            "explanation": "Granger causality measures temporal precedence and informational utility. It does not establish true economic causality, as third-party confounding variables may drive both series.",
            "difficulty": "Advanced",
            "blooms_level": "Evaluate",
            "category": "interpretation"
        },
        {
            "module_id": module_ids[4],
            "topic_id": topic_ids["VARIMAX model"],
            "course_outcome_code": "CO4",
            "question_text": "What fundamental condition must all individual time series satisfy before estimating a standard unrestricted Vector Autoregression (VAR) model?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "All series must be non-stationary with exponential trends.",
                "All series must be stationary (or transformed to stationarity via differencing) to avoid spurious regression.",
                "All series must have zero variance.",
                "All variables must follow a uniform distribution."
            ]),
            "correct_answer": "All series must be stationary (or transformed to stationarity via differencing) to avoid spurious regression.",
            "explanation": "Standard VAR requires that all included series are stationary (or cointegrated in a VECM framework) to prevent spurious regression relationships.",
            "difficulty": "Intermediate",
            "blooms_level": "Understand",
            "category": "conceptual"
        },

        # Module 5: Supervised & Machine Learning Forecasting (Q21 to Q25)
        {
            "module_id": module_ids[5],
            "topic_id": topic_ids["Gradient Boosting with XG Boost"],
            "course_outcome_code": "CO5",
            "question_text": "How is a time series problem reformatted so that supervised machine learning algorithms like Random Forest or XGBoost can be applied?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "By randomly shuffling the dataset rows to ensure independent distributions",
                "By creating lagged feature columns (e.g. y_{t-1}, y_{t-2}), rolling window statistics, and calendar indicators",
                "By removing the timestamp column and treating each observation as an isolated cluster",
                "By replacing all numerical values with categorical labels"
            ]),
            "correct_answer": "By creating lagged feature columns (e.g. y_{t-1}, y_{t-2}), rolling window statistics, and calendar indicators",
            "explanation": "Supervised ML algorithms require a feature matrix X and target y. In time series, X is constructed from historical lagged values (lag_1, lag_2), rolling means/stds, and date features.",
            "difficulty": "Intermediate",
            "blooms_level": "Understand",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[5],
            "topic_id": topic_ids["Gradient Boosting with XG Boost"],
            "course_outcome_code": "CO5",
            "question_text": "Why is standard random k-fold cross-validation strictly invalid for evaluating time series machine learning forecasting models?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "K-fold cross-validation requires too much memory.",
                "Random shuffling violates temporal ordering, causing future data leakage into the training set (lookahead bias).",
                "Decision trees cannot compute folds.",
                "Time series metrics only support single-observation tests."
            ]),
            "correct_answer": "Random shuffling violates temporal ordering, causing future data leakage into the training set (lookahead bias).",
            "explanation": "Randomly partitioning time series data allows future observations to predict the past, causing fatal lookahead data leakage. Time series must use rolling origin or expanding window validation.",
            "difficulty": "Intermediate",
            "blooms_level": "Analyse",
            "category": "conceptual"
        },
        {
            "module_id": module_ids[5],
            "topic_id": topic_ids["Random Forest"],
            "course_outcome_code": "CO5",
            "question_text": "What is a known inherent limitation of tree-based ensemble models (like Random Forest and Decision Trees) when forecasting a time series that exhibits a strong, sustained linear upward trend?",
            "question_type": "interpretation",
            "options_json": json.dumps([
                "They cannot compute split criteria on continuous target values.",
                "Tree models split data into historical feature intervals and cannot extrapolate predictions beyond the maximum target value seen in the training data.",
                "They run infinitely when trend is present.",
                "They require data to be normally distributed."
            ]),
            "correct_answer": "Tree models split data into historical feature intervals and cannot extrapolate predictions beyond the maximum target value seen in the training data.",
            "explanation": "Tree-based models predict the average of leaf nodes. Therefore, they cannot predict a value higher than the maximum value in their training history, making linear trend extrapolation difficult without detrending.",
            "difficulty": "Advanced",
            "blooms_level": "Evaluate",
            "category": "interpretation"
        },
        {
            "module_id": module_ids[5],
            "topic_id": topic_ids["Gradient Boosting with XG Boost"],
            "course_outcome_code": "CO5",
            "question_text": "An e-commerce forecasting project yields the following results on the test set:\n- SARIMA: RMSE = 28.4, MAPE = 6.2%\n- XGBoost: RMSE = 22.1, MAPE = 4.8%\nHowever, the executive risk committee requires full transparency into the exact mathematical model equation for regulatory audit. Which model should the analytics director recommend for the business report?",
            "question_type": "case",
            "options_json": json.dumps([
                "XGBoost only, because lowest error is the only criterion that matters in business.",
                "SARIMA as the baseline primary model for audited regulatory compliance, accompanied by XGBoost as an operational decision support benchmark.",
                "A Naive 1-day forecast.",
                "Abandon both models and use subjective executive guessing."
            ]),
            "correct_answer": "SARIMA as the baseline primary model for audited regulatory compliance, accompanied by XGBoost as an operational decision support benchmark.",
            "explanation": "In MBA managerial practice, model selection balances accuracy against interpretability, complexity, and audit risk. Recommending SARIMA for transparent audit while using XGBoost for internal operations provides the optimal synthesis.",
            "difficulty": "Challenge",
            "blooms_level": "Evaluate",
            "category": "model_selection"
        },
        {
            "module_id": module_ids[5],
            "topic_id": topic_ids["Linear Regression"],
            "course_outcome_code": "CO5",
            "question_text": "When using multiple linear regression for time series forecasting, what diagnostic test is standardly utilized to detect whether the residuals suffer from first-order serial correlation?",
            "question_type": "mcq",
            "options_json": json.dumps([
                "Durbin-Watson Test",
                "Student's t-test",
                "Pearson Correlation Coefficient",
                "ANOVA F-test"
            ]),
            "correct_answer": "Durbin-Watson Test",
            "explanation": "The Durbin-Watson statistic tests for first-order autocorrelation in regression residuals (values around 2 indicate zero autocorrelation; values near 0 indicate positive autocorrelation).",
            "difficulty": "Intermediate",
            "blooms_level": "Understand",
            "category": "conceptual"
        }
    ]
    coverage_questions = {
        "Components, Types of Forecasts: Short-term, Medium-term, Long-term": [
            ("pre", "A retailer needs next week's staffing forecast. Which horizon best fits this operational decision?", ["Short-term", "Medium-term", "Long-term", "Cyclical"], "Short-term", "Staffing for next week is an operational decision with a short forecast horizon."),
            ("post", "A manufacturer is choosing a site for a plant expected to operate for ten years. Which horizon should guide the forecast?", ["Short-term", "Medium-term", "Long-term", "Seasonal only"], "Long-term", "Facility location and capacity planning require long-term forecasts."),
        ],
        "Forecasting time series data with seasonal variation": [
            ("pre", "A monthly retailer sees sales rise every December. What pattern is this?", ["Seasonality", "Random noise", "Structural break", "Autocorrelation only"], "Seasonality", "A pattern recurring at a fixed calendar interval is seasonal."),
            ("post", "A quarterly series repeats a similar peak every fourth quarter. Which model component should capture this?", ["Seasonal component with period 4", "Linear trend only", "White noise", "One-time intervention"], "Seasonal component with period 4", "Quarterly annual seasonality repeats every four observations."),
        ],
        "Autoregressive Process – AR(p)": [
            ("pre", "In an AR(1) model, which observation directly predicts the current value?", ["The previous value y(t-1)", "Only future values", "The current white-noise term alone", "A seasonal index only"], "The previous value y(t-1)", "An AR(1) process uses one lag of the series."),
            ("post", "A stationary series has a PACF that cuts off after lag 2 while its ACF tails off. Which model is suggested?", ["AR(2)", "MA(2)", "White noise", "Random walk"], "AR(2)", "For an autoregressive process, the PACF typically cuts off at order p."),
        ],
        "ARMA process": [
            ("pre", "What two structures are combined in an ARMA model for a stationary series?", ["Lagged values and lagged shocks", "Trend and external regressors only", "Seasonal differences and trees", "Moving averages of levels only"], "Lagged values and lagged shocks", "ARMA combines autoregressive terms with moving-average error terms."),
            ("post", "A stationary series has ACF and PACF that both tail off. Which model family is a reasonable candidate?", ["ARMA", "Simple random walk", "Linear regression without lags", "Seasonal naive only"], "ARMA", "When both correlation functions tail off, a mixed ARMA model may be appropriate."),
        ],
        "Decision Tree": [
            ("pre", "How does a regression decision tree produce a forecast for an observation?", ["It follows feature-based splits to a leaf and predicts that leaf's value", "It averages every row regardless of features", "It estimates only a seasonal index", "It integrates the series until stationary"], "It follows feature-based splits to a leaf and predicts that leaf's value", "A regression tree routes observations through splits and predicts from the terminal leaf."),
            ("post", "A time-series decision tree performs well in training but poorly on later dates. Which change most directly limits overfitting?", ["Restrict tree depth or increase minimum leaf size", "Randomly shuffle time before splitting", "Add more unrestricted branches", "Remove the chronological test set"], "Restrict tree depth or increase minimum leaf size", "Tree depth and leaf-size constraints regularize the model; evaluation should preserve time order."),
        ],
        "KNN model": [
            ("pre", "How does K-nearest neighbors regression generate a prediction?", ["It averages target values of nearby training observations", "It estimates AR coefficients by maximum likelihood", "It partitions data into one global mean", "It fits a seasonal difference automatically"], "It averages target values of nearby training observations", "KNN predicts from target values associated with the closest feature vectors."),
            ("post", "Why should numeric lag features usually be scaled before using distance-based KNN?", ["Large-scale features can otherwise dominate distance calculations", "Scaling creates temporal order", "KNN only accepts categorical variables", "Scaling removes all autocorrelation"], "Large-scale features can otherwise dominate distance calculations", "Distance calculations are sensitive to feature units, so scaling prevents large-valued features from dominating."),
        ],
    }
    module_for_topic = {
        "Components, Types of Forecasts: Short-term, Medium-term, Long-term": 1,
        "Forecasting time series data with seasonal variation": 2,
        "Autoregressive Process – AR(p)": 3,
        "ARMA process": 3,
        "Decision Tree": 5,
        "KNN model": 5,
    }
    for topic_name, items in coverage_questions.items():
        topic_id = topic_ids[topic_name]
        module_number = module_for_topic[topic_name]
        module_id = module_ids[module_number]
        for stage, prompt, options, answer, explanation in items:
            questions.append({
                "module_id": module_id,
                "topic_id": topic_id,
                "course_outcome_code": f"CO{module_number}",
                "question_text": prompt,
                "question_type": "mcq",
                "options_json": json.dumps(options),
                "correct_answer": answer,
                "explanation": explanation,
                "difficulty": "Foundation" if stage == "pre" else "Application",
                "blooms_level": "Understand" if stage == "pre" else "Apply",
                "category": "conceptual",
                "quiz_stage": stage,
            })
    return questions


def seed_database():
    """Initializes tables and populates full syllabus, questions, datasets, and demo profiles."""
    init_db()
    db = SessionLocal()

    existing_course = db.query(Course).first()
    if existing_course:
        modules = db.query(Module).filter(Module.course_id == existing_course.id).all()
        module_ids = {module.module_number: module.id for module in modules}
        topics = db.query(Topic).join(Module).filter(Module.course_id == existing_course.id).all()
        normalize = lambda value: " ".join(unicodedata.normalize("NFKC", value).replace("�", "-").split()).casefold()
        topic_ids = {normalize(topic.name): topic.id for topic in topics}
        topic_aliases = {normalize("Autoregressive Process – AR(p)"): normalize("Autoregressive Process � AR(p)")}
        topic_ids.update({canonical: topic_ids[stored] for canonical, stored in topic_aliases.items() if stored in topic_ids})
        expected_topics = {name: module for module, name in [
            (1, "Nature and Importance of Forecasting"),
            (1, "Components, Types of Forecasts: Short-term, Medium-term, Long-term"),
            (1, "Forecasting Process: Steps and Challenges"),
            (1, "Role of Forecasting in Managerial Planning and Control"),
            (1, "Forecast Accuracy: MAE, MSE, RMSE, MAPE"),
            (2, "Data Patterns: Trend, Seasonality, Cyclical, and Random"),
            (2, "Moving Average Method"),
            (2, "Simple exponential Smoothing(ES)"),
            (2, "Double Exponential Smoothing(SES)"),
            (2, "HOLT-WINTER model"),
            (2, "Forecasting time series data with seasonal variation"),
            (3, "Autocorrelation and Partial Autocorrelation (ACF, PACF)"),
            (3, "Moving Average process MA(q)"),
            (3, "Autoregressive Process – AR(p)"),
            (3, "Stationarity and Unit Root Tests (ADF Test)"),
            (3, "Differencing a time series, Lags"),
            (3, "ARMA process"),
            (3, "ARIMA process"),
            (3, "Seasonal ARIMA (SARIMA)"),
            (4, "VAR model"),
            (4, "VARIMAX model"),
            (4, "SARIMAX model"),
            (5, "Linear Regression"),
            (5, "Decision Tree"),
            (5, "KNN model"),
            (5, "Random Forest"),
            (5, "Gradient Boosting with XG Boost"),
        ]}
        expected_topic_ids = {}
        for name, module_number in expected_topics.items():
            normalized_name = normalize(name)
            topic_id = topic_ids.get(normalized_name)
            if not topic_id and normalized_name in topic_aliases:
                topic_id = topic_ids.get(topic_aliases[normalized_name])
            if not topic_id:
                module = next((row for row in modules if row.module_number == module_number), None)
                if module:
                    topic = Topic(module_id=module.id, name=name)
                    db.add(topic)
                    db.flush()
                    topic_id = topic.id
            if topic_id:
                expected_topic_ids[name] = topic_id
        topic_ids = expected_topic_ids
        db.flush()
        existing_questions = {normalize(question.question_text) for question in db.query(Question).all()}
        additions = [
            question for question in generate_diagnostic_questions(module_ids, topic_ids)
            if normalize(question["question_text"]) not in existing_questions
        ]
        for question in additions:
            db.add(Question(**question))
        db.commit()
        db.close()
        print(f"Existing syllabus retained; added {len(additions)} missing quiz questions.")
        return

    print("Seeding RV University MBA SB6202 Business Forecasting Database...")

    # 1. Course Details
    course = Course(
        code="SB6202",
        title="Business Forecasting",
        school="SOB",
        instructor="Dr Veena A",
        semester="III",
        credits=4,
        total_hours=40,
        description="RV University MBA Business Forecasting course covering traditional smoothing, univariate ARIMA/SARIMA, multivariate VAR/SARIMAX, and supervised machine learning."
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    # 2. Course Outcomes (CO1 to CO5 exact from syllabus)
    cos = [
        CourseOutcome(course_id=course.id, code="CO1", description="Explain different types of forecasts and their use in business."),
        CourseOutcome(course_id=course.id, code="CO2", description="Identify patterns in data and apply classical forecasting methods like moving average and exponential smoothing."),
        CourseOutcome(course_id=course.id, code="CO3", description="Build time series models such as ARIMA and SARIMA for forecasting."),
        CourseOutcome(course_id=course.id, code="CO4", description="Use multivariate forecasting models like VAR and SARIMAX."),
        CourseOutcome(course_id=course.id, code="CO5", description="Apply machine learning methods (like decision trees and XGBoost) for forecasting and compare with traditional models.")
    ]
    db.add_all(cos)
    db.commit()

    # 3. Modules (Modules 1 to 5 exact from syllabus)
    modules_data = [
        {"num": 1, "title": "Introduction to Forecasting", "hours": 6, "desc": "Nature and Importance of Forecasting, Components, Types of Forecasts, Forecasting Process, Role in Managerial Planning, Forecast Accuracy: MAE, MSE, RMSE, MAPE"},
        {"num": 2, "title": "Forecasting Techniques", "hours": 10, "desc": "Data Patterns: Trend, Seasonality, Cyclical, and Random, Moving Average Method, Simple exponential Smoothing(ES), Double Exponential Smoothing(SES), HOLT-WINTER model, Forecasting time series data with seasonal variation"},
        {"num": 3, "title": "Univariate Time series Models", "hours": 12, "desc": "Autocorrelation and Partial Autocorrelation (ACF, PACF), Moving Average process MA(q), Autoregressive Process AR(p), Stationarity and Unit Root Tests (ADF Test), Differencing, Lags, ARMA process, ARIMA process, Seasonal ARIMA (SARIMA)"},
        {"num": 4, "title": "Multivariate Time Series Models", "hours": 8, "desc": "VAR model, VARIMAX model, SARIMAX model"},
        {"num": 5, "title": "Supervised & Advanced Machine Leaning Models", "hours": 4, "desc": "Linear Regression, Decision Tree, KNN model, Random Forest, Gradient Boosting with XG Boost"}
    ]

    module_objs = {}
    for m in modules_data:
        mod = Module(
            course_id=course.id,
            module_number=m["num"],
            title=m["title"],
            teaching_hours=m["hours"],
            description=m["desc"]
        )
        db.add(mod)
        db.commit()
        db.refresh(mod)
        module_objs[m["num"]] = mod.id

    # 4. Topics per Module
    topics_list = [
        # Module 1
        (1, "Nature and Importance of Forecasting"),
        (1, "Components, Types of Forecasts: Short-term, Medium-term, Long-term"),
        (1, "Forecasting Process: Steps and Challenges"),
        (1, "Role of Forecasting in Managerial Planning and Control"),
        (1, "Forecast Accuracy: MAE, MSE, RMSE, MAPE"),
        # Module 2
        (2, "Data Patterns: Trend, Seasonality, Cyclical, and Random"),
        (2, "Moving Average Method"),
        (2, "Simple exponential Smoothing(ES)"),
        (2, "Double Exponential Smoothing(SES)"),
        (2, "HOLT-WINTER model"),
        (2, "Forecasting time series data with seasonal variation"),
        # Module 3
        (3, "Autocorrelation and Partial Autocorrelation (ACF, PACF)"),
        (3, "Moving Average process MA(q)"),
        (3, "Autoregressive Process – AR(p)"),
        (3, "Stationarity and Unit Root Tests (ADF Test)"),
        (3, "Differencing a time series, Lags"),
        (3, "ARMA process"),
        (3, "ARIMA process"),
        (3, "Seasonal ARIMA (SARIMA)"),
        # Module 4
        (4, "VAR model"),
        (4, "VARIMAX model"),
        (4, "SARIMAX model"),
        # Module 5
        (5, "Linear Regression"),
        (5, "Decision Tree"),
        (5, "KNN model"),
        (5, "Random Forest"),
        (5, "Gradient Boosting with XG Boost")
    ]

    topic_objs = {}
    prev_topic_id = None
    for mod_num, name in topics_list:
        top = Topic(
            module_id=module_objs[mod_num],
            name=name,
            prerequisite_id=prev_topic_id,
            description=f"Curricular topic for Module {mod_num}: {name}"
        )
        db.add(top)
        db.commit()
        db.refresh(top)
        subtopics = [
            SubTopic(topic_id=top.id, name=f"{name}: Core Concepts", order_index=1, description=f"Core principles and terminology for {name}."),
            SubTopic(topic_id=top.id, name=f"{name}: Business Application", order_index=2, description=f"Apply {name} to forecasting decisions and business cases."),
        ]
        db.add_all(subtopics)
        topic_objs[name] = top.id
        prev_topic_id = top.id

    # 5. Diagnostic Assessment Questions
    questions_data = generate_diagnostic_questions(module_objs, topic_objs)
    for q in questions_data:
        question = Question(
            module_id=q["module_id"],
            topic_id=q["topic_id"],
            course_outcome_code=q["course_outcome_code"],
            question_text=q["question_text"],
            question_type=q["question_type"],
            options_json=q["options_json"],
            correct_answer=q["correct_answer"],
            explanation=q["explanation"],
            difficulty=q["difficulty"],
            blooms_level=q["blooms_level"],
            category=q["category"],
            quiz_stage=q.get("quiz_stage", "both"),
        )
        db.add(question)
    db.commit()

    # 6. Sample Datasets
    sample_datasets = generate_sample_datasets()
    for ds in sample_datasets:
        dataset = ForecastDataset(
            name=ds["name"],
            category=ds["category"],
            description=ds["description"],
            time_col=ds["time_col"],
            target_col=ds["target_col"],
            feature_cols_json=ds["feature_cols_json"],
            frequency=ds["frequency"],
            data_json=ds["data_json"],
            is_sample=True
        )
        db.add(dataset)
    db.commit()

    # 7. Seed Users (Demo Student, Demo Faculty, Admin)
    student_user = User(
        username="demostudent",
        email="student@mbafmt.edu",
        role="student",
        full_name="John Doe (MBA Candidate)",
        hashed_password=hash_password("password")
    )
    faculty_user = User(
        username="demofaculty",
        email="faculty@mbafmt.edu",
        role="faculty",
        full_name="Dr Veena A (Course Instructor)",
        hashed_password=hash_password("password")
    )
    admin_user = User(
        username="demoadmin",
        email="admin@mbafmt.edu",
        role="admin",
        full_name="Academic Administrator",
        hashed_password=hash_password("password")
    )
    db.add_all([student_user, faculty_user, admin_user])
    db.commit()
    db.refresh(student_user)
    db.refresh(faculty_user)

    # 8. Seed Student Baseline Mastery & Profile
    # Student has completed diagnostic test with 68% overall mastery
    diag = DiagnosticAttempt(
        user_id=student_user.id,
        score_percentage=68.0,
        mastery_level="Proficient",
        module_mastery_json=json.dumps({"1": 78.0, "2": 72.0, "3": 58.0, "4": 62.0, "5": 70.0}),
        topic_mastery_json=json.dumps({
            "Forecast Accuracy: MAE, MSE, RMSE, MAPE": 85.0,
            "Moving Average Method": 80.0,
            "Simple exponential Smoothing(ES)": 75.0,
            "HOLT-WINTER model": 68.0,
            "Stationarity and Unit Root Tests (ADF Test)": 44.0,
            "Differencing a time series, Lags": 52.0,
            "ARIMA process": 54.0,
            "Seasonal ARIMA (SARIMA)": 50.0,
            "SARIMAX model": 60.0,
            "Gradient Boosting with XG Boost": 72.0
        }),
        gaps_json=json.dumps([
            "ADF Test: Failed to distinguish unit root null hypothesis from stationarity",
            "ARIMA Differencing: Applied regular differencing instead of seasonal differencing for monthly cycle",
            "Residual Autocorrelation: Interrupted diagnostic checks prematurely"
        ]),
        answers_json=json.dumps({"total": 25, "correct": 17, "incorrect": 8})
    )
    db.add(diag)

    # Seed topic mastery records
    for top_name, top_id in topic_objs.items():
        base_score = 68.0
        if "ADF" in top_name or "Unit Root" in top_name:
            base_score = 44.0
        elif "ARIMA" in top_name:
            base_score = 54.0
        elif "Moving Average" in top_name or "Forecast Accuracy" in top_name:
            base_score = 82.0

        mastery_level = "Needs Foundation" if base_score < 40 else ("Developing" if base_score < 60 else ("Proficient" if base_score < 80 else "Advanced"))
        sm = StudentMastery(
            user_id=student_user.id,
            topic_id=top_id,
            mastery_score=base_score,
            pre_score=base_score,
            post_score=base_score,
            attempts=1,
        )
        db.add(sm)

    # Seed Independence Session
    indep = IndependenceSession(
        user_id=student_user.id,
        current_level=2,
        hints_used=1,
        completed=False,
        ai_independence_score=32.0,
    )
    db.add(indep)

    # 9. Seed Faculty Interventions
    interventions = [
        FacultyIntervention(
            topic_name="Stationarity and Unit Root Tests (ADF Test)",
            module_number=3,
            issue_summary="58% of MBA cohort misinterprets the ADF p-value, wrongly concluding that p > 0.05 implies stationary data.",
            students_below_proficiency_pct=58.0,
            common_misconception="Equating high p-value with stationarity rather than failing to reject unit root non-stationarity.",
            recommended_action="Conduct a 20-minute targeted clinic on hypothesis testing logic, unit roots, and visual inspection of random walks.",
            status="Completed",
            pre_mastery=46.0,
            post_mastery=72.0,
            learning_gain=26.0
        ),
        FacultyIntervention(
            topic_name="Seasonal ARIMA (SARIMA)",
            module_number=3,
            issue_summary="42% of students apply simple first-order differencing d=1 to eliminate monthly retail seasonality.",
            students_below_proficiency_pct=42.0,
            common_misconception="Believing d=1 eliminates annual seasonal peaks without seasonal differencing D=1 at lag 12.",
            recommended_action="Hands-on Excel/Python session decomposing seasonal ACF lag spikes at intervals 12, 24, 36.",
            status="Active",
            pre_mastery=51.0,
            post_mastery=74.0,
            learning_gain=23.0
        ),
        FacultyIntervention(
            topic_name="Moving Average process MA(q)",
            module_number=3,
            issue_summary="35% of students confuse the MA(q) error-shock component of ARIMA with the moving average smoothing method.",
            students_below_proficiency_pct=35.0,
            common_misconception="Assuming MA in ARIMA calculates rolling averages of historical sales observations.",
            recommended_action="Distribute 1-page comparative reference sheet: Smoothing vs Shock Regression.",
            status="Completed",
            pre_mastery=48.0,
            post_mastery=81.0,
            learning_gain=33.0
        )
    ]
    db.add_all(interventions)

    # Seed Misconceptions
    normalize = lambda value: " ".join(unicodedata.normalize("NFKC", value).replace("�", "-").split()).casefold()
    for misc in [
        ("MISC_01", "ARIMA process", "MA in ARIMA means moving average forecasting method.", "The MA component in ARIMA refers to the moving-average error process (past white noise shocks), which is completely distinct from the simple moving average smoothing technique.", 18),
        ("MISC_02", "Stationarity and Unit Root Tests (ADF Test)", "ADF p-value > 0.05 proves the series is stationary.", "The null hypothesis H0 of ADF is that the series has a unit root (non-stationary). p > 0.05 fails to reject H0, meaning the series remains non-stationary.", 24),
        ("MISC_03", "Forecast Accuracy: MAE, MSE, RMSE, MAPE", "MAPE can be calculated on all datasets without concern.", "MAPE divides error by actual values. When demand is zero or near zero, it results in division by zero or severely distorted percentages.", 15)
    ]:
        topic = next((row for row in db.query(Topic).all() if normalize(row.name) == normalize(misc[1])), None)
        if not topic:
            continue
        m = Misconception(
            topic_id=topic.id,
            description=misc[2],
            correct_understanding=misc[3],
            recommended_action=f"Review {misc[1]} examples and practice questions.",
        )
        db.add(m)

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
