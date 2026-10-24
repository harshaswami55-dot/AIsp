import React, { useState, useEffect } from 'react';
import { Activity, Coffee, TrendingDown, TrendingUp, Clock, Brain, AlertTriangle, CheckCircle2, BarChart3, Zap, Moon, RefreshCw } from 'lucide-react';
import { authFetch } from '../api';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const FATIGUE_LEVELS = [
  { label: 'Fresh', color: 'var(--color-ok)', min: 0, max: 20 },
  { label: 'Focused', color: 'var(--color-student)', min: 20, max: 45 },
  { label: 'Moderate', color: 'var(--color-warn)', min: 45, max: 70 },
  { label: 'Fatigued', color: 'var(--color-danger)', min: 70, max: 100 },
];

function getFatigueLevel(score) {
  return FATIGUE_LEVELS.find(l => score >= l.min && score < l.max) || FATIGUE_LEVELS[3];
}

const SESSION_DATA = [
  { session: 'Mon AM', duration: 42, score: 88, fatigue: 28 },
  { session: 'Mon PM', duration: 67, score: 71, fatigue: 55 },
  { session: 'Tue AM', duration: 31, score: 92, fatigue: 18 },
  { session: 'Tue PM', duration: 58, score: 79, fatigue: 48 },
  { session: 'Wed AM', duration: 75, score: 64, fatigue: 72 },
  { session: 'Wed PM', duration: 25, score: 91, fatigue: 22 },
  { session: 'Thu AM', duration: 50, score: 83, fatigue: 40 },
];

const SUGGESTIONS = [
  { icon: Coffee, title: 'Take a 10-minute break', detail: 'Your session has exceeded 50 minutes. A short walk improves retention by up to 20%.', trigger: 60 },
  { icon: Moon, title: 'Switch to lighter content', detail: 'Complex ARIMA modelling is best tackled fresh. Review summary notes instead.', trigger: 65 },
  { icon: Brain, title: 'Spaced repetition mode', detail: 'Switch to short flashcard-style review to retain today\'s learning without overloading.', trigger: 50 },
  { icon: Zap, title: 'Try a different topic', detail: 'Lateral practice on ACF/PACF could refresh your perspective on stationarity concepts.', trigger: 40 },
];

