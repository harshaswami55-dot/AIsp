import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, Briefcase, CheckCircle2, ClipboardList, FlaskConical, Play, Send, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Stagger, SectionTitle, Skeleton, AnimatedNumber } from '../components/ui';
import { ScoreRing, scoreColor } from './ReflectionsView';

const MODELS = {
  naive: 'Naive (benchmark)', moving_average: 'Moving Average', ses: 'Simple Exponential Smoothing', holt: "Holt's Linear",
  holt_winters: 'Holt-Winters', arima: 'ARIMA', sarima: 'SARIMA', random_forest: 'Random Forest', xgboost: 'XGBoost',
  linear_regression: 'Linear Regression', decision_tree: 'Decision Tree',
};
// Same defaults the Forecasting Lab sends.
const LAB_PARAMS = { p: 1, d: 1, q: 1, P: 1, D: 1, Q: 1, s: 12, window: 3, alpha: 0.3 };
const MAX_CHARS = 2500;

async function call(url, options) {
  const res = await authFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${res.status})`);
  return data;
}

const label = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };
const body = { fontSize: '0.88rem', color: 'var(--color-text-2)', lineHeight: 1.6 };
const fmt = v => typeof v === 'number' ? (Math.round(v * 100) / 100).toLocaleString() : '—';
const bandBadge = score => score >= 70 ? 'badge-ok' : score >= 50 ? 'badge-warn' : 'badge-danger';

function Status({ error, text, loading }) {
  if (loading && !error) return <div role="status"><Skeleton rows={2} height={110} /></div>;
  return <div className="card" role={error ? 'alert' : 'status'} style={{ padding: 20, color: error ? 'var(--color-danger)' : 'var(--color-text-2)' }}>{error || text}</div>;
}

function Metric({ name, value, suffix = '' }) {
  return (
    <div className="stat-tile" style={{ minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
      <div style={label}>{name}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? <AnimatedNumber value={Math.round(value * 100) / 100} decimals={Number.isInteger(value) ? 0 : 2} suffix={suffix} /> : fmt(value)}
      </div>
    </div>
  );
}

function Chips({ items, cls }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{items.map(i => <span key={i} className={`badge ${cls}`}>{i}</span>)}</div>;
}

function Feedback({ result }) {
  return (
    <div className="card reveal" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }} role="status">
      <SectionTitle icon={Award}>Your project score</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <ScoreRing value={result.score} size={112} />
        <span className={`badge ${bandBadge(result.score)}`}>{result.band}</span>
      </div>
      <Stagger step={70} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Metric name="Concept coverage" value={result.concept_coverage_pct} suffix="%" />
        <Metric name="Reference similarity" value={result.reference_similarity_pct} suffix="%" />
        <Metric name="Words" value={result.word_count} />
      </Stagger>
      {result.evidence_bonus && <p style={{ ...body, color: 'var(--color-ok)' }}>{result.evidence_bonus}</p>}
      {result.matched_concepts?.length > 0 && <div><div style={label}>Concepts you covered</div><Chips items={result.matched_concepts} cls="badge-ok" /></div>}
      {result.missing_concepts?.length > 0 && <div><div style={label}>Concepts missing</div><Chips items={result.missing_concepts} cls="badge-warn" /></div>}
      {result.misconceptions?.length > 0 && (
        <div>
          <div style={label}>Misconceptions detected</div>
          {result.misconceptions.map(m => (
            <p key={m.name} style={{ ...body, display: 'flex', gap: 8 }}><AlertTriangle size={15} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 4 }} /><span><strong style={{ color: 'var(--color-text)' }}>{m.name}: </strong>{m.explanation}</span></p>
          ))}
        </div>
      )}
      {result.reference_recommendation && (
        <div className="card-inset" style={{ padding: 16, borderLeft: '3px solid var(--color-accent)' }}>
          <div style={label}>Reference recommendation (compare with yours)</div>
          <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{result.reference_recommendation}</p>
        </div>
      )}
    </div>
  );
}

function Workspace({ caselet, datasets, datasetsError, onBack, onSubmitted }) {
  const recommended = caselet.recommended_models || [];
  const [model, setModel] = useState(recommended[0] || 'holt_winters');
  const [run, setRun] = useState(null); // { model, metrics }
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [done, setDone] = useState({});
  const [skills, setSkills] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);

  const dataset = datasets?.find(d => d.name?.trim().toLowerCase() === caselet.dataset?.trim().toLowerCase());
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const skillNames = caselet.skill_names || [];
  const tasks = caselet.tasks || [];
  const doneCount = tasks.filter((_, i) => done[i]).length;

  const runLab = async () => {
    setRunning(true); setRunError('');
    try {
      const data = await call('/api/forecast/train', { method: 'POST', body: { dataset_id: dataset.id, model_name: model, horizon: 6, parameters: LAB_PARAMS } });
      // Backend only accepts numeric metrics (it also returns a text "note").
      const metrics = Object.fromEntries(Object.entries(data.model_result?.metrics || {}).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)));
      setRun({ model, metrics });
    } catch (e) {
      setRunError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    setSubmitting(true); setSubmitError('');
    try {
      const data = await call(`/api/caselets/${encodeURIComponent(caselet.id)}/project`, {
        method: 'POST',
        body: { model_name: model, metrics: run && run.model === model ? run.metrics : {}, skills, recommendation: text.trim() },
      });
      setResult(data);
      onSubmitted();
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSkill = id => setSkills(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const wordsOk = words >= 120 && words <= 250;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      <PageHero
        icon={Briefcase}
        tone="caselets"
        eyebrow={`${caselet.industry} · ${caselet.company}${caselet.submitted ? ' · Submitted' : ''}`}
        title={caselet.title}
        actions={<button className="btn-hero btn-hero-ghost" onClick={onBack}><ArrowLeft size={14} /> All caselets</button>}
        stats={[
          ...(tasks.length ? [{ label: 'Tasks done', value: `${doneCount} / ${tasks.length}` }] : []),
          { label: 'Skills in this case', value: skillNames.length },
          // string: AnimatedNumber restarts from 0 on each keystroke
          { label: 'Words written', value: String(words) },
          ...(result ? [{ label: 'Your score', value: result.score, suffix: '/100' }] : []),
        ]}
      />

      <div className="card reveal" style={{ padding: 20, '--delay': '100ms' }}>
        <p style={body}>{caselet.context}</p>
        <div className="card-inset" style={{ padding: 14, marginTop: 14, borderLeft: '3px solid var(--color-accent)' }}>
          <div style={label}>Business question</div>
          <p style={{ ...body, color: 'var(--color-text)', fontWeight: 600 }}>{caselet.business_question}</p>
        </div>
      </div>

      <div className="card reveal" style={{ padding: 20, '--delay': '180ms' }}>
        <SectionTitle icon={ClipboardList} right={tasks.length > 0 && <span className={`badge ${doneCount === tasks.length ? 'badge-ok' : 'badge-gold'}`}>{doneCount}/{tasks.length} done</span>}>Tasks</SectionTitle>
        {tasks.length > 0 && (
          <div className="progress-track" style={{ marginBottom: 12 }}>
            <div style={{ height: '100%', borderRadius: 'inherit', width: `${(doneCount / tasks.length) * 100}%`, background: 'var(--color-ok)', transition: 'width .4s cubic-bezier(.2,.8,.2,1)' }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((t, i) => (
            <label key={t} className="card-inset" style={{ ...body, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', textDecoration: done[i] ? 'line-through' : 'none', opacity: done[i] ? 0.7 : 1, transition: 'opacity .25s' }}>
              <input type="checkbox" checked={!!done[i]} onChange={() => setDone(d => ({ ...d, [i]: !d[i] }))} style={{ marginTop: 5, width: 'auto', flexShrink: 0 }} />
              <span>{t}</span>
            </label>
          ))}
        </div>
        {caselet.deliverable && <p style={{ ...body, marginTop: 14 }}><strong style={{ color: 'var(--color-text)' }}>Deliverable: </strong>{caselet.deliverable}</p>}
      </div>

      <div className="card reveal" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, '--delay': '260ms' }}>
        <SectionTitle icon={FlaskConical}>Build your project</SectionTitle>

        <div>
          <div style={label}>Dataset</div>
          <p style={body}>{caselet.dataset}{!datasets && !datasetsError && ' (loading…)'}</p>
          {datasetsError && <p role="alert" style={{ ...body, color: 'var(--color-danger)' }}>{datasetsError}</p>}
          {datasets && !dataset && <p role="alert" style={{ ...body, color: 'var(--color-warn)' }}>This dataset is not loaded in the Forecasting Lab, so the model cannot be run here.</p>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <label htmlFor="caselet-model" style={{ ...label, display: 'block' }}>Model</label>
            <select id="caselet-model" value={model} onChange={e => setModel(e.target.value)} style={{ width: '100%' }}>
              {recommended.length > 0 && <optgroup label="Recommended">{recommended.map(m => <option key={m} value={m}>{MODELS[m] || m}</option>)}</optgroup>}
              <optgroup label="Other lab models">{Object.keys(MODELS).filter(m => !recommended.includes(m)).map(m => <option key={m} value={m}>{MODELS[m]}</option>)}</optgroup>
            </select>
          </div>
          <button className="btn btn-primary" disabled={!dataset || running} onClick={runLab}><Play size={14} /> {running ? 'Running…' : 'Run in lab'}</button>
        </div>
        {runError && <p role="alert" style={{ ...body, color: 'var(--color-danger)' }}>{runError}</p>}
        {running && <Skeleton rows={1} height={64} />}
        {run && !running && (
          <div className="reveal">
            <div style={label}>Holdout accuracy · {MODELS[run.model] || run.model}{run.model !== model && ' (different from selected model; run again to attach metrics)'}</div>
            <Stagger step={70} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              <Metric name="MAE" value={run.metrics.mae} />
              <Metric name="RMSE" value={run.metrics.rmse} />
              <Metric name="MAPE" value={run.metrics.mape} suffix="%" />
            </Stagger>
          </div>
        )}

        {skillNames.length > 0 && (
          <div>
            <div style={label}>Skills used</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(caselet.skills || []).map((id, i) => {
                const on = skills.includes(id);
                return (
                  <label key={id} className={`badge ${on ? 'badge-ok' : 'badge-student'}`} style={{ cursor: 'pointer', gap: 6, transition: 'transform .2s ease, box-shadow .2s ease', transform: on ? 'translateY(-1px)' : 'none', boxShadow: on ? '0 0 0 1px var(--color-ok)' : 'none' }}>
                    <input type="checkbox" checked={on} onChange={() => toggleSkill(id)} style={{ width: 'auto', margin: 0 }} />
                    {skillNames[i] || id}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="caselet-rec" style={{ ...label, display: 'block' }}>Your recommendation</label>
          <textarea id="caselet-rec" value={text} maxLength={MAX_CHARS} rows={9} onChange={e => setText(e.target.value)}
            placeholder="Recommend a model, explain the evidence (accuracy metrics), the business action and the key risks."
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          <div className="progress-track" style={{ height: 4, marginTop: 6 }} aria-hidden="true">
            <div style={{ height: '100%', borderRadius: 'inherit', width: `${Math.min(100, (words / 250) * 100)}%`, background: wordsOk ? 'var(--color-ok)' : words > 250 ? 'var(--color-warn)' : 'var(--color-accent)', transition: 'width .25s, background .3s' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: 4 }}>
            <span style={{ color: words && !wordsOk ? 'var(--color-warn)' : wordsOk ? 'var(--color-ok)' : 'var(--color-text-3)' }}>{words} words · aim for 120–250</span>
            <span>{text.length}/{MAX_CHARS}</span>
          </div>
        </div>

        {submitError && <p role="alert" style={{ ...body, color: 'var(--color-danger)' }}>{submitError}</p>}
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!text.trim() || submitting} onClick={submit}>
          <Send size={14} /> {submitting ? 'Scoring…' : 'Submit project'}
        </button>
      </div>

      {result && <Feedback result={result} />}
    </div>
  );
}

export default function CaseletsView() {
  const [caselets, setCaselets] = useState(null);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState(null);
  const [projectsError, setProjectsError] = useState('');
  const [datasets, setDatasets] = useState(null);
  const [datasetsError, setDatasetsError] = useState('');
  const [openId, setOpenId] = useState(null);

  const loadCaselets = () => call('/api/caselets').then(setCaselets).catch(e => setError(e.message));
  const loadProjects = () => call('/api/caselets/projects/mine').then(setProjects).catch(e => setProjectsError(e.message));

  useEffect(() => {
    loadCaselets();
    loadProjects();
    call('/api/forecast/datasets').then(d => setDatasets(d.datasets || [])).catch(e => setDatasetsError(e.message));
  }, []);

  const open = caselets?.find(c => c.id === openId);
  if (open) {
    return <Workspace key={open.id} caselet={open} datasets={datasets} datasetsError={datasetsError}
      onBack={() => setOpenId(null)} onSubmitted={() => { loadCaselets(); loadProjects(); }} />;
  }

  const scores = (projects || []).map(p => p.score).filter(v => typeof v === 'number');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      <PageHero
        icon={Briefcase}
        tone="caselets"
        eyebrow="Applied forecasting"
        title="Caselets"
        subtitle="Short business cases. Build an individual forecasting project on each one using the relevant skills."
        stats={[
          { label: 'Caselets', value: caselets ? caselets.length : null },
          { label: 'Submitted', value: caselets ? caselets.filter(c => c.submitted).length : null },
          { label: 'Best score', value: scores.length ? Math.max(...scores) : null, suffix: '/100' },
        ]}
      />

      {!caselets ? <Status error={error} loading />
        : caselets.length === 0 ? <Status text="No caselets are available yet." />
        : (
          <Stagger step={70} className="grid-auto">
            {caselets.map(c => (
              <button key={c.id} type="button" className="card hover-lift" onClick={() => setOpenId(c.id)}
                style={{ padding: 18, height: '100%', width: '100%', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `3px solid ${c.submitted ? 'var(--color-ok)' : 'var(--color-accent)'}` }}>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="badge badge-gold">{c.industry}</span>
                  {c.submitted && <span className="badge badge-ok"><CheckCircle2 size={11} /> Submitted</span>}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={13} /> {c.company}</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{c.title}</span>
                {c.skill_names?.length > 0 && <Chips items={c.skill_names} cls="badge-student" />}
                <span style={{ marginTop: 'auto', paddingTop: 4, fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {c.submitted ? 'Open again' : 'Start project'} <ArrowRight size={13} />
                </span>
              </button>
            ))}
          </Stagger>
        )}

      <section className="card reveal" style={{ padding: 20, '--delay': '200ms' }}>
        <SectionTitle icon={FileText} right={projects?.length ? <span className="badge badge-gold">{projects.length} submitted</span> : null}>My projects</SectionTitle>
        {!projects ? (projectsError ? <p role="alert" style={{ ...body, color: 'var(--color-danger)' }}>{projectsError}</p> : <div role="status"><Skeleton rows={2} height={48} /></div>)
          : projects.length === 0 ? <p style={body}>You have not submitted any caselet projects yet.</p>
          : (
            <Stagger step={60} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.map(p => (
                <details key={p.id} className="card-inset" style={{ padding: '12px 14px', borderLeft: `3px solid ${scoreColor(p.score)}` }}>
                  <summary style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)', flex: '1 1 200px', minWidth: 0 }}>{p.caselet_title}</span>
                    <span className="badge badge-student">{MODELS[p.model_name] || p.model_name}</span>
                    <span className={`badge ${bandBadge(p.score)}`}>{p.score} · {p.feedback?.band || '—'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                  </summary>
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.keys(p.metrics || {}).length > 0 && <p style={{ ...body, fontSize: '0.8rem' }}>MAE {fmt(p.metrics.mae)} · RMSE {fmt(p.metrics.rmse)} · MAPE {fmt(p.metrics.mape)}%</p>}
                    <p style={{ ...body, whiteSpace: 'pre-wrap' }}>{p.recommendation}</p>
                    {p.feedback?.missing_concepts?.length > 0 && <div><div style={label}><XCircle size={11} /> Missing concepts</div><Chips items={p.feedback.missing_concepts} cls="badge-warn" /></div>}
                  </div>
                </details>
              ))}
            </Stagger>
          )}
      </section>
    </div>
  );
}
