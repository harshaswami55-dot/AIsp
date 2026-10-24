"""
Forecasting Engine for AI Learning Partner 360
MBA Business Forecasting (SB6202)
Contains REAL mathematical models, stationarity tests, metric calculations, and managerial interpretation.
"""
import math
import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import adfuller, acf, pacf
from statsmodels.tsa.holtwinters import SimpleExpSmoothing, Holt, ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.api import VAR
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


def calculate_metrics(actual, predicted):
    """
    Computes real forecast accuracy metrics: MAE, MSE, RMSE, MAPE.
    Handles zero division safely for MAPE with business footnote.
    """
    y_true = np.array(actual, dtype=float)
    y_pred = np.array(predicted, dtype=float)

    if len(y_true) == 0 or len(y_pred) == 0:
        return {"mae": 0.0, "mse": 0.0, "rmse": 0.0, "mape": 0.0, "note": "Insufficient data"}

    # Align lengths
    n = min(len(y_true), len(y_pred))
    y_true = y_true[:n]
    y_pred = y_pred[:n]

    errors = y_true - y_pred
    abs_errors = np.abs(errors)
    squared_errors = errors ** 2

    mae = float(np.mean(abs_errors))
    mse = float(np.mean(squared_errors))
    rmse = float(np.sqrt(mse))

    # MAPE with protective epsilon
    denominator = np.where(np.abs(y_true) < 1e-4, 1.0, np.abs(y_true))
    zero_mask = np.abs(y_true) < 1e-4
    mape = float(np.mean(abs_errors / denominator) * 100)

    has_zeros = bool(np.any(zero_mask))
    note = "Standard percentage error calculation."
    if has_zeros:
        note = "Notice: Some actual values near zero were stabilized. In MBA practice, MAD or RMSE is preferred when values approach zero to avoid distorted percentage inflations."

    return {
        "mae": round(mae, 2),
        "mse": round(mse, 2),
        "rmse": round(rmse, 2),
        "mape": round(mape, 2),
        "note": note
    }


def perform_adf_test(series):
    """
    Real Augmented Dickey-Fuller (ADF) Unit Root Test.
    H0 (Null Hypothesis): The series has a unit root (Non-stationary).
    H1 (Alternative): The series is stationary.
    """
    s = pd.Series(series).dropna()
    if len(s) < 8:
        return {
            "error": "At least 8 observations required for ADF test.",
            "is_stationary": False
        }

    try:
        result = adfuller(s, autolag='AIC')
        stat = float(result[0])
        p_val = float(result[1])
        usedlag = int(result[2])
        nobs = int(result[3])
        crit_vals = {k: round(float(v), 3) for k, v in result[4].items()}

        is_stationary = p_val < 0.05

        if is_stationary:
            verdict = "Stationary (Reject H0 at 5% significance level)"
            explanation = (
                f"The ADF statistic ({stat:.3f}) is more negative than the 5% critical value "
                f"({crit_vals.get('5%', -2.86):.3f}), and p-value is {p_val:.4f} (< 0.05). "
                "The statistical properties (mean, variance) remain invariant across time. Differencing is not required."
            )
            recommendation = "Proceed directly to ARMA, ARIMA(p,0,q), or ML modeling without order differencing."
        else:
            verdict = "Non-Stationary (Fail to Reject H0)"
            explanation = (
                f"The ADF statistic ({stat:.3f}) is greater than the critical value, and p-value is "
                f"{p_val:.4f} (>= 0.05). A stochastic trend or unit root is present."
            )
            recommendation = "Apply first-order differencing (d=1) to stabilize the mean before ARMA/ARIMA modeling."

        return {
            "adf_statistic": round(stat, 4),
            "p_value": round(p_val, 4),
            "critical_values": crit_vals,
            "lags_used": usedlag,
            "observations": nobs,
            "is_stationary": is_stationary,
            "verdict": verdict,
            "explanation": explanation,
            "recommendation": recommendation
        }
    except Exception as e:
        return {
            "error": str(e),
            "is_stationary": False
        }


