"""
AI Agent Engine for AI Learning Partner 360 (SB6202)
Powered by Ollama (local LLM) with:
- Agentic tool use: ADF test, dataset info, syllabus RAG, accuracy metrics
- Per-session conversation memory (multi-turn)
- Syllabus-grounded system prompt (Dr. Veena A / RV University SB6202)
- Global floating assistant support (context-aware page hints)
"""
import json
import os
import re
import requests
from collections import Counter
from datetime import datetime
from typing import Optional

from forecasting_engine import calculate_metrics, perform_adf_test
from ai_engine import SYLLABUS_KNOWLEDGE, detect_misconceptions
from learning import TOPIC_CONTENT, tokens, _cosine

# -------------------------------------------------------------------
# OLLAMA CONFIG
# -------------------------------------------------------------------
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

# -------------------------------------------------------------------
# PER-SESSION CONVERSATION MEMORY
# -------------------------------------------------------------------
_conversation_histories: dict = {}

def get_history(session_id: str) -> list:
    return _conversation_histories.setdefault(session_id, [])

def clear_history(session_id: str):
    _conversation_histories.pop(session_id, None)

def _trim_history(history: list, max_turns: int = 20) -> list:
    if len(history) > max_turns * 2:
        return history[-(max_turns * 2):]
    return history

# -------------------------------------------------------------------
# TOOLS
# -------------------------------------------------------------------
TOOLS_DESCRIPTION = """- **run_adf_test**: Runs ADF unit root test. Use when asked about stationarity or unit roots.
- **get_dataset_info**: Lists the 5 preloaded MBA datasets in the Forecasting Lab.
- **get_syllabus_content**: Queries the official SB6202 syllabus (use for ANY factual topic question).
- **compute_accuracy_example**: Computes MAE, MSE, RMSE, MAPE for example arrays."""

SYSTEM_PROMPT = """You are **ARIA** (Adaptive Reasoning & Intelligence Agent), the AI Tutor for MBA Business Forecasting SB6202 at RV University, taught by Dr. Veena A.

## YOUR ROLE
You are a Socratic, expert pedagogical AI. Build students into independent forecasters. You:
- Teach through guided questions before revealing solutions
- Ground every response in the official SB6202 syllabus (Modules 1-5)
- Detect and explicitly correct misconceptions
- Translate statistical results into actionable managerial decisions
- Never over-assist; always end with a guiding question

## COURSE MODULES
- Module 1: Introduction to Forecasting & Accuracy Measures (MAE, MSE, RMSE, MAPE)
- Module 2: Forecasting Techniques (SMA, SES, Holt Linear, Holt-Winters)
- Module 3: Univariate Time Series (ACF, PACF, AR, MA, Stationarity, ADF, ARIMA, SARIMA)
- Module 4: Multivariate Models (VAR, VARIMAX, SARIMAX)
- Module 5: Supervised ML (Linear Regression, Decision Tree, Random Forest, XGBoost)

## TOOLS
To call a tool, output EXACTLY this format (nothing else on those lines):
```tool_call
{"tool": "tool_name", "args": {"param": "value"}}
```
Available tools:
""" + TOOLS_DESCRIPTION + """

## RULES
1. Call `get_syllabus_content` first for any factual question.
2. Never fabricate statistics - use tools.
3. Always end with a guiding question.
4. Format with markdown (bold, bullets, numbered steps).
5. Keep responses under 300 words unless asked for full explanation.
"""

