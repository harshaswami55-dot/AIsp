import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Award, Zap, HelpCircle, AlertCircle,
  TrendingUp, RefreshCw, CheckCircle2, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function IndependenceModeView() {
  const [challenge, setChallenge] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(2);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintText, setHintText] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchChallenge = async () => {
    try {
      const res = await fetch('/api/independence/challenge');
      const data = await res.json();
      setChallenge(data);
      setCurrentLevel(data.current_scaffolding_level || 2);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestHint = async () => {
    try {
      const res = await fetch(`/api/independence/hint?level=${currentLevel}`, { method: 'POST' });
      const data = await res.json();
      setHintText(data.hint);
      setHintsUsed(prev => prev + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitSolution = async () => {
    if (!selectedModel) {
      alert("Please choose your independent model solution first.");
      return;
    }

    setSubmitting(true);
    const isCorrect = (selectedModel === challenge?.correct_choice);

    try {
      const res = await fetch('/api/independence/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          current_level: currentLevel,
          hints_used: hintsUsed,
          selected_model: selectedModel,
          is_correct: isCorrect
        })
      });
      const data = await res.json();
      setResult(data);

      if (isCorrect) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const levels = [
    { num: 0, title: "Full AI Guidance", desc: "Step-by-step walkthrough" },
    { num: 1, title: "Guiding Questions", desc: "Socratic inquiry prompts" },
    { num: 2, title: "Small Hints", desc: "1 strategic hint on request" },
    { num: 3, title: "Concept Reminder", desc: "Syllabus formula reminder" },
    { num: 4, title: "No Solution Help", desc: "Output validation only" },
    { num: 5, title: "Pure Independence", desc: "Autonomous forecaster" }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Banner */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-emerald">Primary Platform Innovation</span>
              <span className="badge badge-blue">Progressive Fading Scaffolding</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              AI Independence Mode
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
              "Don't build students who are better at using AI. Build students who are better because of AI."
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 700 }}>AUTONOMOUS READINESS</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
              +32 pp Gain
            </div>
          </div>
        </div>
      </div>

      {/* Scaffolding Fading Stepper (Levels 0 to 5) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '14px' }}>
          Progressive AI Fading Ladder (Current: Level {currentLevel})
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          {levels.map(lvl => {
            const isCurrent = lvl.num === currentLevel;
            const isCompleted = lvl.num < currentLevel;

            return (
              <div
                key={lvl.num}
                style={{
                  background: isCurrent ? 'rgba(59, 130, 246, 0.25)' : (isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)'),
                  border: isCurrent ? '2px solid #3b82f6' : (isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)'),
                  padding: '12px 8px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isCurrent ? '#3b82f6' : (isCompleted ? '#10b981' : 'rgba(255,255,255,0.1)'),
                  margin: '0 auto 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#ffffff'
                }}>
                  {lvl.num}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCurrent ? '#ffffff' : '#cbd5e1' }}>
                  {lvl.title}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                  {lvl.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Unseen Challenge */}
      {challenge && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span className="badge badge-purple" style={{ marginBottom: '6px' }}>UNSEEN ASSESSMENT CHALLENGE</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                {challenge.title}
              </h3>
            </div>
            <span className="badge badge-amber">{challenge.level_title}</span>
          </div>

          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '20px' }}>
            {challenge.business_problem}
          </p>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              AI FADING SCAFFOLDING RULE
            </span>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
              {challenge.fading_rule}
            </p>
          </div>

          {/* Hint Trigger */}
          <div style={{ marginBottom: '24px' }}>
            {hintText ? (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fcd34d' }}>STRATEGIC HINT</span>
                <p style={{ fontSize: '0.88rem', color: '#ffffff', marginTop: '4px' }}>{hintText}</p>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem' }}
                onClick={handleRequestHint}
                disabled={hintsUsed >= 1}
              >
                <HelpCircle size={14} /> Request Level 2 Strategic Hint ({1 - hintsUsed} remaining)
              </button>
            )}
          </div>

          {/* Candidate Models to Select */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              Select the Most Appropriate Forecasting Algorithm:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {challenge.available_models?.map((model, i) => {
                const isSelected = selectedModel === model;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedModel(model)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {model}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            className="btn btn-emerald"
            style={{ marginTop: '24px', width: '100%', padding: '12px' }}
            disabled={submitting || !selectedModel}
            onClick={handleSubmitSolution}
          >
            {submitting ? 'Evaluating...' : 'Submit Independent Forecast Solution'} <ShieldCheck size={16} />
          </button>
        </div>
      )}

      {/* Results Card */}
      {result && (
        <div className="glass-panel-glow" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              Independence Performance Analytics
            </h3>
            <span className={`badge ${result.is_correct ? 'badge-emerald' : 'badge-amber'}`}>
              {result.readiness_verdict}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Initial Unaided</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#94a3b8' }}>
                {result.initial_unaided_score}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Supported Score</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
                {result.supported_performance}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Final Unaided</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                {result.final_unaided_score}%
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>INDEPENDENCE GAIN</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                {result.ai_independence_gain}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            {result.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
