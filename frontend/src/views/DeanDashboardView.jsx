import React, { useEffect, useState } from 'react';
import { Building2, BookOpen, Users, Layers, Table2, UserCog } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Stagger, SectionTitle, Skeleton } from '../components/ui';

const ROW_CSS = '.fx-row td { transition: background .18s ease; } .fx-row:hover td { background: var(--color-surface-2); } .pill-live::before { display: none; }';
const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
const masteryColor = v => (v == null ? 'var(--color-surface-3)' : v >= 80 ? 'var(--color-ok)' : v >= 70 ? 'var(--color-accent)' : 'var(--color-danger)');

function useDepartmentData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/dean/department')
      .then(async response => {
        if (!response.ok) throw new Error('Department analytics could not be loaded.');
        setData(await response.json());
      })
      .catch(err => setError(err.message));
  }, []);

  return { data, error };
}

function LoadState({ error }) {
  if (error) return <div className="card" role="alert" style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>;
  return <div role="status"><Skeleton rows={4} height={100} /></div>;
}

function AtRiskPill({ count }) {
  if (!count) return <span className="badge badge-ok">0 students</span>;
  return <span className="badge badge-danger pill-live" style={{ whiteSpace: 'nowrap' }}><span className="pulse-dot" /> {count} students</span>;
}

function MiniBar({ value }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>{showPercent(value)}</div>
      <div className="progress-track" style={{ marginTop: 4 }}><div className="progress-fill" style={{ width: `${value || 0}%`, background: masteryColor(value) }} /></div>
    </div>
  );
}

