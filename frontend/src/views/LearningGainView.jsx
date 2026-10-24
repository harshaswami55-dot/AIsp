import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { TrendingUp, Target, BookOpen, Lightbulb, CalendarDays, BarChart3 } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Stagger, SectionTitle, Skeleton, AnimatedNumber } from '../components/ui';

// Recharts writes SVG attributes, so resolve theme variables to literal colors at render time.
export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'currentColor';

const fmtPct = v => (v == null ? '—' : `${v}%`);
const fmtGain = v => (v == null ? '—' : `${v > 0 ? '+' : ''}${v} pts`);
const gainColor = v => (v == null ? 'var(--color-text-3)' : v >= 0 ? 'var(--color-ok)' : 'var(--color-danger)');

const TH = { textAlign: 'left', padding: '8px 12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' };
const TD = { padding: '10px 12px', fontSize: '0.85rem', color: 'var(--color-text-2)', borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' };

export function StatTile({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="stat-tile" style={{ height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function LearningGainPanel({ data, showTiles = true }) {
  const { days = [], topics = [], insights = [] } = data || {};
  if (!topics.length) {
    return <div className="card reveal" style={{ padding: 24, color: 'var(--color-text-3)' }}>No quizzes yet — start a topic in AI Study Planner.</div>;
  }
  const text3 = cssVar('--color-text-3');
  const tooltipStyle = { background: cssVar('--color-surface'), border: `1px solid ${cssVar('--color-border')}`, borderRadius: 8, fontSize: '0.8rem', color: cssVar('--color-text') };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showTiles && <Stagger step={60} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        <StatTile label="Topics attempted" value={data.topics_attempted} icon={BookOpen} color="var(--color-student)" />
        <StatTile label="Topics mastered" value={data.topics_mastered} sub="Best score ≥ 80%" icon={Target} color="var(--color-ok)" />
        <StatTile label="Average gain" value={fmtGain(data.average_gain)} sub="Quiz 1 → best Quiz 2" icon={TrendingUp} color="var(--color-accent)" />
      </Stagger>}

      <div className="card reveal" style={{ padding: 20, '--delay': '120ms' }}>
        <SectionTitle icon={CalendarDays}>Day-wise comparison</SectionTitle>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={days} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
              <CartesianGrid stroke={cssVar('--color-border')} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: text3, fontSize: 11 }} label={{ value: 'Date', position: 'insideBottom', offset: -14, fill: text3, fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: text3, fontSize: 11 }} width={44} label={{ value: 'Score %', angle: -90, position: 'insideLeft', fill: text3, fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [name === 'Gain' ? fmtGain(v) : fmtPct(v), name]} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '0.78rem', color: text3 }} />
              <Bar dataKey="gain" name="Gain" fill={cssVar('--color-accent-3')} radius={[3, 3, 0, 0]} />
              <Line dataKey="quiz1_avg" name="Quiz 1 avg" stroke={cssVar('--color-warn')} strokeWidth={2} dot connectNulls />
              <Line dataKey="quiz2_avg" name="Quiz 2 avg" stroke={cssVar('--color-ok')} strokeWidth={2} dot connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Date', 'Quiz 1 avg', 'Quiz 2 avg', 'Gain', 'Quizzes', 'Topics'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>{[...days].reverse().map(d => (
              <tr key={d.date}>
                <td style={{ ...TD, whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--color-text)' }}>{d.date}</td>
                <td style={TD}>{fmtPct(d.quiz1_avg)}</td>
                <td style={TD}>{fmtPct(d.quiz2_avg)}</td>
                <td style={{ ...TD, fontWeight: 700, color: gainColor(d.gain) }}>{fmtGain(d.gain)}</td>
                <td style={TD}>{d.quizzes}</td>
                <td style={{ ...TD, minWidth: 180 }}>{d.topics.join(', ')}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="card reveal" style={{ padding: 20, '--delay': '200ms' }}>
        <SectionTitle icon={BarChart3} right={
          <span style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-warn)' }} />Quiz 1</span>
            <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--color-ok)' }} />Best Quiz 2</span>
          </span>
        }>Topic comparison: Quiz 1 vs best Quiz 2</SectionTitle>
        <Stagger step={50} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{topics.map(t => (
          <div key={t.topic_id} className="card-inset hover-lift" style={{ padding: '12px 14px', borderLeft: `3px solid ${t.mastered ? 'var(--color-ok)' : 'var(--color-warn)'}` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text)' }}>{t.topic}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.78rem', color: 'var(--color-text-3)' }}>
                Q1 {fmtPct(t.quiz1)} · Q2 {fmtPct(t.quiz2_best)}
                <strong style={{ color: gainColor(t.gain) }}>{fmtGain(t.gain)}</strong>
                <span className={`badge ${t.mastered ? 'badge-ok' : 'badge-warn'}`}>{t.mastered ? 'Mastered' : 'Below 80%'}</span>
              </span>
            </div>
            <div className="progress-track" title="Quiz 1"><div className="progress-fill" style={{ width: `${t.quiz1 || 0}%`, background: 'var(--color-warn)' }} /></div>
            <div className="progress-track" title="Best Quiz 2" style={{ marginTop: 4 }}><div className="progress-fill" style={{ width: `${t.quiz2_best || 0}%`, background: 'var(--color-ok)' }} /></div>
          </div>
        ))}</Stagger>
      </div>

      <div className="card reveal" style={{ padding: 20, '--delay': '280ms' }}>
        <SectionTitle icon={Lightbulb}>Student Insight</SectionTitle>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--color-text-2)', fontSize: '0.88rem' }}>
          {insights.map(s => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function LearningGainView({ currentUser, studentId }) {
  const id = studentId ?? currentUser?.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id == null) return;
    setData(null);
    setError('');
    authFetch(`/api/learning-gain/${id}`)
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || 'Could not load learning gain.');
        setData(body);
      })
      .catch(e => setError(e.message));
  }, [id]);

  const latest = data?.days?.length ? data.days[data.days.length - 1] : null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18 }}>
      <PageHero
        icon={TrendingUp}
        tone="gain"
        eyebrow="Quiz 1 → Quiz 2"
        title="Learning Gain"
        subtitle="How much each topic improved from your first quiz to your best retake, day by day."
        stats={[
          { label: 'Topics attempted', value: data?.topics_attempted ?? null },
          { label: 'Topics mastered', value: data?.topics_mastered ?? null },
          { label: 'Average gain', value: data?.average_gain ?? null, decimals: Number.isInteger(data?.average_gain) ? 0 : 1, prefix: '±', suffix: ' pts' },
          { label: latest ? `Latest day · ${latest.date}` : 'Latest day gain', value: latest?.gain ?? null, decimals: Number.isInteger(latest?.gain) ? 0 : 1, prefix: '±', suffix: ' pts' },
        ]}
      />
      {error ? <div className="card" role="alert" style={{ padding: 24, color: 'var(--color-danger)' }}>{error}</div>
        : !data ? <div role="status"><Skeleton rows={3} height={140} /></div>
        : <LearningGainPanel data={data} showTiles={false} />}
    </div>
  );
}
