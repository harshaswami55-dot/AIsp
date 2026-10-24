import React, { useEffect, useState } from 'react';
import { TrendingUp, BarChart3, Users, BookOpen, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { authFetch } from '../api';

function StatTile({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="stat-tile">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

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
  return <div className="card" role={error ? 'alert' : 'status'} style={{ padding: 24 }}>{error || 'Loading department analytics…'}</div>;
}

const showPercent = value => value == null ? '—' : `${value}%`;

export function DepartmentPerformanceView() {
  const { data, error } = useDepartmentData();
  if (!data) return <LoadState error={error} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatTile label="Total Students" value={data.total_students} sub="Across enrolled courses" icon={Users} color="var(--color-dean)" />
        <StatTile label="Avg Department Mastery" value={showPercent(data.avg_department_mastery)} sub="From completed learning journeys" icon={TrendingUp} color="var(--color-ok)" />
        <StatTile label="Subjects Running" value={data.subjects_running} sub="Current course records" icon={BookOpen} color="var(--color-student)" />
        <StatTile label="At-Risk Students" value={data.at_risk_students} sub="Below 50% on completed quizzes" icon={AlertTriangle} color="var(--color-danger)" />
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 18 }}>Subject-level Overview</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead><tr>{['Subject', 'Students', 'Avg Mastery', 'Completion', 'At-Risk', 'Trend'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 14px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>)}</tr></thead>
            <tbody>{data.subjects.map(subject => (
              <tr key={subject.code}>
                <td style={{ padding: '11px 14px' }}><div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)' }}>{subject.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>{subject.code}</div></td>
                <td style={{ padding: '11px 14px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{subject.students}</td>
                <td style={{ padding: '11px 14px' }}>{showPercent(subject.avg_mastery)}</td>
                <td style={{ padding: '11px 14px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{showPercent(subject.completion)}</td>
                <td style={{ padding: '11px 14px' }}><span className="badge badge-danger">{subject.at_risk} students</span></td>
                <td style={{ padding: '11px 14px', fontSize: '0.85rem', color: 'var(--color-text-3)' }}>Not available</td>
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

  if (!selected) return <div className="card" style={{ padding: 24 }}>No course records are available.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{data.subjects.map(subject => <button key={subject.id} className={`btn ${selected.id === subject.id ? 'btn-dean' : 'btn-secondary'}`} style={{ fontSize: '0.82rem' }} onClick={() => setSelectedId(subject.id)}>{subject.code}</button>)}</div>
      <div className="glass-panel-glow" style={{ padding: '20px 24px' }}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{selected.name}</h3><p style={{ fontSize: '0.82rem', color: 'var(--color-text-3)' }}>{selected.students} enrolled students · Department level</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatTile label="Avg Mastery" value={showPercent(selected.avg_mastery)} icon={Award} color="var(--color-dean)" />
        <StatTile label="Completion Rate" value={showPercent(selected.completion)} icon={CheckCircle2} color="var(--color-ok)" />
        <StatTile label="At-Risk Students" value={selected.at_risk} icon={AlertTriangle} color="var(--color-danger)" />
        <StatTile label="Growth Trend" value="Not available" icon={TrendingUp} color="var(--color-ok)" />
      </div>
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 18 }}>Module Mastery Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{data.modules.map(module => <div key={module.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}><span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>{module.name}</span><div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}><span style={{ fontSize: '0.72rem', color: 'var(--color-ok)' }}>{module.strong} strong</span><span style={{ fontSize: '0.72rem', color: 'var(--color-danger)' }}>{module.weak} need help</span><span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text)', width: 38, textAlign: 'right' }}>{showPercent(module.mastery)}</span></div></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${module.mastery || 0}%`, background: module.mastery >= 80 ? 'var(--color-ok)' : module.mastery >= 70 ? 'var(--color-accent)' : 'var(--color-danger)' }} /></div>
        </div>)}</div>
      </div>
    </div>
  );
}

export function FacultyInsightsView() {
  const { data, error } = useDepartmentData();
  if (!data) return <LoadState error={error} />;
  const faculty = data.faculty;
  const interventionCount = faculty.reduce((sum, member) => sum + member.interventions, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <StatTile label="Faculty Members" value={faculty.length} icon={Users} color="var(--color-dean)" />
        <StatTile label="Avg Student Mastery" value={showPercent(data.avg_department_mastery)} sub="From completed learning journeys" icon={Award} color="var(--color-ok)" />
        <StatTile label="Interventions" value={interventionCount} sub="Recorded interventions" icon={AlertTriangle} color="var(--color-warn)" />
        <StatTile label="Avg Faculty Rating" value="Not available" icon={TrendingUp} color="var(--color-accent)" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{faculty.map(person => (
        <div key={person.id} className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--color-dean), var(--color-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem' }}>{person.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div>
            <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)' }}>{person.name}</div><div style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>{person.subject}</div></div>
            {[{ label: 'Avg Mastery', value: showPercent(person.avg_mastery) }, { label: 'Students >80%', value: person.students_above_80 }, { label: 'Interventions', value: person.interventions }].map(metric => <div key={metric.label} style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{metric.value}</div><div style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', marginTop: 2 }}>{metric.label}</div></div>)}
          </div>
        </div>
      ))}</div>
    </div>
  );
}