export default function LearningFatigueView({ currentUser }) {
  const [currentFatigue, setCurrentFatigue] = useState(48);
  const [sessionMinutes, setSessionMinutes] = useState(52);
  const [questionsAttempted, setQuestionsAttempted] = useState(14);
  const [scoreTrajectory, setScoreTrajectory] = useState(-8);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [sessionHistory, setSessionHistory] = useState(SESSION_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;
    authFetch(`/api/fatigue/history/${currentUser.id}`)
      .then(res => { if (!res.ok) throw new Error('Could not load fatigue history'); return res.json(); })
      .then(rows => {
        if (rows.length) setSessionHistory(rows.map((r, i) => ({
          session: r.recorded_at ? new Date(r.recorded_at).toLocaleDateString(undefined, { weekday: 'short' }) : `Session ${i + 1}`,
          duration: r.session_minutes,
          fatigue: r.fatigue_score,
          score: r.quiz_score ?? 0,
        })));
      })
      .catch(() => setError('Could not load saved fatigue history.'));
  }, [currentUser?.id]);

  const level = getFatigueLevel(currentFatigue);
  const activeSuggestions = SUGGESTIONS.filter(s => currentFatigue >= s.trigger);

  const logFatigue = async (breakTaken = false) => {
    if (!currentUser?.id) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/fatigue/log', {
        method: 'POST',
        body: { user_id: currentUser.id, session_minutes: sessionMinutes, fatigue_score: currentFatigue, quiz_score: null, break_taken: breakTaken },
      });
      if (!res.ok) throw new Error('Could not log fatigue');
      setSessionHistory(prev => [...prev, { session: new Date().toLocaleDateString(undefined, { weekday: 'short' }), duration: sessionMinutes, fatigue: breakTaken ? Math.max(0, currentFatigue - 30) : currentFatigue, score: 0 }].slice(-14));
    } catch {
      setError('Could not save this fatigue session. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Activity size={20} color="var(--color-warn)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                Learning Fatigue Monitor
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-3)', fontSize: '0.88rem' }}>
              AI tracks your cognitive load in real-time and adapts recommendations to keep you in optimal learning state.
            </p>
          </div>
          <div style={{
            padding: '10px 18px', borderRadius: 'var(--radius-lg)',
            background: level.color, color: '#fff',
            fontWeight: 700, fontSize: '0.9rem',
            boxShadow: 'var(--shadow-md)',
          }}>
            {level.label} State
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Fatigue Score', value: `${currentFatigue}%`, icon: Activity, color: level.color, sub: level.label },
          { label: 'Session Duration', value: `${sessionMinutes} min`, icon: Clock, color: 'var(--color-student)', sub: sessionMinutes > 50 ? 'Consider a break' : 'Good pace' },
          { label: 'Questions Done', value: questionsAttempted, icon: BarChart3, color: 'var(--color-accent)', sub: 'This session' },
          { label: 'Score Trend', value: `${scoreTrajectory > 0 ? '+' : ''}${scoreTrajectory}%`, icon: scoreTrajectory >= 0 ? TrendingUp : TrendingDown, color: scoreTrajectory >= 0 ? 'var(--color-ok)' : 'var(--color-danger)', sub: scoreTrajectory < 0 ? 'Declining — rest may help' : 'Improving' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="stat-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Fatigue Gauge */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>Current Fatigue Level</h3>
          <div style={{ position: 'relative', paddingBottom: 16 }}>
            {/* Gauge track */}
            <div style={{ height: 18, borderRadius: 9999, overflow: 'hidden', background: 'var(--color-surface-3)', boxShadow: 'var(--shadow-inset)', marginBottom: 8 }}>
              <div style={{
                height: '100%', borderRadius: 9999,
                width: `${currentFatigue}%`,
                background: `linear-gradient(90deg, var(--color-ok) 0%, var(--color-warn) 60%, var(--color-danger) 100%)`,
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            {/* Ticks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-3)' }}>
              {FATIGUE_LEVELS.map(l => <span key={l.label} style={{ color: l.color, fontWeight: 600 }}>{l.label}</span>)}
            </div>
          </div>

          <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={15} color={level.color} />
              <span style={{ fontWeight: 700, color: level.color, fontSize: '0.85rem' }}>AI Assessment</span>
            </div>
            <p style={{ fontSize: '0.83rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              {currentFatigue >= 70
                ? 'High cognitive load detected. Your response accuracy has dropped significantly. A break is strongly recommended before continuing with new material.'
                : currentFatigue >= 45
                ? 'Moderate fatigue detected. You\'re approaching your threshold. Consider switching to review rather than new concepts.'
                : currentFatigue >= 20
                ? 'You\'re performing well. Maintain current pace and difficulty level.'
                : 'Excellent focus state. Ideal time to tackle challenging new material.'}
            </p>
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
            onClick={() => setShowBreakModal(true)}
            disabled={saving}
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Coffee size={15} />} Take a Break Now
          </button>
          {error && <p role="alert" style={{ marginTop: 10, color: 'var(--color-danger)', fontSize: '0.8rem' }}>{error}</p>}
        </div>

        {/* Session History Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>Session Fatigue History</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sessionHistory} margin={{ top: 8, right: 12, bottom: 18, left: -12 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="session" tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-md)', borderRadius: 8, color: 'var(--color-text)' }} formatter={(value) => [`${value}%`, 'Fatigue']} />
              <Bar dataKey="fatigue" name="Fatigue" fill="var(--color-student)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
          <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => logFatigue(false)} disabled={saving}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Log this session
          </button>
          <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingDown size={12} color="var(--color-warn)" />
            Score drops correlate with fatigue above 55% — optimal sessions are under 40 min.
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {activeSuggestions.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Brain size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)' }}>AI Recommendations</h3>
            <span className="badge badge-gold">{activeSuggestions.length} active</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {activeSuggestions.map(({ icon: Icon, title, detail }) => (
              <div key={title} style={{
                padding: '16px 18px', borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,122,46,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color="var(--color-accent)" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>{title}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>{detail}</p>
                <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 10px', alignSelf: 'flex-start' }}>
                  Apply suggestion
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Break Modal */}
      {showBreakModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(44,36,22,0.5)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
          onClick={() => setShowBreakModal(false)}
        >
          <div className="card-raised" style={{ maxWidth: 380, width: '100%', padding: 32, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <Coffee size={40} color="var(--color-accent)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>
              Break Time
            </h3>
            <p style={{ color: 'var(--color-text-2)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 20 }}>
              Step away from the screen for 10 minutes. Research shows a short break at this fatigue level improves subsequent session score by an average of 17%.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={async () => { await logFatigue(true); setCurrentFatigue(Math.max(0, currentFatigue - 30)); setShowBreakModal(false); }}>
                Break taken ✓
              </button>
              <button className="btn btn-ghost" onClick={() => setShowBreakModal(false)}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
