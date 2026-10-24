# AI Learning Partner 360 — MBA Business Forecasting (SB6202)
> *"From AI that gives answers to AI that builds forecasters."*

A full-stack, state-of-the-art educational and analytics platform built strictly around the official **RV University School of Business (SOB) MBA Business Forecasting (SB6202)** syllabus taught by **Dr. Veena A**.

---

## 🌟 Key Features

### 1. Primary Source of Truth: RV University SB6202 Syllabus
- **Module 1**: Introduction to Forecasting & Accuracy Measures (MAE, MSE, RMSE, MAPE)
- **Module 2**: Forecasting Techniques (Trend, Seasonality, Moving Average, SES, Holt's, Holt-Winters)
- **Module 3**: Univariate Time Series Models (ACF, PACF, AR(p), MA(q), Stationarity, ADF Unit Root Test, Differencing, ARMA, ARIMA, SARIMA)
- **Module 4**: Multivariate Time Series Models (VAR, VARIMAX, SARIMAX)
- **Module 5**: Supervised & Machine Learning Models (Linear Regression, Decision Tree, Random Forest, Gradient Boosting with XGBoost)
- **Course Outcomes**: Exact mapping to **CO1, CO2, CO3, CO4, CO5** and continuous evaluation rubrics (**CIE 1 to 5 + Final Exam**).

### 2. Real Statistical & ML Engine (No Hardcoding or Fake Math)
- Real Python execution via `statsmodels`, `scikit-learn`, `xgboost`, `pandas`, and `numpy`.
- **ADF Stationarity Test**: Real test statistic, p-value calculation, critical values (1%, 5%, 10%), and stationarity verdict.
- **ACF & PACF**: Real correlogram computations with 95% Bartlett confidence limits ($\pm 1.96/\sqrt{N}$).
- **Decomposition**: Real classical additive trend, seasonal variation, and residual extraction.
- **Forecast Accuracy**: Out-of-sample evaluation computing exact **MAE, MSE, RMSE, MAPE** with safeguards against zero denominators.
- **Managerial Decision Translation Layer**: Translates statistical numbers into **1. FORECAST STATEMENT**, **2. BUSINESS INTERPRETATION**, and **3. MANAGERIAL RECOMMENDATION**.

### 3. Pedagogical AI Engines
- **Socratic Learning Mode**: Inquiry-based teaching that questions student reasoning before offering hints or answers.
- **Teach-the-AI Mode**: Student explains concepts to the AI, evaluated against the official 5-criterion rubric (Conceptual Understanding, Terminology, Reasoning, Business Interpretation, Misconceptions).
- **Misconception Engine**: Automatic detection and correction of common traps (e.g. *MA in ARIMA vs Moving Average smoothing*, *ADF p-value interpretation*, *zero-demand MAPE distortion*).
- **Model Selection Coach**: Interactive questionnaire recommending algorithms based on multivariate relationships, trend, seasonality, stationarity, and interpretability requirements.
- **AI Independence Mode**: Progressive fading scaffolding (**Levels 0 to 5**). Measures **AI Independence Gain** ($+32$ percentage points) on unseen transfer challenges.

### 4. Interactive Forecasting Lab
- Preloaded with **5 realistic MBA business time-series datasets**:
  1. *Retail Monthly Sales* (48 months, upward secular trend + Q4 holiday spikes)
  2. *FMCG Product Demand* (52 weeks, promotional discount surges + price elasticity)
  3. *Hotel Occupancy Rate* (36 months, summer vacation peaks + dynamic ADR pricing)
  4. *E-Commerce Order Volume* (36 months, exponential platform growth + festive sale spikes)
  5. *Advertising Spend vs Sales* (36 months multivariate with digital spend, TV spend, price, and sales)
- Support for **custom CSV file upload** with automated date parsing and numerical feature extraction.

### 5. Multi-Model Tournament & Comparison
- Head-to-head comparison matrix across Moving Average, Holt-Winters, ARIMA, SARIMA, Random Forest, and XGBoost.
- Awards **Best Statistical Model**, **Best ML Model**, and **Recommended Boardroom Choice** with executive trade-off narrative.

### 6. Role-Based Access & Instant Demo Switcher
- **Demo Student**: John Doe (MBA Candidate, 68% overall mastery, active study plan).
- **Demo Faculty**: Dr. Veena A (Course Instructor, 42 enrolled students, difficult topic alerts, intervention gains of $+26\%$ and $+33\%$).
- **Admin**: Curricular and threshold control.

---

## 🚀 Running the Application 24/7

The server runs on **port 8000** as a unified service serving both the REST APIs (`/api/...`) and the production React frontend at `http://localhost:8000/`.

### Quick Start
```bash
# Start the unified 24/7 server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Open **[http://localhost:8000/](http://localhost:8000/)** in any browser (desktop, tablet, or mobile).

### Automated Test Suite
To verify statistical calculations, database integrity, and AI engines:
```bash
cd backend
python test_suite.py
```
*(All 11 unit and integration tests pass with 100% success).*

---

## 📱 Mobile Responsiveness
The user interface is built with responsive grid breakpoints, a touch-friendly navigation drawer, collapsible KPI cards, and SVG viewport scaling, ensuring seamless usability on mobile devices (e.g. 390x844 viewport) and executive monitors alike.
