import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, Users, BookOpen, RefreshCw, ChevronRight, Target } from 'lucide-react';
import { authFetch } from '../api';

const SEVERITY_COLORS = {
  high: 'var(--color-danger)',
  medium: 'var(--color-warn)',
  low: 'var(--color-ok)',
};

export default function TopicMisconceptionView() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/faculty/dashboard').then(res => res.ok ? res.json() : Promise.reject(new Error('Unable to load topic insights'))).then(payload => setData(payload.topic_relearn_aggregates || [])).catch(() => { setData([]); setError('Topic insights could not be loaded.'); }).finally(() => setLoading(false));
  }, []);

  const handleLaunch = async (topic, misconception) => {
    setLaunching(true);
    try {
      const res = await authFetch('/api/faculty/intervention/trigger', { method: 'POST', body: { topic, misconception, action: 'Schedule targeted clinic' } });
      if (!res.ok) throw new Error('Could not launch clinic');
      setLaunched(s => new Set([...s, topic]));
      setSelected(null);
      setError('');
    } catch {
      setError('The intervention clinic could not be launched.');
    } finally { setLaunching(false); }
  };

  const totalAffected = data.reduce((total, row) => total + row.students_affected, 0);
  const totalSuggestions = data.reduce((total, row) => total + row.relearn_suggestions, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <AlertTriangle size={20} color="var(--color-warn)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Topic-wise Misconceptions
          </h2>
        </div>
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.88rem' }}>
          Topics ranked by weak concepts recorded in completed student quizzes; each wrong answer is counted as a re-learn signal.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Topics with Signals', value: data.length, icon: BookOpen, color: 'var(--color-student)' },
          { label: 'Students Affected', value: totalAffected, icon: Users, color: 'var(--color-warn)' },
          { label: 'Re-learn Signals', value: totalSuggestions, icon: AlertTriangle, color: 'var(--color-danger)' },
          { label: 'Students Assessed', value: new Set(data.flatMap(row => row.student_ids || [])).size, icon: TrendingUp, color: 'var(--color-accent)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-tile" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Misconception List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? <div className="card" style={{ padding: 24 }}>Loading topic re-learn data…</div> : error ? <div className="card" style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div> : !data.length ? <div className="card" style={{ padding: 24, color: 'var(--color-text-3)' }}>No completed quiz attempts with weak-concept signals yet.</div> : null}
        <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Ranked by recorded weak-concept responses
        </h3>
        {!loading && !error && data.slice().sort((a, b) => b.relearn_suggestions - a.relearn_suggestions).map((item, i) => {
          const isLaunched = launched.has(item.topic);
          const pct = item.student_ids?.length ? Math.round((item.students_affected / item.student_ids.length) * 100) : 0;
          const signalColor = item.relearn_suggestions >= 5 ? SEVERITY_COLORS.high : item.relearn_suggestions >= 2 ? SEVERITY_COLORS.medium : SEVERITY_COLORS.low;
          const misconceptionLabels = item.top_misconceptions?.map(m => m.label) || [];
          return (
            <div
              key={item.topic}
              className="card"
              style={{
                padding: '16px 20px',
                cursor: 'pointer',
                border: selected?.topic === item.topic ? `2px solid ${signalColor}` : '1px solid var(--color-border)',
                transition: 'all 0.18s ease',
              }}
              onClick={() => setSelected(s => s?.topic === item.topic ? null : item)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* rank */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: signalColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                }}>#{i + 1}</div>

                {/* topic */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.topic}</span>
                    <span className="badge badge-warn" style={{ fontSize: '0.65rem' }}>{item.module}</span>
                    {isLaunched && <span className="badge badge-ok" style={{ fontSize: '0.65rem' }}>Clinic Launched</span>}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', lineHeight: 1.4 }}>{misconceptionLabels[0] || `${item.relearn_suggestions} incorrect quiz responses recorded`}</p>
                </div>

                {/* bar */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>{item.students_affected}/{item.student_ids?.length || 0} students</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: signalColor, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: signalColor }} />
                  </div>
                </div>

                {/* suggest count */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: signalColor, fontVariantNumeric: 'tabular-nums' }}>{item.relearn_suggestions}×</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)' }}>incorrect<br />responses</div>
                </div>

                <ChevronRight size={16} color="var(--color-text-3)" style={{ transform: selected?.topic === item.topic ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }} />
              </div>

              {/* Expanded Detail */}
              {selected?.topic === item.topic && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(160,74,58,0.07)', border: '1px solid rgba(160,74,58,0.18)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Common Error</div>
                      <p style={{ fontSize: '0.83rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>{misconceptionLabels[0] || `${item.relearn_suggestions} incorrect quiz responses recorded`}</p>
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(74,127,90,0.07)', border: '1px solid rgba(74,127,90,0.18)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ok)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Correct Understanding</div>
                      <p style={{ fontSize: '0.83rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>{misconceptionLabels.length ? misconceptionLabels.join(', ') : 'No specific misconception category recorded.'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-3)' }}>
                      {item.relearn_suggestions} incorrect responses recorded across {item.students_affected} students.
                    </div>
                    <button
                      className="btn btn-faculty"
                      disabled={isLaunched || launching}
                      onClick={(e) => { e.stopPropagation(); handleLaunch(item.topic, misconceptionLabels[0]); }}
                      style={{ fontSize: '0.82rem' }}
                    >
                      {launching ? <RefreshCw size={13} className="animate-spin" /> : <Target size={13} />}
                      {isLaunched ? 'Clinic Launched' : 'Launch Intervention Clinic'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