def execute_tool(tool_name: str, args: dict) -> str:
    try:
        if tool_name == "run_adf_test":
            import numpy as np
            np.random.seed(42)
            series = list(np.cumsum(np.random.randn(50)))
            result = perform_adf_test(series)
            return (
                f"**ADF Test Result** (Demo: Random Walk Series)\n"
                f"- Test Statistic: `{result.get('test_statistic', 'N/A')}`\n"
                f"- P-Value: `{result.get('p_value', 'N/A')}`\n"
                f"- Critical Values: {result.get('critical_values', {})}\n"
                f"- **Verdict**: {result.get('verdict', 'N/A')}\n"
                f"- **Is Stationary**: {result.get('is_stationary', False)}"
            )
        elif tool_name == "get_dataset_info":
            datasets = [
                {"id":1,"name":"Retail Monthly Sales","obs":48,"freq":"Monthly","features":["trend","Q4 holiday seasonality"],"models":["Holt-Winters","SARIMA"]},
                {"id":2,"name":"FMCG Product Demand","obs":52,"freq":"Weekly","features":["promotional surges","price elasticity"],"models":["SARIMAX","XGBoost"]},
                {"id":3,"name":"Hotel Occupancy Rate","obs":36,"freq":"Monthly","features":["summer peaks","dynamic pricing"],"models":["SARIMA(1,1,1)x(1,1,1)_12"]},
                {"id":4,"name":"E-Commerce Order Volume","obs":36,"freq":"Monthly","features":["exponential growth","festive spikes"],"models":["ARIMA","Random Forest"]},
                {"id":5,"name":"Advertising Spend vs Sales","obs":36,"freq":"Monthly","features":["multivariate: digital spend, TV spend, price, sales"],"models":["VAR","SARIMAX"]}
            ]
            lines = ["**Available MBA Forecasting Datasets:**\n"]
            for d in datasets:
                lines.append(f"**{d['id']}. {d['name']}** ({d['obs']} {d['freq']} obs)\n  Features: {', '.join(d['features'])}\n  Best Models: {', '.join(d['models'])}\n")
            return "\n".join(lines)
        elif tool_name == "get_syllabus_content":
            topic = args.get("topic", "").lower()
            best_match = None
            best_score = 0
            for key, item in SYLLABUS_KNOWLEDGE.items():
                title = item.get("title", "").lower()
                topics_list = " ".join(item.get("topics", [])).lower() if "topics" in item else ""
                content = item.get("key_points", item.get("content", "")).lower()
                score = sum([
                    3 * title.count(w) + 2 * topics_list.count(w) + content.count(w)
                    for w in topic.split()
                ])
                if score > best_score:
                    best_score = score
                    best_match = item
            if not best_match:
                best_match = SYLLABUS_KNOWLEDGE.get("course_overview", {})
            title = best_match.get("title", best_match.get("section", "SB6202 Syllabus"))
            source = best_match.get("source", "RV University SB6202")
            key_points = best_match.get("key_points", best_match.get("content", ""))
            topics = best_match.get("topics", [])
            result = f"**Syllabus Reference: {title}**\n*Source: {source}*\n\n"
            if topics:
                result += "**Topics Covered:**\n" + "\n".join(f"  - {t}" for t in topics) + "\n\n"
            result += f"**Key Points:**\n{key_points}"
            return result
        elif tool_name == "compute_accuracy_example":
            actuals = args.get("actuals", [100, 120, 110, 130, 115])
            preds = args.get("predictions", [105, 115, 108, 125, 118])
            if isinstance(actuals, str): actuals = json.loads(actuals)
            if isinstance(preds, str): preds = json.loads(preds)
            metrics = calculate_metrics(actuals, preds)
            return (
                f"**Accuracy Metrics:**\n"
                f"- Actuals: `{actuals}`\n- Predictions: `{preds}`\n\n"
                f"| Metric | Value |\n|--------|-------|\n"
                f"| MAE | `{metrics.get('mae','N/A')}` |\n"
                f"| MSE | `{metrics.get('mse','N/A')}` |\n"
                f"| RMSE | `{metrics.get('rmse','N/A')}` |\n"
                f"| MAPE | `{metrics.get('mape','N/A')}%` |"
            )
        else:
            return f"Tool '{tool_name}' not recognized."
    except Exception as e:
        return f"Tool error ({tool_name}): {str(e)}"

def parse_tool_calls(text: str) -> list:
    pattern = r"```tool_call\s*(\{.*?\})\s*```"
    matches = re.findall(pattern, text, re.DOTALL)
    calls = []
    for m in matches:
        try:
            obj = json.loads(m)
            if "tool" in obj:
                calls.append(obj)
        except json.JSONDecodeError:
            pass
    return calls

def strip_tool_calls(text: str) -> str:
    return re.sub(r"```tool_call\s*\{.*?\}\s*```", "", text, flags=re.DOTALL).strip()

# -------------------------------------------------------------------
# MODEL PROVIDERS: free hosted LLM (any OpenAI-compatible API; Groq by default) -> local Ollama -> course notes
# -------------------------------------------------------------------
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("GROQ_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
_last_llm_error = {"detail": None}  # surfaced by /api/agent/status so a misconfigured key/model is visible


def _ollama_models() -> list:
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        if resp.status_code == 200:
            return [m["name"] for m in resp.json().get("models", [])]
    except Exception:
        pass
    return []


def call_llm(messages: list, model: str = DEFAULT_MODEL) -> Optional[str]:
    """Returns the model's reply, or None when no model is reachable (caller falls back to course notes)."""
    if LLM_API_KEY:
        try:
            resp = requests.post(
                f"{LLM_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {LLM_API_KEY}"},
                json={"model": LLM_MODEL, "messages": messages, "temperature": 0.5, "max_tokens": 800},
                timeout=25,
            )
            resp.raise_for_status()
            _last_llm_error["detail"] = None
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            body = getattr(getattr(e, "response", None), "text", "") or ""
            _last_llm_error["detail"] = f"{type(e).__name__}: {str(e)[:200]} {body[:300]}".replace(LLM_API_KEY, "***")
            print(f"Hosted LLM unavailable: {_last_llm_error['detail']}")
    models = _ollama_models()
    if models:
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={"model": model if model in models else models[0], "messages": messages, "stream": False,
                      "options": {"temperature": 0.6, "top_p": 0.9, "num_predict": 800}},
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json().get("message", {}).get("content", "")
        except Exception:
            pass
    return None


