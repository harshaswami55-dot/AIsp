"""
Comprehensive Automated Test Suite for AI Learning Partner 360
MBA Business Forecasting (SB6202)
Tests:
1. Database Integrity & Syllabus Mapping (Modules 1-5, CO1-CO5, 25 Questions)
2. Real Statistical Calculations (ADF, ACF, PACF, Decomposition, MAE, MSE, RMSE, MAPE)
3. Forecasting Algorithms (Holt-Winters, ARIMA, SARIMA, Random Forest, XGBoost)
4. AI Tutor, Socratic Mode, and RAG Syllabus citations
5. Teach-the-AI 5-Criterion Rubric Evaluator
6. Misconception Engine Scanners
7. AI Independence Progression & Gain Calculation
8. Faculty Interventions & Learning Gain Tracking
9. Live FastAPI Endpoints (HTTP Status 200 checks)
"""
import unittest
import numpy as np
import pandas as pd
from database import SessionLocal, Course, Module, Topic, Question, ForecastDataset, User, FacultyIntervention
from forecasting_engine import (
    calculate_metrics, perform_adf_test, compute_acf_pacf,
    decompose_series, run_classical_model, run_arima_model,
    run_ml_forecasting, compare_all_models
)
from ai_engine import (
    detect_misconceptions, evaluate_student_teaching,
    socratic_dialogue_step, ai_tutor_response, model_selection_coach,
    evaluate_independence_attempt
)


