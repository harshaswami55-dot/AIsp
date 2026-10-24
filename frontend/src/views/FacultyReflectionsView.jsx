import React, { useEffect, useState } from 'react';
import { BookOpen, AlertTriangle, NotebookPen, BarChart3, Filter } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Reveal, SectionTitle, Skeleton } from '../components/ui';

const bandBadge = score => (score >= 85 ? 'badge-ok' : score >= 70 ? 'badge-gold' : score >= 50 ? 'badge-warn' : 'badge-danger');
const scoreColor = score => (score >= 70 ? 'var(--color-ok)' : score >= 50 ? 'var(--color-warn)' : 'var(--color-danger)');
const fmtDate = iso => (iso ? new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : `${iso}Z`).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '–');
const SELECT = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: '0.85rem', flex: '1 1 180px', maxWidth: 280 };
const LABEL = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };

function ScoreRing({ score }) {
  const C = 2 * Math.PI * 22;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`Score ${score} of 100`} style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-surface-3)" strokeWidth="6" />
      <circle cx="28" cy="28" r="22" fill="none" stroke={scoreColor(score)} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * C} ${C}`} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="28" y="33" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--color-text)">{Math.round(score)}</text>
    </svg>
  );
}

function ConceptList({ title, items, badge }) {
  return (
    <div>
      <div style={LABEL}>{title}</div>
      {items.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{items.map(c => <span key={c} className={`badge ${badge}`}>{c}</span>)}</div>
        : <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>None</span>}
    </div>
  );
}

export default function FacultyReflectionsView() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [student, setStudent] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    authFetch('/api/faculty/reflections')
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || 'Could not load student reflections.');
        setRows(body);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="card" role="alert" style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;
  if (!rows) return <div role="status"><Skeleton rows={4} height={100} /></div>;

  const scores = rows.map(r => r.score).filter(s => s != null);
  const hero = (
    <PageHero
      icon={NotebookPen}
      tone="faculty"
      eyebrow="Daily recall"
      title="Student Reflections"
      subtitle="Every daily recall scored against the topic rubric: concepts covered, concepts missed and misconceptions detected."
      stats={[
        { label: 'Reflections submitted', value: rows.length },
        { label: 'Reflections scored', value: scores.length },
        { label: 'Class avg score', value: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null, decimals: 1 },
        { label: 'Students reflecting', value: new Set(rows.map(r => r.user_id)).size },
      ]}
    />
  );
  if (!rows.length) {
    return (
      <div style={{ display: 'grid', gap: 18 }}>
        {hero}
        <div className="card" style={{ padding: 24, color: 'var(--color-text-3)' }}>No student reflections yet. They appear here once students submit a daily recall in the Reflections tab.</div>
      </div>
    );
  }

  const students = [...new Map(rows.map(r => [String(r.user_id), r.student_name || `Student #${r.user_id}`])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const topics = [...new Set(rows.map(r => r.topic_name).filter(Boolean))].sort();
  const shown = rows.filter(r => (!student || String(r.user_id) === student) && (!topic || r.topic_name === topic));

  const byTopic = {};
  for (const r of rows) if (r.score != null) (byTopic[r.topic_name || 'Untitled'] ??= []).push(r.score);
  const topicAvg = Object.entries(byTopic)
    .map(([name, s]) => ({ name, n: s.length, avg: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10 }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {hero}

      <div className="card reveal" style={{ padding: 20, '--delay': '150ms' }}>
        <SectionTitle icon={BarChart3} right={<span style={{ fontSize: '.75rem', color: 'var(--color-text-3)' }}>Lowest first</span>}>Class average recall score by topic</SectionTitle>
        {topicAvg.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{topicAvg.map((t, i) => (
            <div key={t.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5, fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</span>
                <span style={{ color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}><strong style={{ color: scoreColor(t.avg) }}>{t.avg}</strong> · {t.n} recall{t.n === 1 ? '' : 's'}</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${t.avg}%`, background: scoreColor(t.avg), animationDelay: `${200 + i * 70}ms` }} /></div>
            </div>
          ))}</div>
        ) : <p style={{ color: 'var(--color-text-3)', margin: 0 }}>No scored recalls yet — only older free-form reflections are on record.</p>}
      </div>

      <Reveal delay={220} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Filter size={15} color="var(--color-text-3)" />
        <select aria-label="Filter by student" value={student} onChange={e => setStudent(e.target.value)} style={SELECT}>
          <option value="">All students</option>
          {students.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Filter by topic" value={topic} onChange={e => setTopic(e.target.value)} style={SELECT}>
          <option value="">All topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>{shown.length} of {rows.length} recalls</span>
      </Reveal>

      {!shown.length && <div className="card" style={{ padding: 20, color: 'var(--color-text-3)' }}>No recalls match these filters.</div>}
      {shown.map((r, i) => {
        const fb = r.feedback;
        return (
          <Reveal as="article" key={`${r.id}-${student}-${topic}`} delay={260 + Math.min(i, 10) * 60} className="card hover-lift"
            style={{ padding: 20, borderLeft: `4px solid ${r.score != null ? scoreColor(r.score) : 'var(--color-border-md)'}` }}>
            <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{r.student_name || `Student #${r.user_id}`}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={13} /> {r.topic_name || 'Untitled topic'} · {fmtDate(r.created_at)}</div>
              </div>
              {r.score != null
                ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{fb?.band && <span className={`badge ${bandBadge(r.score)}`}>{fb.band}</span>}<ScoreRing score={r.score} /></div>
                : <span className="badge badge-gold">Free-form (not scored)</span>}
            </header>
            <p className="card-inset" style={{ padding: 12, margin: 0, fontSize: '0.88rem', color: 'var(--color-text-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.recall_text || '–'}</p>
            {fb && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
                <ConceptList title={`Matched concepts (${fb.concept_coverage_pct ?? 0}% coverage)`} items={fb.matched_concepts || []} badge="badge-ok" />
                <ConceptList title="Missing concepts" items={fb.missing_concepts || []} badge="badge-warn" />
                <div>
                  <div style={LABEL}>Misconceptions</div>
                  {fb.misconceptions?.length ? fb.misconceptions.map(m => (
                    <div key={m.name} style={{ fontSize: '0.82rem', color: 'var(--color-text-2)', marginBottom: 6 }}>
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> {m.name}</span>
                      {m.explanation && <div style={{ color: 'var(--color-text-3)' }}>{m.explanation}</div>}
                    </div>
                  )) : <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>None detected</span>}
                </div>
              </div>
            )}
            {fb?.reference_similarity_pct != null && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 10 }}>Similarity to closest reference answer{fb.closest_reference_index ? ` (#${fb.closest_reference_index})` : ''}: {fb.reference_similarity_pct}%</div>}
          </Reveal>
        );
      })}
    </div>
  );
}
