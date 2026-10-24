import React, { useEffect, useState } from 'react';
import { Search, ArrowLeft, Users, UserRound } from 'lucide-react';
import { authFetch } from '../api';
import { LearningGainPanel } from './LearningGainView';
import { PageHero, SectionTitle, Skeleton } from '../components/ui';

const TH = { textAlign: 'left', padding: '8px 12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' };
const TD = { padding: '11px 12px', fontSize: '0.86rem', color: 'var(--color-text-2)', borderBottom: '1px solid var(--color-border)' };
const ROW_CSS = `
.fx-row td { transition: background .18s ease; }
.fx-row:hover td, .fx-row:focus-within td { background: var(--color-surface-2); }
.fx-row:hover td:first-child { box-shadow: inset 3px 0 0 var(--color-faculty); }
.fx-row { animation: revealUp .5s cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--delay, 0ms); }
.pill-live::before { display: none; }
@media (prefers-reduced-motion: reduce) { .fx-row { animation: none; } }`;

const flagOf = s => (!s.topics_attempted ? 'Nothing attempted' : s.average_gain != null && s.average_gain < 0 ? 'Negative gain' : null);
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function FacultyStudentInsightsView() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    authFetch('/api/faculty/student-insights')
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || 'Could not load student insights.');
        setStudents(body);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="card" role="alert" style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;
  if (!students) return <div role="status"><Skeleton rows={4} height={90} /></div>;

  const selected = students.find(s => s.student_id === selectedId);
  if (selected) {
    return (
      <div style={{ display: 'grid', gap: 18 }}>
        <PageHero
          icon={UserRound}
          tone="faculty"
          eyebrow={`Student insights · ${selected.username}`}
          title={selected.student_name}
          subtitle="Day-wise Quiz 1 → Quiz 2 learning gain for this student."
          actions={<button className="btn-hero btn-hero-ghost" onClick={() => setSelectedId(null)}><ArrowLeft size={14} /> All students</button>}
        />
        <LearningGainPanel data={selected} />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const rows = students.filter(s => !q || `${s.student_name} ${s.username}`.toLowerCase().includes(q));
  const flagged = students.filter(flagOf).length;
  const avgGain = mean(students.map(s => s.average_gain).filter(g => g != null));

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <PageHero
        icon={Users}
        tone="faculty"
        eyebrow="Student insights"
        title="Learning gain by student"
        subtitle="Select a student for their day-wise dashboard."
        stats={[
          { label: 'Enrolled students', value: students.length },
          { label: 'Avg learning gain', value: avgGain, decimals: 1, prefix: '±', suffix: ' pts' },
          { label: 'Topics mastered', value: students.reduce((t, s) => t + (s.topics_mastered || 0), 0) },
          { label: 'Flagged students', value: flagged },
        ]}
      />

      <div className="card reveal" style={{ padding: 20, '--delay': '150ms' }}>
        <style>{ROW_CSS}</style>
        <SectionTitle icon={Users} right={
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-surface-2)', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={15} color="var(--color-text-3)" />
            <input type="search" aria-label="Search students" placeholder="Search students" value={query} onChange={e => setQuery(e.target.value)}
              style={{ border: 0, outline: 0, background: 'transparent', color: 'var(--color-text)', width: '100%', fontSize: '0.85rem' }} />
          </label>
        }>
          {students.length} students · {flagged} flagged
        </SectionTitle>
        {!students.length ? <p style={{ color: 'var(--color-text-3)' }}>No students are enrolled yet.</p>
          : !rows.length ? <p style={{ color: 'var(--color-text-3)' }}>No students match “{query}”.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Student', 'Attempted', 'Mastered', 'Avg gain', 'Last active', ''].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((s, i) => {
                  const flag = flagOf(s);
                  const masteredPct = s.topics_attempted ? (s.topics_mastered / s.topics_attempted) * 100 : 0;
                  return (
                    <tr key={s.student_id} className="fx-row" onClick={() => setSelectedId(s.student_id)} style={{ cursor: 'pointer', '--delay': `${Math.min(i, 12) * 40}ms` }}>
                      <td style={TD}>
                        <button type="button" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', fontWeight: 700, color: 'var(--color-text)' }}>{s.student_name}</button>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>{s.username}</div>
                      </td>
                      <td style={TD}>{s.topics_attempted}</td>
                      <td style={{ ...TD, minWidth: 90 }}>
                        {s.topics_mastered}
                        <div className="progress-track" style={{ marginTop: 4 }}><div className="progress-fill" style={{ width: `${masteredPct}%`, background: 'var(--color-ok)' }} /></div>
                      </td>
                      <td style={{ ...TD, fontWeight: 700, whiteSpace: 'nowrap', color: s.average_gain == null ? 'var(--color-text-3)' : s.average_gain >= 0 ? 'var(--color-ok)' : 'var(--color-danger)' }}>
                        {s.average_gain == null ? '–' : `${s.average_gain > 0 ? '+' : ''}${s.average_gain} pts`}
                      </td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{s.days.at(-1)?.date ?? '–'}</td>
                      <td style={TD}>{flag && <span className="badge badge-danger pill-live" style={{ whiteSpace: 'nowrap' }}><span className="pulse-dot" /> {flag}</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