def check_ollama_status() -> dict:
    """Which engine ARIA is using (name kept for existing callers)."""
    if LLM_API_KEY:
        return {"online": True, "models": [LLM_MODEL], "provider": "hosted", "base_url": LLM_BASE_URL,
                "last_error": _last_llm_error["detail"]}
    models = _ollama_models()
    if models:
        return {"online": True, "models": models, "provider": "ollama"}
    return {"online": False, "models": [], "provider": "course-notes"}


# -------------------------------------------------------------------
# COURSE-NOTES RETRIEVAL (810 explained questions + 81 reference answers in backend/content)
# -------------------------------------------------------------------
def retrieve_topic(query: str) -> Optional[dict]:
    q = set(tokens(query))
    if not q:
        return None
    best, best_score = None, 0
    for content in TOPIC_CONTENT.values():
        name = set(tokens(content["topic"]))
        concepts = {t for c in content.get("key_concepts", []) for t in tokens(c)}
        score = 3 * len(q & name) + 2 * len(q & concepts)
        if score > best_score:
            best, best_score = content, score
    return best


def _closest(query: str, texts: list) -> int:
    qv = Counter(tokens(query))
    return max(range(len(texts)), key=lambda i: _cosine(qv, Counter(tokens(texts[i])))) if texts else -1


def notes_context(query: str) -> str:
    topic = retrieve_topic(query)
    if not topic:
        return ""
    ref = topic["references"][_closest(query, topic["references"])]
    return (f"\n\n## Course notes for this question (SB6202 topic: {topic['topic']})\n{ref}\n"
            f"Key concepts: {', '.join(topic.get('key_concepts', []))}\n"
            "Use these notes as ground truth; do not contradict them.")


def knowledge_answer(query: str) -> str:
    """A grounded answer built only from the course content, used when no LLM is reachable."""
    topic = retrieve_topic(query)
    if not topic:
        return ("I can help with any SB6202 topic — accuracy measures (MAE, RMSE, MAPE), smoothing and Holt-Winters, "
                "ACF/PACF, stationarity and the ADF test, ARIMA/SARIMA, VAR/SARIMAX, and ML models like Random Forest "
                "and XGBoost.\n\nWhich of these are you working on, and what exactly is confusing you?"
                "\n\n---\n*ARIA · answering from the SB6202 course notes*")
    refs = topic["references"]
    questions = topic.get("questions", [])
    qv = Counter(tokens(query))
    ranked = sorted(questions, key=lambda q: -_cosine(qv, Counter(tokens(q["q"] + " " + q["explanation"]))))
    traps = [q["explanation"] for q in ranked[:2]]
    check = next((q for q in ranked[2:] if q.get("difficulty") in ("easy", "medium")), ranked[0] if ranked else None)
    parts = [f"**{topic['topic']}**", refs[_closest(query, refs)]]
    if topic.get("key_concepts"):
        parts.append("**Key ideas:** " + ", ".join(topic["key_concepts"][:8]))
    if traps:
        parts.append("**Watch out for:**\n" + "\n".join(f"- {t}" for t in traps))
    if check:
        parts.append(f"**Quick check:** {check['q']}\n\nWhat would you answer, and why?")
    parts.append("---\n*ARIA · answering from the SB6202 course notes*")
    return "\n\n".join(parts)

def agent_chat(user_message: str, session_id: str = "default",
               page_context: Optional[str] = None, model: str = DEFAULT_MODEL) -> dict:
    misc_findings = detect_misconceptions(user_message)
    misc_prefix = ""
    if misc_findings:
        misc_prefix = (
            f"**Misconception Alert:**\n{misc_findings[0]['explanation']}\n\n"
            "Now addressing your question with the correct understanding:\n\n"
        )
    page_note = f"\n\n[Context: Student is on the **{page_context}** screen.]" if page_context else ""
    history = _trim_history(get_history(session_id))
    messages = [{"role": "system", "content": SYSTEM_PROMPT + page_note + notes_context(user_message)}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    raw_response = call_llm(messages, model)
    tool_calls_made = []
    tool_results_collected = []
    if raw_response is None:
        raw_response = knowledge_answer(user_message)
    for _ in range(2):
        tool_calls = parse_tool_calls(raw_response)
        if not tool_calls:
            break
        tool_result_texts = []
        for call in tool_calls:
            tool_name = call.get("tool", "")
            args = call.get("args", {})
            result_text = execute_tool(tool_name, args)
            tool_calls_made.append({"tool": tool_name, "args": args})
            tool_results_collected.append(result_text)
            tool_result_texts.append(f"[Tool: {tool_name}]\n{result_text}")
        messages.append({"role": "assistant", "content": raw_response})
        messages.append({"role": "user", "content": "Tool results:\n\n" + "\n\n---\n\n".join(tool_result_texts) + "\n\nNow give a complete pedagogical answer to the student using these results."})
        raw_response = call_llm(messages, model) or "\n\n".join(tool_result_texts)
    clean_reply = misc_prefix + strip_tool_calls(raw_response)
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": clean_reply})
    _conversation_histories[session_id] = history
    return {
        "reply": clean_reply,
        "tool_calls": tool_calls_made,
        "tool_results": tool_results_collected,
        "session_id": session_id,
        "timestamp": datetime.utcnow().isoformat()
    }
