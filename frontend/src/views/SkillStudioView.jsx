import React, { useEffect, useState } from 'react';
import { Briefcase, ChevronDown, BookOpen, FlaskConical, Scale, AlertTriangle, CheckCircle2, Layers, ListChecks, Sun } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Stagger, Skeleton } from '../components/ui';
import { ScoreRing } from './ReflectionsView';
import ForecastingLabView from './ForecastingLabView';
import ModelComparisonView from './ModelComparisonView';

const ROLE_KEY = 'skillStudio.roleId';
const PASS = 80;

async function getJson(url) {
  const res = await authFetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${res.status})`);
  return data;
}

const scoreColor = v => v >= PASS ? 'var(--color-ok)' : v >= 50 ? 'var(--color-warn)' : 'var(--color-danger)';

function Bar({ value }) {
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.min(100, value || 0)}%`, background: scoreColor(value || 0) }} />
    </div>
  );
}

function Status({ error, text, loading, height = 110 }) {
  if (loading && !error) return <div role="status"><Skeleton rows={2} height={height} /></div>;
  return <div className="card" role={error ? 'alert' : 'status'} style={{ padding: 20, color: error ? 'var(--color-danger)' : 'var(--color-text-2)' }}>{error || text}</div>;
}

const StepTitle = ({ n, icon: Icon, children }) => (
  <h3 className="section-title">
    <span className="chip" style={{ width: 'auto', padding: '0 10px', fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>{Icon ? <Icon size={14} /> : null}Step {n}</span>{children}
  </h3>
);

function SkillDetail({ skill }) {
  const [mode, setMode] = useState('lab');
  return (
    <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
      <div className="card-inset" style={{ padding: 16 }}>
        <StepTitle n={3} icon={BookOpen}>Relevant learning content</StepTitle>
        {skill.why && <p style={{ color: 'var(--color-text-2)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 12 }}>{skill.why}</p>}
        {skill.learning_points?.length > 0 && (
          <Stagger step={50} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 8, marginBottom: 14 }}>
            {skill.learning_points.map(p => (
              <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', height: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-2)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                <ListChecks size={14} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 3 }} /><span>{p}</span>
              </div>
            ))}
          </Stagger>
        )}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Syllabus topics</div>
        {skill.topic_refs?.length ? (
          <Stagger step={50} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {skill.topic_refs.map(t => (
              <div key={t.topic_id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${t.best_score == null ? 'var(--color-border-md)' : scoreColor(t.best_score)}`, borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--color-text)', minWidth: 0, overflowWrap: 'anywhere' }}>{t.name}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {t.best_score == null
                    ? <span className="badge badge-warn">Not attempted</span>
                    : <span className={`badge ${t.best_score >= PASS ? 'badge-ok' : 'badge-danger'}`}>Best {Math.round(t.best_score)}%</span>}
                  {(t.best_score == null || t.best_score < PASS) && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Study this in AI Study Planner</span>}
                </span>
              </div>
            ))}
          </Stagger>
        ) : <p style={{ fontSize: '0.84rem', color: 'var(--color-text-3)' }}>No linked syllabus topics found{skill.topics?.length ? `: ${skill.topics.join(', ')}` : '.'}</p>}
      </div>

      {skill.lab && (
        <div className="card-inset" style={{ padding: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <StepTitle n={4} icon={FlaskConical}>Practice Lab</StepTitle>
            <div role="tablist" style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999, background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
              {[['lab', FlaskConical, 'Lab'], ['compare', Scale, 'Compare models']].map(([id, Icon, text]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontSize: '.82rem', fontWeight: 700, transition: 'background .25s ease, color .25s ease, box-shadow .25s ease', background: mode === id ? 'var(--color-surface)' : 'transparent', color: mode === id ? 'var(--color-accent)' : 'var(--color-text-2)', boxShadow: mode === id ? 'var(--shadow-sm)' : 'none' }}>
                  <Icon size={14} /> {text}
                </button>
              ))}
            </div>
          </div>
          <div key={mode} className="reveal" style={{ overflowX: 'auto' }}>
            {mode === 'lab'
              ? <ForecastingLabView key={skill.id} initialDatasetName={skill.lab.dataset} initialModel={skill.lab.model} taskText={skill.lab.task} />
              : <ModelComparisonView key={skill.id} initialDatasetName={skill.lab.dataset} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillStudioView() {
  const [roles, setRoles] = useState(null);
  const [rolesError, setRolesError] = useState('');
  const [roleId, setRoleId] = useState(() => { try { return localStorage.getItem(ROLE_KEY); } catch { return null; } });
  const [role, setRole] = useState(null);
  const [roleError, setRoleError] = useState('');
  const [openSkill, setOpenSkill] = useState(null);

  useEffect(() => {
    getJson('/api/skills/roles').then(setRoles).catch(e => setRolesError(e.message));
  }, []);

  useEffect(() => {
    if (!roleId) return;
    let live = true;
    getJson(`/api/skills/roles/${encodeURIComponent(roleId)}`)
      .then(d => { if (live) setRole(d); })
      .catch(e => { if (live) setRoleError(e.message); });
    return () => { live = false; };
  }, [roleId]);

  const pickRole = id => {
    if (id === roleId) return;
    setRole(null); setRoleError(''); setOpenSkill(null);
    setRoleId(id);
    try { localStorage.setItem(ROLE_KEY, id); } catch { /* storage unavailable */ }
  };

  const ready = role?.skills ? role.skills.filter(s => !s.needs_practice).length : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
      <PageHero
        icon={Layers}
        tone="skills"
        eyebrow={role ? `${role.industry} · Skill Studio` : 'Career skills'}
        title={role ? role.title : 'Skill Studio'}
        subtitle="Pick a job role, see which skills you need to practise, study the content and try it in the lab."
        stats={[
          { label: 'Job roles', value: roles ? roles.length : null },
          ...(roleId ? [] : [{ label: 'Industries', value: roles ? new Set(roles.map(r => r.industry)).size : null }]),
          ...(roleId ? [
            { label: 'Role readiness', value: role?.role_readiness ?? null, suffix: '%' },
            { label: role?.skills ? `Skills ready of ${role.skills.length}` : 'Skills ready', value: ready },
            { label: 'Need practice', value: role?.skills ? role.skills.length - ready : null },
          ] : []),
        ]}
      />

      <section>
        <StepTitle n={1} icon={Briefcase}>Select a job role</StepTitle>
        {!roles ? <Status error={rolesError} loading />
          : roles.length === 0 ? <Status text="No job roles are available yet." />
          : (
            <Stagger step={60} className="grid-auto">
              {roles.map(r => {
                const active = r.id === roleId;
                return (
                  <button key={r.id} type="button" className="card hover-lift" aria-pressed={active} onClick={() => pickRole(r.id)}
                    style={{ padding: 18, height: '100%', width: '100%', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', outline: active ? '2px solid var(--color-accent)' : '2px solid transparent', outlineOffset: 2, background: active ? 'var(--color-surface-2)' : 'var(--color-surface)', transition: 'outline-color .25s ease, background .25s ease, transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge badge-gold">{r.industry}</span>
                      <span className="badge badge-student">{r.skill_count} skills</span>
                      {active && <span className="badge badge-ok" style={{ marginLeft: 'auto' }}><CheckCircle2 size={11} /> Selected</span>}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: active ? 'var(--color-accent)' : 'var(--color-text)', transition: 'color .25s' }}>{r.title}</span>
                    {r.description && <span style={{ fontSize: '0.82rem', color: 'var(--color-text-2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</span>}
                    {r.salary_band && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 'auto' }}>{r.salary_band}</span>}
                  </button>
                );
              })}
            </Stagger>
          )}
      </section>

      {roleId && (
        <section>
          <StepTitle n={2} icon={ListChecks}>Skills you need to practise</StepTitle>
          {!role ? <Status error={roleError} loading height={90} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="card reveal" style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
                  <ScoreRing value={role.role_readiness} size={108} color={scoreColor(role.role_readiness)} label="ready %" />
                  <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{role.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', marginTop: 2 }}>{role.industry}{role.salary_band ? ` · ${role.salary_band}` : ''}</div>
                    <div style={{ marginTop: 10, fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Role readiness {role.role_readiness}%</div>
                    <Bar value={role.role_readiness} />
                  </div>
                </div>
                {role.day_in_life && (
                  <p className="card-inset" style={{ marginTop: 14, marginBottom: 0, padding: 12, fontSize: '0.85rem', color: 'var(--color-text-2)', lineHeight: 1.6, display: 'flex', gap: 8 }}>
                    <Sun size={15} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 3 }} />
                    <span><strong style={{ color: 'var(--color-text)' }}>A day in the life: </strong>{role.day_in_life}</span>
                  </p>
                )}
              </div>

              {role.skills?.length ? (
                <Stagger step={60} start={120} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {role.skills.map(s => {
                    const open = openSkill === s.id;
                    return (
                      <div key={s.id} className={`card${open ? '' : ' hover-lift'}`} style={{ padding: 16, minWidth: 0, borderLeft: `3px solid ${s.needs_practice ? 'var(--color-warn)' : 'var(--color-ok)'}`, outline: open ? '2px solid var(--color-accent)' : '2px solid transparent', outlineOffset: 2, transition: 'outline-color .25s ease, transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease' }}>
                        <button type="button" onClick={() => setOpenSkill(open ? null : s.id)} aria-expanded={open}
                          style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', boxSizing: 'border-box' }}>
                          <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                            <ChevronDown size={16} color="var(--color-text-3)" style={{ transition: 'transform .25s ease', transform: open ? 'none' : 'rotate(-90deg)' }} />
                            <span style={{ fontWeight: 700, color: 'var(--color-text)', flex: '1 1 auto', minWidth: 0 }}>{s.name}</span>
                            {s.needs_practice
                              ? <span className="badge badge-warn"><AlertTriangle size={11} /> Needs practice</span>
                              : <span className="badge badge-ok"><CheckCircle2 size={11} /> Ready</span>}
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: scoreColor(s.readiness) }}>{s.readiness}%</span>
                          </span>
                          <Bar value={s.readiness} />
                        </button>
                        {open && <SkillDetail skill={s} />}
                      </div>
                    );
                  })}
                </Stagger>
              ) : <Status text="This role has no skills listed yet." />}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
