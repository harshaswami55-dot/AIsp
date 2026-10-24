import React, { useEffect, useState } from 'react';
import { GraduationCap, Send, Shuffle, AlertTriangle, MessageSquareText, ListChecks } from 'lucide-react';
import { authFetch } from '../api';
import { PageHero, Stagger, SectionTitle, Skeleton } from '../components/ui';
import { RecallFeedback, scoreColor } from './ReflectionsView';

async function api(url, options) {
  const res = await authFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export default function TeachAIView() {
  const [topic, setTopic] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickTopic = async (exclude) => {
    setBusy(true); setError(''); setResult(null); setAnswer('');
    try { setTopic(await api(`/api/teach/topic${exclude ? `?exclude=${exclude}` : ''}`)); }
    catch (e) { setError(e.message); setTopic(null); }
    finally { setBusy(false); }
  };
  useEffect(() => { pickTopic(); }, []);

  const evaluate = async () => {
    setBusy(true); setError('');
    try { setResult(await api('/api/teach/evaluate', { method: 'POST', body: { topic_id: topic.topic_id, explanation: answer } })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const inRange = words >= 80 && words <= 200;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 18, maxWidth: 1000, margin: '0 auto' }}>
      <PageHero
        icon={GraduationCap}
        tone="teach"
        eyebrow="Learn by teaching"
        title="Teach the AI"
        subtitle="The AI picks a topic from the syllabus you've completed, leaning towards your weaker ones. Teach it in your own words and you're scored against reference answers using the CIE rubric."
        actions={topic && <button className="btn-hero btn-hero-ghost" disabled={busy} onClick={() => pickTopic(topic.topic_id)}><Shuffle size={14} /> Another topic</button>}
        stats={topic ? [
          { label: 'Your best quiz score', value: topic.your_best_quiz_score ?? null, suffix: '%' },
          { label: 'Words written', value: String(words) }, // string: AnimatedNumber restarts from 0 on each keystroke
          { label: 'Teaching score', value: result?.score ?? null, suffix: '/100' },
        ] : []}
      />

      {error && <div className="card reveal" style={{ padding: 14, color: 'var(--color-danger)', display: 'flex', gap: 8 }}><AlertTriangle size={16} /> {error}</div>}

      {!topic && busy && <Skeleton rows={2} height={120} />}

      {topic && (
        <div key={topic.topic_id} className="card reveal" style={{ padding: 20, display: 'grid', gap: 12, '--delay': '120ms' }}>
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', color: 'var(--color-text-3)', marginBottom: 6 }}>YOUR TOPIC</div>
            <SectionTitle icon={MessageSquareText}>{topic.topic_name}</SectionTitle>
          </div>
          <p className="card-inset" style={{ margin: 0, padding: 14, color: 'var(--color-text)', lineHeight: 1.6, borderLeft: '3px solid var(--color-accent)' }}>{topic.prompt}</p>
          <textarea rows={8} maxLength={3000} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Answer in your own words…" style={{ resize: 'vertical' }} />
          <div className="progress-track" style={{ height: 4 }} aria-hidden="true">
            <div style={{ height: '100%', width: `${Math.min(100, (words / 200) * 100)}%`, borderRadius: 'inherit', background: inRange ? 'var(--color-ok)' : words > 200 ? 'var(--color-warn)' : 'var(--color-accent)', transition: 'width .25s, background .3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '.8rem', color: inRange ? 'var(--color-ok)' : 'var(--color-text-3)' }}>{words} words · aim for 80–200</span>
            <button className="btn btn-primary" disabled={busy || !answer.trim()} onClick={evaluate}><Send size={14} /> {busy ? 'Scoring…' : 'Submit & score'}</button>
          </div>
        </div>
      )}

      {result && (
        <div className="card reveal" style={{ padding: 20, display: 'grid', gap: 14 }}>
          <SectionTitle icon={ListChecks}>Rubric breakdown</SectionTitle>
          <Stagger step={70} style={{ display: 'grid', gap: 12 }}>
            {result.criteria.map(c => (
              <div key={c.criterion}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '.85rem', color: 'var(--color-text-2)', marginBottom: 4 }}>
                  <span>{c.criterion} <span style={{ color: 'var(--color-text-3)' }}>({c.weight}%)</span></span><strong style={{ color: scoreColor(c.score) }}>{c.score}</strong>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${c.score}%`, background: scoreColor(c.score) }} /></div>
              </div>
            ))}
          </Stagger>
          <RecallFeedback feedback={result} references={result.references} />
        </div>
      )}
    </div>
  );
}