const showPercent = value => value == null ? '–' : `${value}%`;
const TH = { textAlign: 'left', padding: '8px 14px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' };
const TD = { padding: '11px 14px', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem', color: 'var(--color-text-2)' };

export function DepartmentPerformanceView() {
  const { data, error } = useDepartmentData();
  if (!data) return <LoadState error={error} />;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <PageHero
        icon={Building2}
        tone="dean"
        eyebrow="Department"
        title="Department Performance"
        subtitle="Students across enrolled courses; mastery from completed learning journeys; at-risk means below 50% on completed quizzes."
        stats={[
          { label: 'Total students', value: data.total_students },
          { label: 'Avg department mastery', value: data.avg_department_mastery, decimals: 1, suffix: '%' },
          { label: 'Subjects running', value: data.subjects_running },
          { label: 'At-risk students', value: data.at_risk_students },
        ]}
      />

      <div className="card reveal" style={{ padding: 20, '--delay': '150ms' }}>
        <style>{ROW_CSS}</style>
        <SectionTitle icon={Table2}>Subject-level overview</SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Subject', 'Students', 'Avg Mastery', 'Completion', 'At-Risk', 'Trend'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{data.subjects.map(subject => (
              <tr key={subject.code} className="fx-row">
                <td style={TD}><div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)' }}>{subject.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>{subject.code}</div></td>
                <td style={{ ...TD, fontWeight: 600 }}>{subject.students}</td>
                <td style={TD}><MiniBar value={subject.avg_mastery} /></td>
                <td style={{ ...TD, fontWeight: 600 }}>{showPercent(subject.completion)}</td>
                <td style={TD}><AtRiskPill count={subject.at_risk} /></td>
                <td style={{ ...TD, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>Not available</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SubjectPerformanceView() {
  const { data, error } = useDepartmentData();
  const [selectedId, setSelectedId] = useState(null);
  if (!data) return <LoadState error={error} />;
  const selected = data.subjects.find(subject => subject.id === selectedId) || data.subjects[0];

  if (!selected) return <div className="card" style={{ padding: 24, color: 'var(--color-text-3)' }}>No course records are available.</div>;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <style>{ROW_CSS}</style>
      <PageHero
        key={selected.id}
        icon={BookOpen}
        tone="dean"
        eyebrow={`${selected.code} · Department level`}
        title={selected.name}
        subtitle={`${selected.students} enrolled students`}
        actions={data.subjects.map(subject => (
          <button key={subject.id} className={`btn-hero ${selected.id === subject.id ? '' : 'btn-hero-ghost'}`} aria-pressed={selected.id === subject.id} onClick={() => setSelectedId(subject.id)}>{subject.code}</button>
        ))}
        stats={[
          { label: 'Avg mastery', value: selected.avg_mastery, decimals: 1, suffix: '%' },
          { label: 'Completion rate', value: selected.completion, decimals: 1, suffix: '%' },
          { label: 'At-risk students', value: selected.at_risk },
          { label: 'Growth trend', value: 'Not available' },
        ]}
      />
      <div className="card reveal" style={{ padding: 20, '--delay': '150ms' }}>
        <SectionTitle icon={Layers}>Module mastery breakdown</SectionTitle>
        <Stagger step={60} start={200} style={{ display: 'grid', gap: 14 }}>{data.modules.map(module => <div key={module.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}><span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>{module.name}</span><div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}><span className="badge badge-ok">{module.strong} strong</span><span className="badge badge-danger pill-live">{module.weak > 0 && <span className="pulse-dot" />} {module.weak} need help</span><span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', minWidth: 38, textAlign: 'right' }}>{showPercent(module.mastery)}</span></div></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${module.mastery || 0}%`, background: masteryColor(module.mastery) }} /></div>
        </div>)}</Stagger>
      </div>
    </div>
  );
}

function MasteryRing({ value }) {
  const C = 2 * Math.PI * 20;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`Average mastery ${showPercent(value)}`} style={{ flexShrink: 0 }}>
      <circle cx="26" cy="26" r="20" fill="none" stroke="var(--color-surface-3)" strokeWidth="5" />
      <circle cx="26" cy="26" r="20" fill="none" stroke={masteryColor(value)} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${((value || 0) / 100) * C} ${C}`} transform="rotate(-90 26 26)" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="26" y="30" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--color-text)">{value == null ? '–' : Math.round(value)}</text>
    </svg>
  );
}

export function FacultyInsightsView() {
  const { data, error } = useDepartmentData();
  if (!data) return <LoadState error={error} />;
  const faculty = data.faculty;
  const interventionCount = faculty.reduce((sum, member) => sum + member.interventions, 0);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <PageHero
        icon={UserCog}
        tone="dean"
        eyebrow="Department"
        title="Faculty Insights"
        subtitle="Student mastery from completed learning journeys and recorded interventions per faculty member."
        stats={[
          { label: 'Faculty members', value: faculty.length },
          { label: 'Avg student mastery', value: data.avg_department_mastery, decimals: 1, suffix: '%' },
          { label: 'Interventions', value: interventionCount },
          { label: 'Avg faculty rating', value: 'Not available' },
        ]}
      />
      <SectionTitle icon={Users}>Faculty members</SectionTitle>
      {!faculty.length && <div className="card" style={{ padding: 24, color: 'var(--color-text-3)' }}>No faculty records are available.</div>}
      <Stagger step={70} start={150} style={{ display: 'grid', gap: 12 }}>{faculty.map(person => (
        <div key={person.id} className="card hover-lift" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: tint('var(--color-dean)', 18), border: '1.5px solid var(--color-dean)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-dean)', fontWeight: 800, fontSize: '1rem' }}>{person.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div>
            <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>{person.name}</div><div style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>{person.subject}</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MasteryRing value={person.avg_mastery} /><span style={{ fontSize: '0.68rem', color: 'var(--color-text-3)' }}>Avg<br />mastery</span></div>
              {[{ label: 'Students >80%', value: person.students_above_80 }, { label: 'Interventions', value: person.interventions }].map(metric => <div key={metric.label} style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{metric.value}</div><div style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', marginTop: 2 }}>{metric.label}</div></div>)}
            </div>
          </div>
        </div>
      ))}</Stagger>
    </div>
  );
}
