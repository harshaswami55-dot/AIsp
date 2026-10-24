import React, { useEffect, useState } from 'react';
import { BookOpen, Send, CheckCircle2, XCircle, AlertTriangle, CalendarDays, PenLine, Library } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Stagger, SectionTitle, Skeleton, AnimatedNumber } from '../components/ui';

const MAX = 500;

async function api(url, options) {
  const res = await authFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export const scoreColor = s => (s >= 70 ? 'var(--color-ok)' : s >= 50 ? 'var(--color-warn)' : 'var(--color-danger)');

/** Animated circular score (0–100). The arc grows from 0 on mount and on every value change. */
export function ScoreRing({ value, size = 104, stroke = 10, color, label = '/100' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(100, Number(value) || 0));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  const stroke2 = color || scoreColor(target);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke2} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(.2,.8,.2,1), stroke .4s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: size * 0.27, fontWeight: 800, lineHeight: 1, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
          <AnimatedNumber value={value} decimals={Number.isInteger(Number(value)) ? 0 : 1} />
        </div>
        {label && <div style={{ fontSize: '.68rem', color: 'var(--color-text-3)', fontWeight: 700 }}>{label}</div>}
      </div>
    </div>
  );
}

/** Concept chips: matched = ok tint, missing = warn tint. */
export function ConceptChips({ items, ok, empty }) {
  if (!items?.length) return <span style={{ color: 'var(--color-text-3)', fontSize: '.84rem' }}>{empty}</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map(i => (
        <span key={i} className={`badge ${ok ? 'badge-ok' : 'badge-warn'}`} style={{ gap: 4 }}>
          {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}{i}
        </span>
      ))}
    </div>
  );
}

