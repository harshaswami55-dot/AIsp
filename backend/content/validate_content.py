"""Validates backend/content/module_*.json. Usage: python content/validate_content.py [module_N.json ...]"""
import glob
import json
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
TOPICS = {
    1: ["Nature and Importance of Forecasting",
        "Components, Types of Forecasts: Short-term, Medium-term, Long-term",
        "Forecasting Process: Steps and Challenges",
        "Role of Forecasting in Managerial Planning and Control",
        "Forecast Accuracy: MAE, MSE, RMSE, MAPE"],
    2: ["Data Patterns: Trend, Seasonality, Cyclical, and Random", "Moving Average Method",
        "Simple exponential Smoothing(ES)", "Double Exponential Smoothing(SES)", "HOLT-WINTER model",
        "Forecasting time series data with seasonal variation"],
    3: ["Autocorrelation and Partial Autocorrelation (ACF, PACF)", "Moving Average process MA(q)",
        "Autoregressive Process – AR(p)", "Stationarity and Unit Root Tests (ADF Test)",
        "Differencing a time series, Lags", "ARMA process", "ARIMA process", "Seasonal ARIMA (SARIMA)"],
    4: ["VAR model", "VARIMAX model", "SARIMAX model"],
    5: ["Linear Regression", "Decision Tree", "KNN model", "Random Forest", "Gradient Boosting with XG Boost"],
}
PER_DIFFICULTY = 10


def validate(path):
    errors = []
    data = json.load(open(path, encoding="utf-8"))
    module = data.get("module")
    expected = TOPICS.get(module)
    if not expected:
        return [f"bad module number {module!r}"]
    names = [t.get("topic") for t in data.get("topics", [])]
    if names != expected:
        errors.append(f"topic names/order must be exactly {expected}, got {names}")
    seen_q = set()
    for t in data.get("topics", []):
        name = t.get("topic")
        qs = t.get("questions", [])
        counts = Counter(q.get("difficulty") for q in qs)
        if counts != Counter({"easy": PER_DIFFICULTY, "medium": PER_DIFFICULTY, "hard": PER_DIFFICULTY}):
            errors.append(f"[{name}] need {PER_DIFFICULTY} each of easy/medium/hard, got {dict(counts)}")
        for i, q in enumerate(qs):
            where = f"[{name}] q{i + 1}"
            opts = q.get("options", [])
            if len(opts) != 4 or len(set(opts)) != 4 or not all(isinstance(o, str) and o.strip() for o in opts):
                errors.append(f"{where}: need 4 distinct non-empty options")
            if q.get("answer") not in opts:
                errors.append(f"{where}: answer must exactly equal one option")
            for key in ("q", "explanation", "concept"):
                if not str(q.get(key, "")).strip():
                    errors.append(f"{where}: missing {key}")
            text = str(q.get("q", "")).strip().lower()
            if text in seen_q:
                errors.append(f"{where}: duplicate question text")
            seen_q.add(text)
        answers = Counter(q.get("options", []).index(q["answer"]) for q in qs if q.get("answer") in q.get("options", []))
        if qs and max(answers.values()) > len(qs) * 0.4:
            errors.append(f"[{name}] correct answers bunched in one position {dict(answers)}; shuffle them")
        longest = sum(1 for q in qs if q.get("answer") in q.get("options", [])
                      and len(q["answer"]) > max(len(o) for o in q["options"] if o != q["answer"]))
        if qs and longest > len(qs) * 0.4:
            errors.append(f"[{name}] correct option is strictly the longest in {longest}/{len(qs)} questions (max 40%); "
                          "make distractors as long and specific as the answer")
        refs = t.get("references", [])
        if len(refs) != 3 or any(len(str(r).split()) < 60 for r in refs):
            errors.append(f"[{name}] need 3 references of at least 60 words each")
        kc = t.get("key_concepts", [])
        if not 8 <= len(kc) <= 15:
            errors.append(f"[{name}] need 8-15 key_concepts, got {len(kc)}")
    return errors


if __name__ == "__main__":
    paths = sys.argv[1:] or sorted(glob.glob(os.path.join(HERE, "module_*.json")))
    failed = False
    for p in paths:
        errs = validate(p)
        failed |= bool(errs)
        print(f"{os.path.basename(p)}: {'OK' if not errs else f'{len(errs)} problem(s)'}")
        for e in errs[:40]:
            print("  -", e)
    sys.exit(1 if failed else 0)
