import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronRight, Target, BarChart3, ListOrdered } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Stagger, SectionTitle, Skeleton } from '../components/ui';

const SEVERITY_COLORS = {
  high: 'var(--color-danger)',
  medium: 'var(--color-warn)',
  low: 'var(--color-ok)',
};
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

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
  const ranked = data.slice().sort((a, b) => b.relearn_suggestions - a.relearn_suggestions);
  const maxSuggestions = ranked[0]?.relearn_suggestions || 1;
  const colorOf = n => (n >= 5 ? SEVERITY_COLORS.high : n >= 2 ? SEVERITY_COLORS.medium : SEVERITY_COLORS.low);
  const ready = !loading && !error;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <style>{".pill-live::before { display: none; }"}</style>
      <PageHero
        icon={AlertTriangle}
        tone="faculty"
        eyebrow="Relearn signals"
        title="Topic-wise Misconceptions"
        subtitle="Topics ranked by the number of times each topic is suggested for students to learn again — every wrong answer in a completed quiz counts as a relearn signal."
        stats={[
          { label: 'Topics needing relearning', value: ready ? data.length : null },
          { label: 'Relearn suggestions', value: ready ? totalSuggestions : null },
          { label: 'Students affected', value: ready ? totalAffected : null },
          { label: 'Students assessed', value: ready ? new Set(data.flatMap(row => row.student_ids || [])).size : null },
        ]}
      />

      {loading ? <Skeleton rows={3} height={80} />
        : error ? <div className="card" role="alert" style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>
        : !data.length ? <div className="card" style={{ padding: 24, color: 'var(--color-text-3)' }}>No completed quiz attempts with weak-concept signals yet.</div>
        : null}

      {ready && ranked.length > 0 && (
        <div className="card reveal" style={{ padding: 20, '--delay': '150ms' }}>
          <SectionTitle icon={BarChart3} right={<span style={{ fontSize: '.75rem', color: 'var(--color-text-3)' }}>Relearn suggestions per topic</span>}>
            Most suggested for relearning
          </SectionTitle>
          <div style={{ display: 'grid', gap: 10 }}>
            {ranked.map((item, i) => {
              const color = colorOf(item.relearn_suggestions);
              return (
                <button key={item.topic} type="button" onClick={() => setSelected(s => s?.topic === item.topic ? null : item)}
                  aria-pressed={selected?.topic === item.topic}
                  style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 32%) 1fr auto', gap: 10, alignItems: 'center', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                  <span style={{ fontSize: '.8rem', fontWeight: selected?.topic === item.topic ? 800 : 600, color: 'var(--color-text-2)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{item.topic}</span>
                  <div className="progress-track" style={{ height: 12 }}>
                    <div className="progress-fill" style={{ width: `${(item.relearn_suggestions / maxSuggestions) * 100}%`, background: color, animationDelay: `${200 + i * 70}ms` }} />
                  </div>
                  <strong style={{ fontSize: '.85rem', color, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>{item.relearn_suggestions}×</strong>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {ready && ranked.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          <SectionTitle icon={ListOrdered}>Ranked by recorded weak-concept responses</SectionTitle>
          <Stagger start={250} step={60} style={{ display: 'grid', gap: 10 }}>
            {ranked.map((item, i) => {
              const isLaunched = launched.has(item.topic);
              const isSelected = selected?.topic === item.topic;
              const pct = item.student_ids?.length ? Math.round((item.students_affected / item.student_ids.length) * 100) : 0;
              const signalColor = colorOf(item.relearn_suggestions);
              const misconceptionLabels = item.top_misconceptions?.map(m => m.label) || [];
              return (
                <div
                  key={item.topic}
                  className="card hover-lift"
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    borderColor: isSelected ? signalColor : undefined,
                    boxShadow: isSelected ? `0 0 0 2px ${signalColor}, var(--shadow-lg)` : undefined,
                    background: isSelected ? `linear-gradient(90deg, ${tint(signalColor, 8)}, var(--color-surface) 60%)` : undefined,
                  }}
                  onClick={() => setSelected(s => s?.topic === item.topic ? null : item)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: tint(signalColor, 15), border: `1.5px solid ${signalColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: signalColor, fontWeight: 800, fontSize: '0.78rem',
                    }}>#{i + 1}</div>

                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>{item.topic}</span>
                        <span className="badge badge-faculty" style={{ fontSize: '0.65rem' }}>{item.module}</span>
                        {isLaunched && <span className="badge badge-ok" style={{ fontSize: '0.65rem' }}>Clinic Launched</span>}
                        {!isLaunched && item.relearn_suggestions >= 5 && <span className="badge badge-danger pill-live" style={{ fontSize: '0.65rem' }}><span className="pulse-dot" /> High</span>}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', lineHeight: 1.4, margin: 0 }}>{misconceptionLabels[0] || `${item.relearn_suggestions} incorrect quiz responses recorded`}</p>
                    </div>

                    <div style={{ width: 120, flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>{item.students_affected}/{item.student_ids?.length || 0} students</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: signalColor, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: signalColor }} />
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: signalColor, fontVariantNumeric: 'tabular-nums' }}>{item.relearn_suggestions}×</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)' }}>incorrect<br />responses</div>
                    </div>

                    <ChevronRight size={16} color="var(--color-text-3)" style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }} />
                  </div>

                  {isSelected && (
                    <div className="reveal" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                        <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: tint('var(--color-danger)', 8), border: `1px solid ${tint('var(--color-danger)', 22)}` }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Common Error</div>
                          <p style={{ fontSize: '0.83rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0 }}>{misconceptionLabels[0] || `${item.relearn_suggestions} incorrect quiz responses recorded`}</p>
                        </div>
                        <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: tint('var(--color-ok)', 8), border: `1px solid ${tint('var(--color-ok)', 22)}` }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ok)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Correct Understanding</div>
                          <p style={{ fontSize: '0.83rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0 }}>{misconceptionLabels.length ? misconceptionLabels.join(', ') : 'No specific misconception category recorded.'}</p>
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
          </Stagger>
        </div>
      )}
    </div>
  );
}