function MiniBar({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '.78rem', color: 'var(--color-text-2)', marginBottom: 4 }}>
        <span>{label}</span><strong style={{ color: 'var(--color-text)' }}>{value ?? '–'}%</strong>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${value || 0}%`, background: scoreColor(value || 0) }} /></div>
    </div>
  );
}

export function RecallFeedback({ feedback, references }) {
  if (!feedback) return null;
  return (
    <div className="reveal" style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <ScoreRing value={feedback.score} />
        <div style={{ display: 'grid', gap: 10, flex: '1 1 220px', minWidth: 0 }}>
          <span className="badge badge-gold" style={{ justifySelf: 'start' }}>{feedback.band}</span>
          <MiniBar label="Key concepts covered" value={feedback.concept_coverage_pct} />
          <MiniBar label="Closeness to reference" value={feedback.reference_similarity_pct} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <div className="card-inset" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--color-ok)', display: 'flex', gap: 6, alignItems: 'center' }}><CheckCircle2 size={14} /> You covered</div>
          <ConceptChips items={feedback.matched_concepts} ok empty="none of the key concepts yet" />
        </div>
        <div className="card-inset" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--color-warn)', display: 'flex', gap: 6, alignItems: 'center' }}><XCircle size={14} /> Missing</div>
          <ConceptChips items={feedback.missing_concepts} empty="nothing important" />
        </div>
      </div>
      {feedback.misconceptions?.map(m => (
        <div key={m.name} className="card-inset" style={{ padding: 12, borderLeft: '3px solid var(--color-danger)', color: 'var(--color-text-2)', fontSize: '.85rem' }}>
          <strong style={{ color: 'var(--color-danger)' }}>{m.name}:</strong> {m.explanation}
        </div>
      ))}
      {references?.length > 0 && (
        <div>
          <SectionTitle icon={Library}>Reference models</SectionTitle>
          <Stagger step={80} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {references.map((r, i) => {
              const closest = feedback.closest_reference_index === i + 1;
              return (
                <div key={i} className="card-inset hover-lift" style={{ padding: 12, height: '100%', boxSizing: 'border-box', outline: closest ? '2px solid var(--color-accent)' : 'none', background: closest ? 'var(--color-surface)' : undefined }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: closest ? 'var(--color-accent)' : 'var(--color-text-3)', marginBottom: 4 }}>
                    REFERENCE {i + 1}{closest ? ' · closest to yours' : ''}
                  </div>
                  <div style={{ color: 'var(--color-text-2)', fontSize: '.84rem', lineHeight: 1.55 }}>{r}</div>
                </div>
              );
            })}
          </Stagger>
        </div>
      )}
    </div>
  );
}

export default function ReflectionsView() {
  const [topics, setTopics] = useState(null);
  const [topicId, setTopicId] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = () => api('/api/reflections/mine').then(setHistory).catch(e => { setHistory(h => h ?? []); setError(e.message); });
  useEffect(() => {
    api('/api/topics/completed').then(t => {
      const withRefs = t.filter(x => x.has_reference);
      setTopics(withRefs);
      setTopicId(withRefs[0]?.id ?? '');
    }).catch(e => { setTopics([]); setError(e.message); });
    loadHistory();
  }, []);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      setResult(await api('/api/reflections/recall', { method: 'POST', body: { topic_id: Number(topicId), recall_text: text } }));
      loadHistory();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const today = new Date().toDateString();
  const byDay = (history || []).reduce((acc, r) => {
    const day = new Date(r.created_at).toDateString();
    (acc[day] ||= []).push(r);
    return acc;
  }, {});
  const scored = (history || []).filter(r => r.score !== null && r.score !== undefined);
  const avg = scored.length ? scored.reduce((s, r) => s + r.score, 0) / scored.length : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18, maxWidth: 1000, margin: '0 auto' }}>
      <PageHero
        icon={BookOpen}
        tone="reflections"
        eyebrow="Daily recall"
        title="Reflections"
        subtitle="Write today's recall of a topic from memory. It's compared with three reference models and scored. One recall per topic per day; writing again today replaces it."
        stats={history ? [
          { label: 'Recalls today', value: byDay[today]?.length ?? 0 },
          { label: 'Total recalls', value: history.length },
          { label: 'Average score', value: avg, decimals: 1 },
          { label: 'Best score', value: scored.length ? Math.max(...scored.map(r => r.score)) : null },
        ] : []}
      />

      {error && <div className="card reveal" style={{ padding: 14, color: 'var(--color-danger)', display: 'flex', gap: 8 }}><AlertTriangle size={16} /> {error}</div>}

      <div className="card reveal" style={{ padding: 20, display: 'grid', gap: 12, '--delay': '120ms' }}>
        <SectionTitle icon={PenLine}>Add recall for {today}</SectionTitle>
        {topics === null ? <Skeleton rows={2} height={56} /> : topics.length === 0 ? (
          <p style={{ color: 'var(--color-text-3)', margin: 0 }}>Complete a quiz in the AI Study Planner first — you recall topics you've studied.</p>
        ) : (
          <>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600, color: 'var(--color-text-2)', fontSize: '.85rem' }}>Topic
              <select value={topicId} onChange={e => { setTopicId(e.target.value); setResult(null); }}>
                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600, color: 'var(--color-text-2)', fontSize: '.85rem' }}>
              What do you remember about this topic? (no notes)
              <textarea rows={6} maxLength={MAX} value={text} onChange={e => setText(e.target.value)} placeholder="Explain the idea, the key terms, and how a manager would use it…" style={{ resize: 'vertical' }} />
            </label>
            <div className="progress-track" style={{ height: 4 }} aria-hidden="true">
              <div style={{ height: '100%', width: `${(text.length / MAX) * 100}%`, borderRadius: 'inherit', background: text.length > MAX - 50 ? 'var(--color-warn)' : 'var(--color-accent)', transition: 'width .2s, background .3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.8rem', color: text.length > MAX - 50 ? 'var(--color-warn)' : 'var(--color-text-3)' }}>{text.length} / {MAX} characters</span>
              <button className="btn btn-primary" disabled={busy || !text.trim() || !topicId} onClick={submit}><Send size={14} /> {busy ? 'Scoring…' : 'Compare with references & score'}</button>
            </div>
          </>
        )}
        {result && <RecallFeedback feedback={result.feedback} references={result.references} />}
      </div>

      <div className="card reveal" style={{ padding: 20, '--delay': '200ms' }}>
        <SectionTitle icon={CalendarDays} right={history?.length ? <span className="badge badge-gold">{history.length} total</span> : null}>My recalls</SectionTitle>
        {history === null ? <Skeleton rows={3} height={48} /> : history.length === 0 ? <p style={{ color: 'var(--color-text-3)', margin: 0 }}>No recalls yet.</p> : (
          <Stagger step={60}>
            {Object.entries(byDay).map(([day, rows]) => (
              <div key={day} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '.78rem', fontWeight: 700, color: day === today ? 'var(--color-accent)' : 'var(--color-text-3)', marginBottom: 6 }}>{day === today ? `Today · ${day}` : day}</div>
                {rows.map(r => (
                  <details key={r.id} className="card-inset"style={{ padding: 12, marginBottom: 8, borderLeft: `3px solid ${r.score === null ? 'var(--color-border-md)' : scoreColor(r.score)}` }}>
                    <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', color: 'var(--color-text)' }}>
                      <span style={{ minWidth: 0 }}>{r.topic_name}</span>
                      <strong style={{ color: r.score === null ? 'var(--color-text-3)' : scoreColor(r.score) }}>{r.score === null ? 'not scored' : `${r.score}/100`}</strong>
                    </summary>
                    <p style={{ color: 'var(--color-text-2)', fontSize: '.86rem', whiteSpace: 'pre-wrap' }}>{r.recall_text}</p>
                    {r.feedback && <RecallFeedback feedback={r.feedback} />}
                  </details>
                ))}
              </div>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  );
}
