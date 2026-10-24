import React, { useState, useEffect } from 'react';
import { authFetch, apiFetch } from '../api';
import {
  HelpCircle, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  Award, Sparkles, RefreshCw, BarChart2, Check
} from 'lucide-react';

export default function DiagnosticTestView({ currentUser, onComplete, onNavigate }) {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/diagnostic/questions');
      if (!res.ok) throw new Error('Diagnostic questions could not be loaded.');
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (e) {
      setError(e.message || 'Diagnostic questions could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await authFetch('/api/diagnostic/submit', {
        method: 'POST',
        body: { user_id: currentUser.id, answers }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Diagnostic submission failed.');
      setResult(data);
      if (onComplete) onComplete(data);
    } catch (e) {
      setError(e.message || 'Diagnostic submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={32} color="#3b82f6" style={{ margin: '0 auto 16px' }} />
        <h3>Loading RV University SB6202 Diagnostic Assessment...</h3>
      </div>
    );
  }

  if (error && !questions.length) {
    return <div className="card" role="alert" style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;
  }

  if (!questions.length) {
    return <div className="card" role="status" style={{ padding: 24 }}>No diagnostic questions are available.</div>;
  }

  // Result View
  if (result) {
    const {
      score_percentage,
      mastery_level,
      correct_answers,
      total_questions,
      module_mastery = {},
      detected_gaps = {},
      recommendation
    } = result;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Result Header */}
        <div className="glass-panel-glow" style={{ padding: '30px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#60a5fa' }}>
            <Award size={36} />
          </div>
          <span className="badge badge-purple" style={{ marginBottom: '8px' }}>DIAGNOSTIC TEST EVALUATION COMPLETE</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
            Diagnostic Mastery: {score_percentage}%
          </h2>
          <p style={{ color: '#93c5fd', fontSize: '1.05rem', marginTop: '4px' }}>
            Classification: <strong>{mastery_level}</strong> ({correct_answers} of {total_questions} questions correct)
          </p>

          <p style={{ maxWidth: '650px', margin: '16px auto 0', color: '#cbd5e1', fontSize: '0.92rem' }}>
            {recommendation}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '24px' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('path')}>
              View Personalized Learning Path <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('lab')}>
              Open Forecasting Lab
            </button>
            <button className="btn btn-secondary" onClick={() => { setResult(null); setAnswers({}); setCurrentIndex(0); }}>
              Retake Diagnostic
            </button>
          </div>
        </div>

        {/* Breakdown by Module & Gaps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Module Mastery */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Module-by-Module Diagnostic Mastery
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(module_mastery).map(([modNum, score]) => (
                <div key={modNum} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>Module {modNum}</span>
                    <span style={{ fontWeight: 700, color: score >= 70 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#f43f5e') }}>
                      {score}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${score}%`, height: '100%', background: score >= 70 ? '#10b981' : (score >= 50 ? '#f59e0b' : '#f43f5e') }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Identified Learning Gaps */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Identified Learning Gaps (By Category)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(detected_gaps).map(([category, items]) => {
                if (!items || items.length === 0) return null;
                return (
                  <div key={category} style={{ background: 'rgba(244, 63, 94, 0.05)', padding: '12px 14px', borderRadius: '10px', borderLeft: '3px solid #f43f5e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#fda4af' }}>
                        {category.replace('_', ' ')} Gaps ({items.length})
                      </span>
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                      {items.slice(0, 2).map((item, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>
                          {item.explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Test View
  const currentQ = questions[currentIndex] || {};
  const answeredCount = Object.keys(answers).length;
  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '880px', margin: '0 auto' }}>
      {/* Test Header */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              Diagnostic Assessment — Business Forecasting (SB6202)
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              {questions.length} Questions across all 5 Modules • Evaluates Conceptual, Calculation, Model Selection, & Interpretation
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-blue">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              {answeredCount} Answered
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-panel-glow" style={{ padding: '30px' }}>
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <span className="badge badge-purple">Module {currentQ.module_id}</span>
          <span className="badge badge-blue">{currentQ.course_outcome}</span>
          <span className="badge badge-amber">{currentQ.difficulty}</span>
          <span className="badge badge-emerald">Bloom's: {currentQ.blooms_level}</span>
          <span className="badge badge-rose" style={{ textTransform: 'capitalize' }}>{currentQ.category}</span>
        </div>

        {/* Question Text */}
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.6, marginBottom: '24px' }}>
          {currentQ.question_text}
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentQ.options?.map((opt, i) => {
            const isSelected = answers[currentQ.id] === opt;
            return (
              <div
                key={i}
                onClick={() => handleSelectOption(currentQ.id, opt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: isSelected ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSelected ? '#3b82f6' : 'transparent'
                }}>
                  {isSelected && <Check size={12} color="#ffffff" />}
                </div>
                <span style={{ fontSize: '0.95rem', color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                  {opt}
                </span>
              </div>
            );
          })}
        </div>

        {error && <p role="alert" style={{ color: 'var(--color-danger)', marginTop: 16 }}>{error}</p>}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            className="btn btn-secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          >
            <ArrowLeft size={16} /> Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentIndex(prev => prev + 1)}
            >
              Next Question <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-emerald"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Evaluating...' : 'Submit Diagnostic Test'} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
