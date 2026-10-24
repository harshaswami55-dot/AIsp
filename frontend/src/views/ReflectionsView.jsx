import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Star, RefreshCw, ChevronDown, ChevronUp, Lightbulb, CheckCircle2, Edit3, Trash2, Brain } from 'lucide-react';
import { authFetch } from '../api';

const TOPICS = [
  'ADF Test & Stationarity',
  'ACF & PACF Interpretation',
  'ARIMA Model Selection',
  'SARIMA for Seasonal Data',
  'Model Diagnostics',
];

const INITIAL_REFLECTIONS = [
  {
    id: 1,
    topic: 'ADF Test & Stationarity',
    date: '2026-10-20',
    understanding: 'I now understand that the ADF test\'s null hypothesis is that the series HAS a unit root (non-stationary). I used to get this backwards.',
    confusion: 'Still confused about when to use trend vs intercept specifications in the ADF test.',
    keyInsight: 'A p-value < 0.05 means we REJECT non-stationarity — the series IS stationary.',
    selfScore: 4,
    aiSuggested: true,
  },
  {
    id: 2,
    topic: 'ACF & PACF Interpretation',
    date: '2026-10-18',
    understanding: 'Learned that ACF tailing off + PACF cutting off at lag q indicates an AR(q) process.',
    confusion: 'Mixed processes are still tricky — when both tail off slowly, I find it hard to determine the right orders.',
    keyInsight: 'For ARIMA, I look at the differenced series ACF/PACF, not the original.',
    selfScore: 3,
    aiSuggested: false,
  },
];

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange?.(n)} style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', padding: 0, lineHeight: 1 }}>
          <Star size={18} fill={n <= value ? 'var(--color-accent)' : 'none'} color={n <= value ? 'var(--color-accent)' : 'var(--color-text-3)'} />
        </button>
      ))}
    </div>
  );
}

function ReflectionCard({ reflection, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{reflection.topic}</span>
            {reflection.aiSuggested && <span className="badge badge-gold">AI Suggested</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{reflection.date}</span>
            <StarRating value={reflection.selfScore} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={(e) => { e.stopPropagation(); onDelete(reflection.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4 }}>
            <Trash2 size={15} />
          </button>
          {expanded ? <ChevronUp size={16} color="var(--color-text-3)" /> : <ChevronDown size={16} color="var(--color-text-3)" />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--color-surface-2)' }}>
          {[
            { label: 'What I understood', icon: CheckCircle2, color: 'var(--color-ok)', text: reflection.understanding },
            { label: 'What I\'m still confused about', icon: Brain, color: 'var(--color-warn)', text: reflection.confusion },
            { label: 'Key insight', icon: Lightbulb, color: 'var(--color-accent)', text: reflection.keyInsight },
          ].map(({ label, icon: Icon, color, text }) => (
            <div key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <Icon size={14} color={color} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-2)', lineHeight: 1.6, paddingLeft: 20 }}>{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReflectionsView({ currentUser }) {
  const [reflections, setReflections] = useState(INITIAL_REFLECTIONS);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ topic: TOPICS[0], understanding: '', confusion: '', keyInsight: '', selfScore: 3 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;
    authFetch(`/api/reflections/${currentUser.id}`)
      .then(res => { if (!res.ok) throw new Error('Could not load reflections'); return res.json(); })
      .then(rows => setReflections(rows.map(row => ({
        id: row.id,
        topic: row.topic_name || TOPICS[0],
        topicId: row.topic_id,
        understanding: row.understanding,
        confusion: row.confusion,
        keyInsight: row.key_insight,
        selfScore: row.self_score,
        aiSuggested: row.ai_suggested,
        date: row.created_at?.slice(0, 10) || '',
      }))))
      .catch(() => setError('Could not load saved reflections.'));
  }, [currentUser?.id]);

  const handleSave = async () => {
    if (!form.understanding.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/reflections', {
        method: 'POST',
        body: {
          user_id: currentUser?.id,
          topic_id: null,
          topic_name: form.topic,
          understanding: form.understanding.trim(),
          confusion: form.confusion.trim(),
          key_insight: form.keyInsight.trim(),
          self_score: form.selfScore,
          ai_suggested: false,
        },
      });
      if (!res.ok) throw new Error('Could not save reflection');
      const saved = await res.json();
      setReflections(prev => [{ id: saved.id, ...form, date: new Date().toISOString().slice(0, 10), aiSuggested: false }, ...prev]);
      setForm({ topic: TOPICS[0], understanding: '', confusion: '', keyInsight: '', selfScore: 3 });
      setShowNew(false);
    } catch {
      setError('Could not save reflection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      const res = await authFetch(`/api/reflections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete reflection');
      setReflections(prev => prev.filter(r => r.id !== id));
    } catch {
      setError('Could not delete reflection. Please try again.');
    }
  };

  const avgScore = reflections.length ? (reflections.reduce((a, r) => a + r.selfScore, 0) / reflections.length).toFixed(1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <BookOpen size={20} color="var(--color-accent)" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                Learning Reflections
              </h2>
            </div>
            <p style={{ color: 'var(--color-text-3)', fontSize: '0.88rem' }}>
              Record what you understood, what confused you, and key insights after each learning session. AI uses these to guide your next steps.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(s => !s)}>
            <Plus size={15} /> New Reflection
          </button>
        </div>
      </div>

      {error && <p role="alert" className="card" style={{ padding: 12, color: 'var(--color-danger)' }}>{error}</p>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Reflections', value: reflections.length, color: 'var(--color-student)' },
          { label: 'Avg. Self-Score', value: `${avgScore}/5`, color: 'var(--color-accent)' },
          { label: 'AI Suggested', value: reflections.filter(r => r.aiSuggested).length, color: 'var(--color-faculty)' },
          { label: 'Topics Covered', value: new Set(reflections.map(r => r.topic)).size, color: 'var(--color-dean)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-tile" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* New Reflection Form */}
      {showNew && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>Add Reflection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topic</label>
              <select value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
                {TOPICS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {[
              { key: 'understanding', label: 'What I understood', placeholder: 'Describe in your own words what clicked for you...' },
              { key: 'confusion', label: 'What I\'m still confused about', placeholder: 'Be specific about the gap...' },
              { key: 'keyInsight', label: 'Key insight / aha moment', placeholder: 'The one thing you\'ll remember...' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                <textarea
                  rows={2}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>
            ))}

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Self-assessment</label>
              <StarRating value={form.selfScore} onChange={v => setForm(f => ({ ...f, selfScore: v }))} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.understanding.trim() || saving}>
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? 'Saving…' : 'Save Reflection'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Reflection list */}
      <div>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Your Reflections ({reflections.length})
        </h3>
        {reflections.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <BookOpen size={32} color="var(--color-text-3)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--color-text-3)' }}>No reflections yet. Add your first one above.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reflections.map(r => (
              <ReflectionCard key={r.id} reflection={r} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