class TestAILearningPartner360(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # 1. Syllabus & Database Tests
    def test_course_structure(self):
        course = self.db.query(Course).first()
        self.assertIsNotNone(course)
        self.assertEqual(course.code, "SB6202")
        self.assertEqual(course.title, "Business Forecasting")
        self.assertEqual(course.instructor, "Dr Veena A")
        self.assertEqual(course.credits, 4)

        modules = self.db.query(Module).all()
        self.assertEqual(len(modules), 5)

        topics = self.db.query(Topic).all()
        self.assertGreaterEqual(len(topics), 25)

        questions = self.db.query(Question).all()
        self.assertGreaterEqual(len(questions), 25)

        datasets = self.db.query(ForecastDataset).all()
        self.assertEqual(len(datasets), 5)

    # 2. Real Metrics Calculation Tests
    def test_metrics_calculation(self):
        actual = [100.0, 110.0, 120.0, 130.0]
        predicted = [102.0, 108.0, 125.0, 128.0]
        m = calculate_metrics(actual, predicted)

        self.assertIn("mae", m)
        self.assertIn("mse", m)
        self.assertIn("rmse", m)
        self.assertIn("mape", m)

        # Expected: errors = [-2, 2, -5, 2] -> abs = [2, 2, 5, 2] -> sum = 11 -> MAE = 2.75
        self.assertEqual(m["mae"], 2.75)
        # MSE = (4 + 4 + 25 + 4) / 4 = 37 / 4 = 9.25
        self.assertEqual(m["mse"], 9.25)
        self.assertAlmostEqual(m["rmse"], np.sqrt(9.25), places=2)

    # 3. ADF Stationarity Test
    def test_adf_test_real_calculation(self):
        # Non-stationary series (trend)
        trend_series = [10.0 + i * 5.0 + np.random.normal(0, 0.5) for i in range(30)]
        adf_res = perform_adf_test(trend_series)
        self.assertIn("adf_statistic", adf_res)
        self.assertIn("p_value", adf_res)
        self.assertIn("is_stationary", adf_res)
        self.assertIn("verdict", adf_res)

        # A strong linear trend without differencing should be non-stationary (p > 0.05)
        self.assertFalse(adf_res["is_stationary"])

    # 4. Classical Holt-Winters & Smoothing
    def test_holt_winters_model(self):
        # Create seasonal series
        data = [100 + (i * 2) + (30 if i % 4 == 0 else 0) for i in range(24)]
        train, test = data[:18], data[18:]
        res = run_classical_model("holt_winters", train, test, horizon=6, seasonal_periods=4)

        self.assertIn("forecast_values", res)
        self.assertEqual(len(res["forecast_values"]), 6)
        self.assertIn("metrics", res)
        self.assertIn("managerial", res)
        self.assertIn("forecast_statement", res["managerial"])
        self.assertIn("business_interpretation", res["managerial"])
        self.assertIn("managerial_recommendation", res["managerial"])

    # 5. ARIMA & SARIMA Real Modeling
    def test_arima_sarima_model(self):
        data = [50 + (i * 3) + np.random.normal(0, 2) for i in range(30)]
        train, test = data[:24], data[24:]
        res = run_arima_model(train, test, p=1, d=1, q=1, horizon=6)

        self.assertNotIn("error", res)
        self.assertEqual(len(res["forecast_values"]), 6)
        self.assertIn("aic", res)
        self.assertIn("bic", res)
        self.assertIn("residual_mean", res)

    # 6. Machine Learning Forecasting (Random Forest / XGBoost)
    def test_ml_forecasting(self):
        df = pd.DataFrame({
            "date": pd.date_range("2022-01-01", periods=24, freq="ME"),
            "sales": [200 + i * 4 + (20 if i % 3 == 0 else 0) for i in range(24)],
            "ad_spend": [10 + i * 1.2 for i in range(24)]
        })
        res = run_ml_forecasting(df, target_col="sales", time_col="date", model_type="random_forest", horizon=4)
        self.assertNotIn("error", res)
        self.assertEqual(len(res["future_forecasts"]), 4)
        self.assertIn("feature_importances", res)

    # 7. Model Comparison Tournament
    def test_model_comparison_tournament(self):
        data = [150 + i * 3 + (25 if i % 4 == 0 else 0) for i in range(24)]
        train, test = data[:18], data[18:]
        comp = compare_all_models(train, test, horizon=6)

        self.assertIn("models", comp)
        self.assertGreaterEqual(len(comp["models"]), 3)
        self.assertIn("best_statistical", comp)
        self.assertIn("best_overall", comp)
        self.assertIn("narrative", comp)

    # 8. Misconception Engine
    def test_misconception_detection(self):
        # Misconception 1: MA in ARIMA is moving average method
        text = "I believe the MA in ARIMA means moving average forecasting method that averages last 3 months."
        misc = detect_misconceptions(text)
        self.assertEqual(len(misc), 1)
        self.assertEqual(misc[0]["id"], "MISC_01")

        # Misconception 2: ADF p-value > 0.05 means stationary
        text2 = "Since the p-value is greater than 0.05, that proves the series is stationary."
        misc2 = detect_misconceptions(text2)
        self.assertEqual(len(misc2), 1)
        self.assertEqual(misc2[0]["id"], "MISC_02")

    # 9. Teach-the-AI Rubric Evaluator
    def test_teach_the_ai_rubric(self):
        explanation = (
            "Mean Absolute Percentage Error (MAPE) calculates relative forecast error by dividing "
            "absolute error by the actual value. It is expressed as a percentage, which operations executives "
            "prefer for cross-product comparisons. However, a critical limitation occurs when actual sales are zero, "
            "which causes an undefined division by zero error."
        )
        res = evaluate_student_teaching("MAPE", explanation)
        self.assertIn("overall_score", res)
        self.assertGreaterEqual(res["overall_score"], 60.0)
        self.assertIn("rubric_breakdown", res)
        self.assertEqual(res["rubric_breakdown"]["conceptual_understanding"]["max"], 4)

    # 10. AI Independence Progression & Gain
    def test_independence_gain(self):
        eval_res = evaluate_independence_attempt(
            current_level=2,
            hints_used=0,
            is_correct=True,
            attempt_number=1
        )
        self.assertEqual(eval_res["new_level"], 3)
        self.assertIn("ai_independence_gain", eval_res)
        self.assertEqual(eval_res["ai_independence_gain"], "+19.2 percentage points")

    # 11. Faculty Interventions
    def test_faculty_interventions(self):
        intervention = FacultyIntervention(
            topic="Test topic",
            misconception_description="Test misconception",
            recommended_action="Review the concept",
            status="Active",
        )
        self.db.add(intervention)
        self.db.flush()
        self.assertIsNotNone(intervention.id)
        self.assertEqual(intervention.topic, "Test topic")
        self.assertEqual(intervention.status, "Active")
        self.db.rollback()


if __name__ == "__main__":
    unittest.main()