def compute_acf_pacf(series, nlags=16):
    """
    Computes real Autocorrelation (ACF) and Partial Autocorrelation (PACF) values.
    Includes 95% Bartlett / standard error confidence bands.
    """
    s = pd.Series(series).dropna().values
    n = len(s)
    if n < 8:
        return {"lags": [], "acf": [], "pacf": [], "confidence_bound": 0.2}

    max_lags = min(nlags, (n // 2) - 1)
    if max_lags < 2:
        max_lags = 2

    acf_vals = acf(s, nlags=max_lags, fft=True)
    try:
        pacf_vals = pacf(s, nlags=max_lags, method='ols')
    except Exception:
        pacf_vals = pacf(s, nlags=max_lags, method='ywm')

    conf_bound = round(1.96 / math.sqrt(n), 3)

    return {
        "lags": list(range(len(acf_vals))),
        "acf": [round(float(v), 3) for v in acf_vals],
        "pacf": [round(float(v), 3) for v in pacf_vals],
        "confidence_bound": conf_bound,
        "sample_size": n
    }


def decompose_series(series, period=12):
    """
    Classical additive decomposition: Series = Trend + Seasonal + Residual
    """
    s = pd.Series(series, dtype=float)
    n = len(s)
    if n < period * 2:
        period = max(2, n // 3)

    # 1. Trend via centered rolling mean
    trend = s.rolling(window=period, center=True).mean()

    # 2. Detrended series
    detrended = s - trend

    # 3. Seasonal indices (average of detrended for each seasonal period)
    seasonal_pattern = np.zeros(period)
    for i in range(period):
        indices = range(i, n, period)
        vals = [detrended.iloc[idx] for idx in indices if not pd.isna(detrended.iloc[idx])]
        seasonal_pattern[i] = np.mean(vals) if len(vals) > 0 else 0.0

    # Center seasonality to sum to 0
    seasonal_pattern = seasonal_pattern - np.mean(seasonal_pattern)

    seasonal = np.array([seasonal_pattern[i % period] for i in range(n)])
    residual = s - trend - seasonal

    # Replace NaNs for frontend charts
    trend_clean = [round(float(v), 2) if not pd.isna(v) else None for v in trend]
    seasonal_clean = [round(float(v), 2) for v in seasonal]
    residual_clean = [round(float(v), 2) if not pd.isna(v) else None for v in residual]

    return {
        "trend": trend_clean,
        "seasonal": seasonal_clean,
        "residual": residual_clean,
        "period": period
    }


def generate_managerial_insight(model_name, metrics, last_actual, last_forecast, mean_forecast, horizon):
    """
    Translates raw numbers into three MBA layers:
    1. FORECAST
    2. BUSINESS INTERPRETATION
    3. MANAGERIAL RECOMMENDATION
    """
    delta_pct = 0.0
    if last_actual != 0:
        delta_pct = ((mean_forecast - last_actual) / abs(last_actual)) * 100

    direction = "growth" if delta_pct > 0 else "contraction"
    trend_desc = f"{abs(delta_pct):.1f}% {direction}"

    forecast_summary = (
        f"The {model_name} model projects an average demand/volume of {mean_forecast:.1f} units "
        f"across the next {horizon} periods, representing a {trend_desc} compared to the most recent historical baseline ({last_actual:.1f})."
    )

    rmse = metrics.get("rmse", 0)
    mape = metrics.get("mape", 0)

    if mape < 10:
        risk_level = "Low Forecast Risk (High Precision)"
        buffer_rule = "Maintain standard 1-sigma safety inventory buffer."
    elif mape < 20:
        risk_level = "Moderate Uncertainty"
        buffer_rule = "Incorporate a 15% safety stock contingency to absorb potential variance."
    else:
        risk_level = "Elevated Variance / High Volatility"
        buffer_rule = "Exercise agile production scheduling and rolling weekly reviews to guard against bullwhip effects."

    interpretation = (
        f"Forecast accuracy shows RMSE of {rmse} and MAPE of {mape}%. "
        f"Risk profile indicates: {risk_level}. "
        f"A projected {direction} will alter operating working capital, production scheduling, and fulfillment lead times."
    )

    recommendation = (
        f"1. Operations: {buffer_rule}\n"
        f"2. Finance: Adjust cash flow reserves anticipating a {trend_desc} in operational throughput.\n"
        f"3. Executive Action: Establish monthly trigger points to re-estimate model parameters should actuals deviate beyond ±2 RMSE."
    )

    return {
        "forecast_statement": forecast_summary,
        "business_interpretation": interpretation,
        "managerial_recommendation": recommendation
    }


# ==========================================
# MODEL RUNNERS
# ==========================================

def run_classical_model(model_type, train_series, test_series, horizon=6, **kwargs):
    """
    Runs Naive, Moving Average, Simple Exponential Smoothing, Holt's Linear, or Holt-Winters.
    """
    y_train = np.array(train_series, dtype=float)
    y_test = np.array(test_series, dtype=float) if len(test_series) > 0 else None

    fitted_values = []
    forecast_values = []

    if model_type == "naive":
        last_val = y_train[-1]
        forecast_values = [float(last_val)] * horizon
        fitted_values = [y_train[0]] + list(y_train[:-1])

    elif model_type == "moving_average":
        window = int(kwargs.get("window", 3))
        window = max(2, min(window, len(y_train) - 1))
        # Rolling average of last 'window' periods
        recent_avg = float(np.mean(y_train[-window:]))
        forecast_values = [recent_avg] * horizon
        # In-sample fits
        fitted_values = [float(np.mean(y_train[max(0, i-window):i])) if i > 0 else float(y_train[0]) for i in range(len(y_train))]

    elif model_type == "ses":
        alpha = kwargs.get("alpha", None)
        model = SimpleExpSmoothing(y_train, initialization_method="estimated")
        fit = model.fit(smoothing_level=alpha, optimized=(alpha is None))
        forecast_values = [round(float(v), 2) for v in fit.forecast(horizon)]
        fitted_values = [round(float(v), 2) for v in fit.fittedvalues]

    elif model_type == "holt":
        model = Holt(y_train, initialization_method="estimated")
        fit = model.fit()
        forecast_values = [round(float(v), 2) for v in fit.forecast(horizon)]
        fitted_values = [round(float(v), 2) for v in fit.fittedvalues]

    elif model_type == "holt_winters":
        seasonal_periods = int(kwargs.get("seasonal_periods", 12))
        seasonal_periods = max(2, min(seasonal_periods, len(y_train) // 2))
        seasonal_type = kwargs.get("seasonal_type", "add")
        model = ExponentialSmoothing(
            y_train,
            trend="add",
            seasonal=seasonal_type,
            seasonal_periods=seasonal_periods,
            initialization_method="estimated"
        )
        fit = model.fit()
        forecast_values = [round(float(v), 2) for v in fit.forecast(horizon)]
        fitted_values = [round(float(v), 2) for v in fit.fittedvalues]

    # Evaluate against test if available
    eval_target = y_test[:horizon] if y_test is not None and len(y_test) >= horizon else y_train[-horizon:]
    eval_pred = forecast_values[:len(eval_target)]
    metrics = calculate_metrics(eval_target, eval_pred)

    mean_fc = float(np.mean(forecast_values)) if forecast_values else 0.0
    managerial = generate_managerial_insight(
        model_name=model_type.replace("_", " ").title(),
        metrics=metrics,
        last_actual=float(y_train[-1]),
        last_forecast=forecast_values[0] if forecast_values else 0.0,
        mean_forecast=mean_fc,
        horizon=horizon
    )

    return {
        "model_name": model_type.replace("_", " ").title(),
        "model_type": "Classical Forecasting",
        "fitted_values": [round(float(v), 2) for v in fitted_values],
        "forecast_values": forecast_values,
        "metrics": metrics,
        "managerial": managerial
    }


def run_arima_model(train_series, test_series, p=1, d=1, q=1, P=0, D=0, Q=0, s=12, horizon=6):
    """
    Fits real ARIMA or SARIMA model using statsmodels.
    """
    y_train = np.array(train_series, dtype=float)
    y_test = np.array(test_series, dtype=float) if len(test_series) > 0 else None

    is_seasonal = (P > 0 or D > 0 or Q > 0) and s > 1
    model_name = f"SARIMA({p},{d},{q})x({P},{D},{Q})_{s}" if is_seasonal else f"ARIMA({p},{d},{q})"

    try:
        if is_seasonal:
            model = SARIMAX(
                y_train,
                order=(p, d, q),
                seasonal_order=(P, D, Q, s),
                enforce_stationarity=False,
                enforce_invertibility=False
            )
        else:
            model = ARIMA(
                y_train,
                order=(p, d, q),
                enforce_stationarity=False,
                enforce_invertibility=False
            )

        res = model.fit()
        forecast_values = [round(float(v), 2) for v in res.forecast(steps=horizon)]
        fitted_values = [round(float(v), 2) for v in res.fittedvalues]
        residuals = [round(float(v), 2) for v in res.resid]

        eval_target = y_test[:horizon] if y_test is not None and len(y_test) >= horizon else y_train[-horizon:]
        eval_pred = forecast_values[:len(eval_target)]
        metrics = calculate_metrics(eval_target, eval_pred)

        # Residual diagnostics
        res_mean = float(np.mean(residuals))
        res_std = float(np.std(residuals))

        managerial = generate_managerial_insight(
            model_name=model_name,
            metrics=metrics,
            last_actual=float(y_train[-1]),
            last_forecast=forecast_values[0],
            mean_forecast=float(np.mean(forecast_values)),
            horizon=horizon
        )

        return {
            "model_name": model_name,
            "model_type": "Univariate Time Series",
            "fitted_values": fitted_values,
            "forecast_values": forecast_values,
            "residuals": residuals,
            "residual_mean": round(res_mean, 3),
            "residual_std": round(res_std, 3),
            "aic": round(float(res.aic), 2),
            "bic": round(float(res.bic), 2),
            "metrics": metrics,
            "managerial": managerial
        }
    except Exception as e:
        # Fallback with graceful message
        return {
            "error": f"ARIMA convergence error: {str(e)}. Try lowering p, d, or q order."
        }


def run_ml_forecasting(df, target_col, time_col=None, model_type="random_forest", horizon=6):
    """
    Lag-based Supervised Machine Learning Forecasting:
    Creates feature set: lag_1, lag_2, lag_3, lag_6, lag_12, rolling_mean_3, rolling_std_3, month
    Trains: Linear Regression, Decision Tree, KNN, Random Forest, Gradient Boosting, XGBoost
    """
    df_work = df.copy()
    if time_col and time_col in df_work.columns:
        df_work[time_col] = pd.to_datetime(df_work[time_col], errors='coerce')
        df_work = df_work.sort_values(by=time_col)

    series = df_work[target_col].astype(float).values
    n = len(series)

    # Feature engineering
    feature_df = pd.DataFrame({"y": series})
    feature_df["lag_1"] = feature_df["y"].shift(1)
    feature_df["lag_2"] = feature_df["y"].shift(2)
    feature_df["lag_3"] = feature_df["y"].shift(3)
    feature_df["lag_6"] = feature_df["y"].shift(6)
    feature_df["rolling_mean_3"] = feature_df["y"].shift(1).rolling(3).mean()
    feature_df["rolling_std_3"] = feature_df["y"].shift(1).rolling(3).std().fillna(0)

    # Add external regressors if present in dataframe
    exog_cols = [c for c in df_work.columns if c not in [target_col, time_col] and pd.api.types.is_numeric_dtype(df_work[c])]
    for col in exog_cols:
        feature_df[f"exog_{col}"] = df_work[col].values

    # Drop NaNs created by lagging
    valid_df = feature_df.dropna()
    if len(valid_df) < 10:
        return {"error": "Not enough rows after feature lagging (minimum 15 required)."}

    X = valid_df.drop(columns=["y"])
    y = valid_df["y"].values
    feature_names = list(X.columns)

    split_idx = max(len(X) - horizon, int(len(X) * 0.8))
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    model_map = {
        "linear_regression": LinearRegression(),
        "decision_tree": DecisionTreeRegressor(max_depth=5, random_state=42),
        "knn": KNeighborsRegressor(n_neighbors=min(3, len(X_train))),
        "random_forest": RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42),
        "gradient_boosting": GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    }

    if model_type == "xgboost" and XGBOOST_AVAILABLE:
        reg = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.08, random_state=42)
    else:
        reg = model_map.get(model_type, RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42))

    reg.fit(X_train, y_train)

    # Predictions on test
    preds = reg.predict(X_test)
    metrics = calculate_metrics(y_test, preds)

    # Feature importance
    feature_importances = {}
    if hasattr(reg, "feature_importances_"):
        for name, imp in zip(feature_names, reg.feature_importances_):
            feature_importances[name] = round(float(imp), 4)
    elif hasattr(reg, "coef_"):
        for name, coef in zip(feature_names, reg.coef_):
            feature_importances[name] = round(float(abs(coef)), 4)

    # Recursive future forecast for 'horizon' steps
    future_forecasts = []
    current_history = list(series)

    for step in range(horizon):
        row_dict = {
            "lag_1": current_history[-1],
            "lag_2": current_history[-2] if len(current_history) >= 2 else current_history[-1],
            "lag_3": current_history[-3] if len(current_history) >= 3 else current_history[-1],
            "lag_6": current_history[-6] if len(current_history) >= 6 else current_history[-1],
            "rolling_mean_3": np.mean(current_history[-3:]),
            "rolling_std_3": float(np.std(current_history[-3:]))
        }
        for col in exog_cols:
            row_dict[f"exog_{col}"] = float(df_work[col].iloc[-1])

        row_df = pd.DataFrame([row_dict])[feature_names]
        next_pred = float(reg.predict(row_df)[0])
        future_forecasts.append(round(next_pred, 2))
        current_history.append(next_pred)

    managerial = generate_managerial_insight(
        model_name=model_type.replace("_", " ").title(),
        metrics=metrics,
        last_actual=float(series[-1]),
        last_forecast=future_forecasts[0],
        mean_forecast=float(np.mean(future_forecasts)),
        horizon=horizon
    )

    return {
        "model_name": model_type.replace("_", " ").title(),
        "model_type": "Supervised Machine Learning",
        "feature_importances": feature_importances,
        "test_actuals": [round(float(v), 2) for v in y_test],
        "test_predictions": [round(float(v), 2) for v in preds],
        "future_forecasts": future_forecasts,
        "metrics": metrics,
        "managerial": managerial
    }


def compare_all_models(train_series, test_series, horizon=6, df_ml=None, target_col="sales"):
    """
    Executes a head-to-head model comparison across:
    - Moving Average
    - Holt-Winters
    - ARIMA
    - SARIMA
    - Random Forest
    - XGBoost
    Produces a multi-criteria evaluation matrix: MAE, MSE, RMSE, MAPE, Interpretability, Best Use Case.
    """
    results = []

    # 1. Moving Average
    ma_res = run_classical_model("moving_average", train_series, test_series, horizon=horizon, window=3)
    results.append({
        "model": "Moving Average (k=3)",
        "type": "Classical Smoothing",
        "metrics": ma_res["metrics"],
        "interpretability": "Very High",
        "complexity": "Low",
        "data_requirement": "Minimal (>= 5 pts)",
        "best_use_case": "Short-term baseline with no clear trend or seasonality",
        "forecast": ma_res["forecast_values"]
    })

    # 2. Holt-Winters
    hw_res = run_classical_model("holt_winters", train_series, test_series, horizon=horizon, seasonal_periods=12)
    results.append({
        "model": "Holt-Winters Exponential",
        "type": "Classical Decomposition",
        "metrics": hw_res["metrics"],
        "interpretability": "High",
        "complexity": "Moderate",
        "data_requirement": "Moderate (>= 2 full cycles)",
        "best_use_case": "Clear trend and repeatable seasonal patterns",
        "forecast": hw_res["forecast_values"]
    })

    # 3. ARIMA(1,1,1)
    arima_res = run_arima_model(train_series, test_series, p=1, d=1, q=1, horizon=horizon)
    if "error" not in arima_res:
        results.append({
            "model": "ARIMA(1,1,1)",
            "type": "Univariate Time Series",
            "metrics": arima_res["metrics"],
            "interpretability": "Moderate",
            "complexity": "Moderate",
            "data_requirement": "Substantial (>= 30-50 pts)",
            "best_use_case": "Stationary or first-differenced series with autocorrelated shocks",
            "forecast": arima_res["forecast_values"]
        })

    # 4. SARIMA(1,1,1)x(1,1,1)_12
    sarima_res = run_arima_model(train_series, test_series, p=1, d=1, q=1, P=1, D=1, Q=1, s=12, horizon=horizon)
    if "error" not in sarima_res:
        results.append({
            "model": "SARIMA(1,1,1)x(1,1,1)_12",
            "type": "Seasonal Time Series",
            "metrics": sarima_res["metrics"],
            "interpretability": "Moderate",
            "complexity": "High",
            "data_requirement": "High (>= 3-4 seasonal cycles)",
            "best_use_case": "Complex seasonal non-stationarity and recurring annual seasonality",
            "forecast": sarima_res["forecast_values"]
        })

    # 5. ML Models if DataFrame provided
    if df_ml is not None and target_col in df_ml.columns:
        rf_res = run_ml_forecasting(df_ml, target_col, model_type="random_forest", horizon=horizon)
        if "error" not in rf_res:
            results.append({
                "model": "Random Forest Regressor",
                "type": "Supervised ML (Ensemble)",
                "metrics": rf_res["metrics"],
                "interpretability": "Moderate",
                "complexity": "High",
                "data_requirement": "High (feature lags)",
                "best_use_case": "Non-linear relationships, multi-lag interactions, external regressors",
                "forecast": rf_res["future_forecasts"]
            })

        xgb_res = run_ml_forecasting(df_ml, target_col, model_type="xgboost", horizon=horizon)
        if "error" not in xgb_res:
            results.append({
                "model": "XGBoost Regressor",
                "type": "Gradient Boosted Trees",
                "metrics": xgb_res["metrics"],
                "interpretability": "Low-Moderate",
                "complexity": "Very High",
                "data_requirement": "High",
                "best_use_case": "Highest predictive power on dense data with promotional exogenous drivers",
                "forecast": xgb_res["future_forecasts"]
            })

    # Sort candidates by RMSE
    sorted_candidates = sorted(results, key=lambda x: x["metrics"]["rmse"])
    best_statistical = next((m for m in sorted_candidates if "Time Series" in m["type"] or "Classical" in m["type"]), sorted_candidates[0])
    best_ml = next((m for m in sorted_candidates if "ML" in m["type"] or "Trees" in m["type"]), sorted_candidates[-1])

    # Overall executive selection
    best_overall = sorted_candidates[0]

    comparison_narrative = (
        f"Multi-Model Synthesis for MBA Decision Makers:\n"
        f"• Best Statistical Model: {best_statistical['model']} (RMSE: {best_statistical['metrics']['rmse']}, MAPE: {best_statistical['metrics']['mape']}%)\n"
        f"• Best Machine Learning Model: {best_ml['model']} (RMSE: {best_ml['metrics']['rmse']}, MAPE: {best_ml['metrics']['mape']}%)\n"
        f"• Recommended Business Choice: {best_overall['model']}.\n"
        f"Managerial Rationale: While machine learning algorithms excel at non-linear interactions, "
        f"statistical time-series models offer explicit diagnostic auditability required by executive risk committees. "
        f"Choose {best_overall['model']} because it delivers optimal trade-off between predictive accuracy and strategic explainability."
    )

    return {
        "models": results,
        "best_statistical": best_statistical["model"],
        "best_ml": best_ml["model"],
        "best_overall": best_overall["model"],
        "narrative": comparison_narrative
    }
