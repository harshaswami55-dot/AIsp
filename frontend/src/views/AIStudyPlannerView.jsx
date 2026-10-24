import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Coffee, Target,
  Eye, ShieldAlert, Brain, TrendingUp, ListChecks,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { authFetch } from '../api';
import { PageHero, Reveal, AnimatedNumber, SectionTitle } from '../components/ui';

const PASS = 80;

async function api(url, options) {
  const res = await authFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

function Steps({ phase }) {
  const steps = [
    ['select', 'Choose topic'], ['quiz1', 'Quiz 1'], ['practice', 'Practice'],
    ['quiz2', 'Quiz 2'], ['fatigue', 'Fatigue check'], ['summary', 'Compare & topics to study'],
  ];
  const order = steps.map(s => s[0]);
  const current = order.indexOf(phase === 'result1' ? 'quiz1' : phase === 'result2' ? 'quiz2' : phase);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {steps.map(([id, label], i) => (
        <React.Fragment key={id}>
          {i > 0 && <span style={{ width: 18, height: 2, borderRadius: 2, background: i <= current ? '#FFF8F0' : 'rgba(255,255,255,.25)', transition: 'background .4s' }} />}
          <span style={{
            padding: '5px 11px', borderRadius: 999, fontSize: '.74rem', fontWeight: 700, transition: 'all .4s',
            background: i === current ? '#FFF8F0' : i < current ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)',
            color: i === current ? 'var(--hero-b)' : '#FFF8F0', opacity: i > current ? 0.6 : 1,
          }}>
            {i < current ? '✓ ' : `${i + 1}. `}{label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

const DIFF_BADGE = { hard: 'badge-danger', medium: 'badge-warn', easy: 'badge-ok' };

function Quiz({ title, quiz, answers, setAnswers, onSubmit, submitting, tabSwitches }) {
  const [idx, setIdx] = useState(0);
  const answered = Object.keys(answers).length;
  const total = quiz.questions.length;
  const q = quiz.questions[idx];
  const choose = (opt) => {
    setAnswers(a => ({ ...a, [q.id]: opt }));
    if (idx < total - 1) setTimeout(() => setIdx(i => Math.min(total - 1, i + 1)), 280);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') setIdx(i => Math.min(total - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(0, i - 1));
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) choose(q.options[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card reveal" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
            <div style={{ color: 'var(--color-text-3)', fontSize: '.8rem' }}>Difficulty matched to your level · keys 1–4 answer, ← → move · other tabs locked until you submit</div>
          </div>
          <span className="badge badge-student"><span className="pulse-dot" style={{ marginRight: 6 }} />{answered} / {total} answered</span>
        </div>
        <div className="progress-track" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: `${(answered / total) * 100}%`, transition: 'width .4s ease' }} /></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }} aria-label="Question navigator">
          {quiz.questions.map((item, i) => {
            const done = answers[item.id] !== undefined;
            return (
              <button key={item.id} type="button" onClick={() => setIdx(i)} aria-label={`Question ${i + 1}${done ? ', answered' : ''}`}
                style={{
                  width: 32, height: 32, borderRadius: 9, fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                  border: `1.5px solid ${i === idx ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: done ? 'var(--color-accent)' : 'var(--color-surface)', color: done ? '#FFF8F0' : 'var(--color-text-2)',
                  transform: i === idx ? 'scale(1.12)' : 'none',
                }}>{i + 1}</button>
            );
          })}
        </div>
        {tabSwitches > 0 && (
          <div style={{ marginTop: 10, color: 'var(--color-danger)', fontSize: '.82rem', display: 'flex', gap: 6, alignItems: 'center' }}>
            <ShieldAlert size={15} /> You left this page {tabSwitches} time{tabSwitches > 1 ? 's' : ''} during the quiz. This is recorded with your result.
          </div>
        )}
      </div>

      <div key={q.id} className="card reveal" style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--color-text-3)' }}>QUESTION {idx + 1} OF {total}</span>
          <span className={`badge ${DIFF_BADGE[q.difficulty] || 'badge-warn'}`}>{q.difficulty}</span>
        </div>
        <p style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--color-text)', lineHeight: 1.55, margin: '0 0 16px' }}>{q.question_text}</p>
        <div style={{ display: 'grid', gap: 10 }} role="radiogroup">
          {q.options.map((opt, oi) => {
            const selected = answers[q.id] === opt;
            return (
              <button key={opt} type="button" role="radio" aria-checked={selected} onClick={() => choose(opt)} className="reveal"
                style={{
                  '--delay': `${80 + oi * 60}ms`, display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', width: '100%', cursor: 'pointer',
                  border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 12, padding: '12px 14px',
                  background: selected ? 'var(--color-surface-2)' : 'var(--color-surface)', color: 'var(--color-text)',
                  boxShadow: selected ? 'var(--shadow-md)' : 'none', transform: selected ? 'translateX(4px)' : 'none', transition: 'all .2s ease',
                }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: '.78rem', fontWeight: 800, background: selected ? 'var(--color-accent)' : 'var(--color-surface-2)', color: selected ? '#FFF8F0' : 'var(--color-text-2)', transition: 'all .2s' }}>
                  {String.fromCharCode(65 + oi)}
                </span>
                <span style={{ lineHeight: 1.5 }}>{opt}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>← Previous</button>
          {idx < total - 1
            ? <button className="btn btn-secondary" onClick={() => setIdx(i => i + 1)}>Next →</button>
            : <button className="btn btn-primary" disabled={submitting || answered < total} onClick={onSubmit}>
                {submitting ? 'Grading…' : answered < total ? `${total - answered} unanswered` : 'Submit quiz'} <ArrowRight size={16} />
              </button>}
        </div>
      </div>
      {answered === total && idx < total - 1 && (
        <button className="btn btn-primary reveal" disabled={submitting} onClick={onSubmit} style={{ justifySelf: 'end', padding: '12px 22px' }}>
          {submitting ? 'Grading…' : 'All answered — submit quiz'} <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

function ScoreCard({ label, result }) {
  const passed = result.score_percentage >= PASS;
  const color = passed ? 'var(--color-ok)' : 'var(--color-warn)';
  const C = 2 * Math.PI * 46;
  useEffect(() => {
    if (passed && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 }, colors: ['#7A2441', '#D7B88D', '#4A7F5A', '#C4882E'] });
    }
  }, [passed]);
  return (
    <div className="card reveal" style={{ padding: 22, borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'center' }}>
        <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`${result.score_percentage}%`}>
          <circle cx="56" cy="56" r="46" fill="none" stroke="var(--color-surface-3)" strokeWidth="10" />
          <circle cx="56" cy="56" r="46" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" transform="rotate(-90 56 56)"
            strokeDasharray={C} strokeDashoffset={C} style={{ animation: 'ringFill 1.2s cubic-bezier(.2,.8,.2,1) forwards', '--ring-to': C * (1 - result.score_percentage / 100) }} />
          <text x="56" y="62" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--color-text)">{Math.round(result.score_percentage)}%</text>
        </svg>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '.06em' }}>{label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color }}>{passed ? 'Passed — 80% or more' : 'Below the 80% pass mark'}</div>
          <div style={{ color: 'var(--color-text-2)', fontSize: '.88rem' }}>
            <AnimatedNumber value={result.correct_count} /> of {result.total_questions} correct
            {result.score_gain_pct !== null && result.quiz_type === 'post' && <> · gain <strong>{result.score_gain_pct >= 0 ? '+' : ''}{result.score_gain_pct} pts</strong> over Quiz 1</>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicsToStudy({ items, title = 'Topics to study' }) {
  if (!items?.length) return null;
  return (
    <div className="card reveal" style={{ padding: 20, '--delay': '120ms' }}>
      <SectionTitle icon={ListChecks}>{title}</SectionTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((t, i) => (
          <div key={i} className="card-inset reveal hover-lift" style={{ padding: 12, '--delay': `${200 + i * 70}ms`, borderLeft: `3px solid ${t.missed > 0 ? 'var(--color-warn)' : 'var(--color-ok)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--color-text)' }}>{t.concept.charAt(0).toUpperCase() + t.concept.slice(1)}</strong>
              {t.missed > 0 && <span className="badge badge-warn">missed {t.missed}×</span>}
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--color-text-3)' }}>{t.topic}</div>
            {t.why && <p style={{ margin: '6px 0 0', color: 'var(--color-text-2)', fontSize: '.85rem', lineHeight: 1.5 }}>{t.why}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIStudyPlannerView({ currentUser, onQuizStateChange }) {
  const [phase, setPhase] = useState('select');
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState({});
  const [moduleId, setModuleId] = useState(null);
  const [topic, setTopic] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [tabSwitches, setTabSwitches] = useState(0);
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [material, setMaterial] = useState(null);
  const [solutionShown, setSolutionShown] = useState(false);
  const [fatigueForm, setFatigueForm] = useState({ energy: 3, focus: 3 });
  const [fatigue, setFatigue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sessionStart = useRef(Date.now());
  const inQuiz = phase === 'quiz1' || phase === 'quiz2';
  const module = modules.find(m => m.id === moduleId);

  const loadProgress = useCallback(() => {
    api(`/api/learning-gain/${currentUser.id}`)
      .then(d => setProgress(Object.fromEntries(d.topics.map(t => [t.topic_id, t]))))
      .catch(() => {});
  }, [currentUser.id]);

  useEffect(() => {
    api('/api/journey/modules')
      .then(d => { setModules(d.modules || []); setModuleId(d.modules?.[0]?.id ?? null); })
      .catch(e => setError(e.message));
    loadProgress();
  }, [loadProgress]);

  // Restriction of switching tabs: portal tabs are disabled and leaving the page is counted.
  useEffect(() => {
    onQuizStateChange?.(inQuiz);
    if (!inQuiz) return undefined;
    const onHide = () => { if (document.hidden) setTabSwitches(n => n + 1); };
    const onLeave = e => { e.preventDefault(); e.returnValue = ''; };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [inQuiz, onQuizStateChange]);
  useEffect(() => () => onQuizStateChange?.(false), [onQuizStateChange]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const startQuiz = (type, t = topic, m = module) => run(async () => {
    const data = await api(`/api/journey/quiz?module_id=${m.id}&topic_id=${t.id}&quiz_type=${type}`);
    setTopic(t); setModuleId(m.id);
    setQuiz(data); setAnswers({}); setTabSwitches(0);
    if (type === 'pre') { setResult1(null); setResult2(null); setAttemptId(null); setFatigue(null); }
    setPhase(type === 'pre' ? 'quiz1' : 'quiz2');
    window.scrollTo({ top: 0 });
  });

  const submitQuiz = (type) => run(async () => {
    const data = await api('/api/journey/submit-quiz', {
      method: 'POST',
      body: { user_id: currentUser.id, attempt_id: attemptId, module_id: module.id, topic_id: topic.id, quiz_type: type, answers, tab_switches: tabSwitches },
    });
    setAttemptId(data.attempt_id);
    if (type === 'pre') { setResult1(data); setPhase('result1'); } else { setResult2(data); setPhase('result2'); setFatigue(null); }
    loadProgress();
    window.scrollTo({ top: 0 });
  });

  const openPractice = () => run(async () => {
    setMaterial(await api(`/api/journey/learn/${topic.id}`));
    setSolutionShown(false);
    setPhase('practice');
    window.scrollTo({ top: 0 });
  });

  const finishPractice = () => run(async () => {
    await api('/api/journey/complete-practice', { method: 'POST', body: { attempt_id: attemptId } });
    await startQuiz('post');
  });

  const checkFatigue = () => run(async () => {
    const minutes = Math.round((Date.now() - sessionStart.current) / 60000);
    setFatigue(await api('/api/fatigue/check', { method: 'POST', body: { topic_id: topic.id, session_minutes: minutes, ...fatigueForm } }));
  });

  const goNext = (item) => {
    const m = modules.find(x => x.id === item.module_id);
    const t = m?.topics.find(x => x.id === item.topic_id);
    if (m && t) { setModuleId(m.id); setTopic(t); }
    setPhase('select');
  };

  const latestMissed = (result2 || result1)?.topics_to_study?.filter(t => t.missed > 0) || [];

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1000, margin: '0 auto' }}>
      <PageHero
        icon={Brain}
        tone="planner"
        eyebrow={`Business Forecasting (SB6202)${module ? ` · Module ${module.module_number}` : ''}`}
        title={topic && phase !== 'select' ? topic.name : 'AI Study Planner'}
        subtitle={phase === 'select' ? 'Pick a sub topic. Quiz 1 checks what you know; below 80% you practise exactly what you missed, then Quiz 2 measures the change.' : undefined}
        stats={phase === 'select' && module ? [
          { label: 'Sub topics', value: module.topics.length },
          { label: 'Attempted', value: module.topics.filter(t => progress[t.id]).length },
          { label: 'Mastered', value: module.topics.filter(t => { const p = progress[t.id]; return p && (p.quiz2_best ?? p.quiz1) >= PASS; }).length },
        ] : []}
      >
        <div style={{ marginTop: 16 }}><Steps phase={phase} /></div>
      </PageHero>

      {error && <div className="card" style={{ padding: 14, color: 'var(--color-danger)', display: 'flex', gap: 8 }}><AlertTriangle size={16} /> {error}</div>}

      {phase === 'select' && (
        <div className="card" style={{ padding: 20, display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600, color: 'var(--color-text-2)', fontSize: '.85rem' }}>Subject
            <select disabled value="bf"><option value="bf">Business Forecasting (SB6202)</option></select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 600, color: 'var(--color-text-2)', fontSize: '.85rem' }}>Module
            <select value={moduleId ?? ''} onChange={e => setModuleId(Number(e.target.value))}>
              {modules.map(m => <option key={m.id} value={m.id}>Module {m.module_number}: {m.title}</option>)}
            </select>
          </label>
          <div style={{ fontWeight: 600, color: 'var(--color-text-2)', fontSize: '.85rem' }}>Sub topics in this module</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {module?.topics.map((t, i) => {
              const p = progress[t.id];
              const best = p ? (p.quiz2_best ?? p.quiz1) : null;
              return (
                <Reveal key={`${module.id}-${t.id}`} delay={i * 60} className="card-inset hover-lift" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', outline: topic?.id === t.id ? '2px solid var(--color-accent)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0, flex: '1 1 260px' }}>
                    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <circle cx="21" cy="21" r="17" fill="none" stroke="var(--color-surface-3)" strokeWidth="5" />
                      <circle cx="21" cy="21" r="17" fill="none" stroke={best >= PASS ? 'var(--color-ok)' : 'var(--color-warn)'} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={`${((best || 0) / 100) * 106.8} 106.8`} transform="rotate(-90 21 21)" style={{ transition: 'stroke-dasharray 1s ease' }} />
                      <text x="21" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text-2)">{best === null ? i + 1 : Math.round(best)}</text>
                    </svg>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--color-text-3)' }}>
                        {p ? `Quiz 1: ${p.quiz1 === null ? '–' : `${p.quiz1}%`} · Best Quiz 2: ${p.quiz2_best === null ? 'not taken' : `${p.quiz2_best}%`}` : 'Not started'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {best !== null && <span className={`badge ${best >= PASS ? 'badge-ok' : 'badge-warn'}`}>{best >= PASS ? 'Mastered' : 'In progress'}</span>}
                    <button className="btn btn-primary" disabled={busy} onClick={() => startQuiz('pre', t, module)}>
                      {p ? 'Retake Quiz 1' : 'Start Quiz 1'} <ArrowRight size={14} />
                    </button>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'quiz1' && quiz && <Quiz title={`Quiz 1 · Understand: ${topic.name}`} quiz={quiz} answers={answers} setAnswers={setAnswers} onSubmit={() => submitQuiz('pre')} submitting={busy} tabSwitches={tabSwitches} />}

      {phase === 'result1' && result1 && (
        <>
          <ScoreCard label="QUIZ 1 SCORE" result={result1} />
          {result1.passed ? (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}><CheckCircle2 size={18} color="var(--color-ok)" /> You already know this topic</h3>
              <p style={{ color: 'var(--color-text-2)' }}>No practice needed. Continue on your learning path.</p>
              {result1.topics_to_study.filter(t => t.topic_id).map(t => (
                <button key={t.topic_id} className="btn btn-primary" onClick={() => goNext(t)}>Next learning path: {t.topic} <ArrowRight size={14} /></button>
              ))}
              <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setPhase('select')}>Choose another topic</button>
            </div>
          ) : (
            <>
              <TopicsToStudy items={result1.topics_to_study} title="Practise these concepts (with context)" />
              <button className="btn btn-primary" disabled={busy} onClick={openPractice} style={{ justifySelf: 'end' }}>Go to practice <ArrowRight size={14} /></button>
            </>
          )}
        </>
      )}

      {phase === 'practice' && material && (
        <div style={{ display: 'grid', gap: 14 }}>
          <TopicsToStudy items={latestMissed} title="Focus on what you missed" />
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}><BookOpen size={18} /> {material.title}</h3>
            <p style={{ color: 'var(--color-text-2)', lineHeight: 1.7 }}>{material.core_explanation}</p>
          </div>
          {material.formulas?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0 }}>Formulas</h3>
              <div className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {material.formulas.map((f, i) => (
                  <div key={i} className="card-inset" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{f.name}</div>
                    <code style={{ display: 'block', margin: '6px 0', color: 'var(--color-text)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.latex}</code>
                    <div style={{ fontSize: '.8rem', color: 'var(--color-text-3)' }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {material.why_students_go_wrong?.length > 0 && (
            <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--color-danger)' }}>
              <h3 style={{ marginTop: 0 }}>Common mistakes</h3>
              {material.why_students_go_wrong.map((p, i) => (
                <p key={i} style={{ color: 'var(--color-text-2)', margin: '0 0 8px' }}><strong style={{ color: 'var(--color-text)' }}>{p.pitfall}</strong> — {p.why}</p>
              ))}
            </div>
          )}
          {material.practice_problem && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Target size={18} /> Practice problem</h3>
              <p style={{ color: 'var(--color-text)' }}>{material.practice_problem.problem}</p>
              <p style={{ color: 'var(--color-text-3)', fontSize: '.85rem' }}>Hint: {material.practice_problem.hint}</p>
              {solutionShown
                ? <div className="card-inset" style={{ padding: 12, color: 'var(--color-text-2)' }}>{material.practice_problem.solution}</div>
                : <button className="btn btn-secondary" onClick={() => setSolutionShown(true)}><Eye size={14} /> I've tried it — show the solution</button>}
            </div>
          )}
          <button className="btn btn-primary" disabled={busy || (material.practice_problem && !solutionShown)} onClick={finishPractice} style={{ justifySelf: 'end' }}>
            {material.practice_problem && !solutionShown ? 'Work through the practice problem first' : 'Practice done — take Quiz 2'} <ArrowRight size={14} />
          </button>
        </div>
      )}

      {phase === 'quiz2' && quiz && <Quiz title={`Quiz 2 · ${topic.name}`} quiz={quiz} answers={answers} setAnswers={setAnswers} onSubmit={() => submitQuiz('post')} submitting={busy} tabSwitches={tabSwitches} />}

      {phase === 'result2' && result2 && (
        <>
          <ScoreCard label="QUIZ 2 SCORE" result={result2} />
          {result2.passed ? (
            <button className="btn btn-primary" onClick={() => setPhase('summary')} style={{ justifySelf: 'end' }}>See Quiz 1 vs Quiz 2 comparison <ArrowRight size={14} /></button>
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}><Coffee size={18} /> Learning fatigue check</h3>
              <p style={{ color: 'var(--color-text-2)', marginTop: 0 }}>Quiz 2 is still below 80%. Before you continue, tell us how you feel — we combine this with your session time and score trend.</p>
              {!fatigue ? (
                <>
                  {[['energy', 'Energy level'], ['focus', 'Ability to focus']].map(([k, label]) => (
                    <label key={k} style={{ display: 'grid', gap: 4, marginBottom: 10, color: 'var(--color-text-2)', fontSize: '.85rem', fontWeight: 600 }}>
                      {label}: {fatigueForm[k]} / 5
                      <input type="range" min="1" max="5" value={fatigueForm[k]} onChange={e => setFatigueForm(f => ({ ...f, [k]: Number(e.target.value) }))} />
                    </label>
                  ))}
                  <button className="btn btn-primary" disabled={busy} onClick={checkFatigue}>Check my fatigue</button>
                </>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div className="card-inset" style={{ padding: 12 }}>
                    <strong style={{ color: fatigue.fatigued ? 'var(--color-danger)' : 'var(--color-ok)' }}>
                      {fatigue.fatigued ? 'Yes — you are showing signs of fatigue' : 'No — fatigue is low'} ({fatigue.fatigue_score}/100)
                    </strong>
                    <div style={{ fontSize: '.82rem', color: 'var(--color-text-3)' }}>Signals: {fatigue.reasons.join('; ')}</div>
                  </div>
                  {fatigue.fatigued ? (
                    <>
                      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-2)', lineHeight: 1.7 }}>{fatigue.suggestions.map(s => <li key={s}>{s}</li>)}</ul>
                      <button className="btn btn-primary" onClick={() => setPhase('summary')}>Take a break — show my topics to study <ArrowRight size={14} /></button>
                    </>
                  ) : (
                    <button className="btn btn-primary" disabled={busy} onClick={openPractice}><RotateCcw size={14} /> Continue practice, then retake Quiz 2</button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {phase === 'summary' && result1 && (
        <>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}><TrendingUp size={18} /> Quiz 1 &amp; Quiz 2 comparison</h3>
            {[['Quiz 1', result1.score_percentage, 'var(--color-warn)'], ['Quiz 2', result2?.score_percentage ?? 0, 'var(--color-ok)']].map(([label, v, color]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', color: 'var(--color-text-2)' }}><span>{label}</span><strong>{v}%</strong></div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${v}%`, background: color }} /></div>
              </div>
            ))}
            {result2 && <p style={{ margin: 0, color: 'var(--color-text-2)' }}>Learning gain: <strong>{result2.score_gain_pct >= 0 ? '+' : ''}{result2.score_gain_pct} points</strong> · Status: <strong>{result2.mastery_status}</strong></p>}
          </div>
          <TopicsToStudy items={result2?.topics_to_study || result1.topics_to_study} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {(result2?.topics_to_study || []).filter(t => t.topic_id).map(t => (
              <button key={t.topic_id} className="btn btn-primary" onClick={() => goNext(t)}>Next learning path: {t.topic} <ArrowRight size={14} /></button>
            ))}
            <button className="btn btn-secondary" onClick={() => setPhase('select')}>Back to topics</button>
          </div>
        </>
      )}
    </div>
  );
}
