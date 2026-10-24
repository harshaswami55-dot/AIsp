import React, { useState } from 'react';
import { authFetch } from '../api';
import {
  GraduationCap, Send, CheckCircle2, AlertTriangle, Award,
  Sparkles, RefreshCw, BarChart2
} from 'lucide-react';

export default function TeachAIView() {
  const [topic, setTopic] = useState('MAPE');
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const samplePrompts = [
    { title: "Explain MAPE to me", topic: "MAPE", prompt: "Explain how Mean Absolute Percentage Error is calculated, why executives use it, and what happens when actual sales equal zero." },
    { title: "Explain ARIMA", topic: "ARIMA", prompt: "Explain the three components of ARIMA(p,d,q), how stationarity is required, and how an operations director benefits from it." },
    { title: "Why Stationarity Matters", topic: "Stationarity", prompt: "Explain why time series stationarity is required before Box-Jenkins modeling and how the ADF test verifies it." },
    { title: "ARIMA vs SARIMA", topic: "SARIMA", prompt: "Explain why regular differencing d=1 is insufficient for seasonal data and how SARIMA(p,d,q)x(P,D,Q)_s models recurring annual waves." },
    { title: "When to Use XGBoost", topic: "XGBoost", prompt: "Explain how supervised ML uses lag features to forecast demand and when XGBoost outperforms classical ARIMA." }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!explanation.trim()) return;

    setSubmitting(true);
    try {
      const res = await authFetch('/api/ai/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, explanation })
      });
      const data = await res.json();
      setEvaluation(data);
    } catch (err) {
      console.error(err);
      alert("Evaluation failed. Please verify backend connectivity.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd' }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
              Teach-the-AI Mode
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              "The highest proof of mastery is the ability to teach." Explain a forecasting concept in your own words. The AI evaluates you against the RV University CIE Rubric.
            </p>
          </div>
        </div>
      </div>

      {/* Concept Selector Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            className={`btn ${topic === p.topic ? 'btn-purple' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            onClick={() => {
              setTopic(p.topic);
              setEvaluation(null);
            }}
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Main Form & Evaluation Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: evaluation ? '1fr 1fr' : '1fr', gap: '20px' }}>
        {/* Input Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '0.78rem', color: '#c4b5fd', fontWeight: 700 }}>SELECTED TOPIC</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
              Explain: {topic}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
              {samplePrompts.find(p => p.topic === topic)?.prompt}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              rows="10"
              placeholder="Write your explanation here. Include formulas, reasons, business implications, and potential pitfalls..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              style={{ lineHeight: 1.6 }}
            />

            <button
              type="submit"
              className="btn btn-purple"
              style={{ width: '100%', padding: '12px' }}
              disabled={submitting || !explanation.trim()}
            >
              {submitting ? 'AI Rubric Evaluating...' : 'Submit Explanation for Rubric Grading'} <Send size={16} />
            </button>
          </form>
        </div>

        {/* Evaluation Output */}
        {evaluation && (
          <div className="glass-panel-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Score Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>EVALUATION SCORE</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#c4b5fd' }}>
                  {evaluation.overall_score}%
                </div>
              </div>
              <span className={`badge ${evaluation.overall_score >= 80 ? 'badge-emerald' : (evaluation.overall_score >= 60 ? 'badge-blue' : 'badge-amber')}`} style={{ fontSize: '0.85rem' }}>
                {evaluation.grade}
              </span>
            </div>

            {/* Rubric Breakdown */}
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                RV University CIE Rubric Breakdown
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(evaluation.rubric_breakdown || {}).map(([crit, data]) => (
                  <div key={crit} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                    <span style={{ textTransform: 'capitalize', color: '#cbd5e1' }}>
                      {crit.replace(/_/g, ' ')} ({data.weight})
                    </span>
                    <span style={{ fontWeight: 700, color: data.score >= 3 ? '#10b981' : (data.score === 2 ? '#f59e0b' : '#f43f5e') }}>
                      Level {data.score} / {data.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Misconceptions Alert */}
            {evaluation.detected_misconceptions?.length > 0 && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '12px 14px', borderRadius: '10px', borderLeft: '3px solid #f43f5e' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fda4af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} /> Misconception Detected
                </div>
                {evaluation.detected_misconceptions.map((m, i) => (
                  <p key={i} style={{ fontSize: '0.82rem', color: '#f8fafc', marginTop: '4px' }}>
                    {m}
                  </p>
                ))}
              </div>
            )}

            {/* Feedback */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '14px', borderRadius: '10px', borderLeft: '3px solid #3b82f6' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#93c5fd' }}>AI TUTOR FEEDBACK</span>
              <p style={{ fontSize: '0.85rem', color: '#f1f5f9', marginTop: '4px', lineHeight: 1.6 }}>
                {evaluation.ai_tutor_feedback}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
