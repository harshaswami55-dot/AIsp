import React, { useCallback, useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Battery, Lightbulb, PlayCircle, LineChart as LineIcon } from 'lucide-react';
import { authFetch } from '../api';
import { cssVar } from './LearningGainView';
import { ScoreRing } from './ReflectionsView';
import { PageHero, Stagger, SectionTitle, Skeleton } from '../components/ui';

const level = s => (s == null ? null : s < 30 ? { label: 'Low', badge: 'badge-ok', color: 'var(--color-ok)' } : s < 50 ? { label: 'Moderate', badge: 'badge-warn', color: 'var(--color-warn)' } : { label: 'High', badge: 'badge-danger', color: 'var(--color-danger)' });
const errText = (body, fallback) => (typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail) ? body.detail.map(d => d.msg).join('; ') : fallback);
const fmtTime = iso => new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : `${iso}Z`).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function Scale({ label, value, onChange }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6 }}>{label} (1 = very low, 5 = very high)</legend>
      <div style={{ display: 'flex', gap: 6 }}>{[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" aria-pressed={value === n} className={`btn ${value === n ? 'btn-primary' : 'btn-secondary'}`}
          style={{ minWidth: 40, padding: '6px 0', justifyContent: 'center', transition: 'all .2s ease', transform: value === n ? 'translateY(-2px)' : 'none' }} onClick={() => onChange(n)}>{n}</button>
      ))}</div>
    </fieldset>
  );
}

export default function LearningFatigueView({ currentUser }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ session_minutes: 30, energy: 3, focus: 3 });
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  const userId = currentUser?.id;
  const load = useCallback(() => {
    if (userId == null) return;
    authFetch(`/api/fatigue/summary/${userId}`)
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(errText(body, 'Could not load fatigue summary.'));
        setSummary(body);
        setError('');
      })
      .catch(e => setError(e.message));
  }, [userId]);

  useEffect(load, [load]);

  const submit = async e => {
    e.preventDefault();
    setChecking(true);
    setCheckError('');
    try {
      const res = await authFetch('/api/fatigue/check', { method: 'POST', body: { ...form, session_minutes: Number(form.session_minutes) } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errText(body, 'Fatigue check failed.'));
      setResult(body);
      load();
    } catch (err) {
      setCheckError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const lv = level(summary?.latest);
  const checks = (summary?.checks || []).map(c => ({ ...c, label: fmtTime(c.at) }));
  const text3 = cssVar('--color-text-3');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageHero
        icon={Battery}
        tone="fatigue"
        eyebrow="Energy · focus · session time"
        title="Learning Fatigue"
        subtitle="Track how tired you are while studying. Scores of 50 or more mean it's time for a break."
        stats={[
          { label: 'Latest fatigue', value: summary?.latest ?? null, decimals: Number.isInteger(summary?.latest) ? 0 : 1, suffix: '/100' },
          { label: 'Level', value: lv ? lv.label : summary ? 'No checks yet' : null },
          { label: 'Checks recorded', value: summary ? summary.checks.length : null },
          { label: 'Breaks suggested', value: summary?.breaks_suggested ?? null },
        ]}
      />
      {error && <div className="card" role="alert" style={{ padding: 16, color: 'var(--color-danger)' }}>{error}</div>}
      {!summary && !error && <div role="status"><Skeleton rows={1} height={260} /></div>}

      {summary && <>
        <div className="card reveal" style={{ padding: 20, '--delay': '120ms' }}>
          <SectionTitle icon={LineIcon} right={<span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Most recent 30 shown</span>}>Fatigue over time</SectionTitle>
          {checks.length ? (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={checks} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
                  <CartesianGrid stroke={cssVar('--color-border')} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: text3, fontSize: 11 }} label={{ value: 'Check time', position: 'insideBottom', offset: -14, fill: text3, fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: text3, fontSize: 11 }} width={44} label={{ value: 'Fatigue score', angle: -90, position: 'insideLeft', fill: text3, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: cssVar('--color-surface'), border: `1px solid ${cssVar('--color-border')}`, borderRadius: 8, fontSize: '0.8rem', color: cssVar('--color-text') }}
                    formatter={(v, _n, p) => [`${v}${p.payload.quiz_score != null ? ` · last quiz ${p.payload.quiz_score}%` : ''}`, 'Fatigue']} />
                  <ReferenceLine y={50} stroke={cssVar('--color-danger')} strokeDasharray="4 4" label={{ value: 'Break', fill: text3, fontSize: 10, position: 'insideTopRight' }} />
                  <ReferenceLine y={30} stroke={cssVar('--color-warn')} strokeDasharray="4 4" />
                  <Line dataKey="fatigue_score" stroke={cssVar('--color-accent')} strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p style={{ color: 'var(--color-text-3)', margin: 0 }}>No fatigue checks yet. A check runs automatically when a Quiz 2 in AI Study Planner scores below 80%, or use the form below.</p>}
        </div>
      </>}

      <Stagger start={200} step={90} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 18, alignItems: 'start' }}>
      <div className="card" style={{ padding: 20 }}>
        <SectionTitle icon={PlayCircle}>Check my fatigue now</SectionTitle>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-2)', maxWidth: 220 }}>
            Session length (minutes)
            <input type="number" min={0} max={600} required value={form.session_minutes} onChange={e => setForm({ ...form, session_minutes: e.target.value })}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: '0.9rem' }} />
          </label>
          <Scale label="Energy" value={form.energy} onChange={energy => setForm({ ...form, energy })} />
          <Scale label="Focus" value={form.focus} onChange={focus => setForm({ ...form, focus })} />
          <div><button className="btn btn-primary" type="submit" disabled={checking}>{checking ? 'Checking…' : 'Check my fatigue now'}</button></div>
        </form>
        {checkError && <p role="alert" style={{ color: 'var(--color-danger)', marginTop: 12 }}>{checkError}</p>}
        {result && (
          <div className="card-inset reveal" style={{ marginTop: 16, padding: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <ScoreRing value={result.fatigue_score} size={92} color={level(result.fatigue_score).color} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span className={`badge ${level(result.fatigue_score).badge}`}>{level(result.fatigue_score).label} fatigue</span>
                <span className={`badge ${result.fatigued ? 'badge-danger' : 'badge-ok'}`}>{result.next === 'take_break' ? 'Take a break' : 'Continue practice'}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-2)' }}>Why: {result.reasons.join('; ')}.</div>
            {!!result.suggestions.length && <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: '0.85rem', color: 'var(--color-text-2)' }}>{result.suggestions.map(s => <li key={s}>{s}</li>)}</ul>}
          </div>
        )}
      </div>

      {!!summary?.suggestions?.length && (
        <div className="card" style={{ padding: 20 }}>
          <SectionTitle icon={Lightbulb}>AI suggestions for recovering focus</SectionTitle>
          <Stagger step={60} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary.suggestions.map(s => (
              <div key={s} className="card-inset" style={{ padding: '10px 12px', color: 'var(--color-text-2)', fontSize: '0.88rem', lineHeight: 1.5, borderLeft: '3px solid var(--color-accent)' }}>{s}</div>
            ))}
          </Stagger>
        </div>
      )}
      </Stagger>
    </div>
  );
}
