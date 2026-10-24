import React from 'react';
import { Brain, Target, BookOpen, Activity, Briefcase, ArrowRight, AlertTriangle, Award, LayoutDashboard, Lightbulb } from 'lucide-react';
import { PageHero, Stagger, AnimatedNumber, SectionTitle, Skeleton } from '../components/ui';

const fmt = (v, suffix = '%') => (v === null || v === undefined ? '–' : `${v}${suffix}`);

function Tile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card hover-lift" style={{ padding: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-3)', fontSize: '.75rem', fontWeight: 700 }}><Icon size={15} /> {label}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '.78rem', color: 'var(--color-text-3)' }}>{sub}</div>}
    </div>
  );
}

export default function StudentDashboardView({ data, onNavigate }) {
  if (!data) return <Skeleton rows={4} height={110} />;
  const fresh = !data.topics_attempted;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <PageHero
        icon={LayoutDashboard}
        tone="student"
        eyebrow={data.course_title}
        title={`${greeting}, ${data.student_name.split(' ')[0]}`}
        subtitle={fresh ? "You haven't taken a quiz yet — your dashboard fills in as you study." : data.insights[0]}
        actions={<button className="btn-hero" onClick={() => onNavigate?.('planner')}>{fresh ? 'Start in AI Study Planner' : 'Continue studying'} <ArrowRight size={14} /></button>}
        stats={[
          { label: 'Overall mastery', value: data.overall_mastery, decimals: 1, suffix: '%' },
          { label: `Mastered of ${data.topics_total}`, value: data.topics_mastered },
          { label: 'Avg learning gain', value: data.average_gain, decimals: 1, prefix: '±', suffix: ' pts' },
        ]}
      />

      <Stagger step={60} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Tile icon={Target} label="TOPICS ATTEMPTED" value={<AnimatedNumber value={data.topics_attempted} />} sub="pass mark 80%" />
        <Tile icon={BookOpen} label="REFLECTION SCORE" value={<AnimatedNumber value={data.reflection_avg} decimals={1} />} sub={`${data.reflections_count} recall${data.reflections_count === 1 ? '' : 's'} scored`} />
        <Tile icon={Activity} label="LATEST FATIGUE" value={<AnimatedNumber value={data.latest_fatigue} decimals={1} suffix="/100" />} sub={data.latest_fatigue >= 50 ? 'take a break' : 'from your last check'} />
        <Tile icon={Briefcase} label="CASELET PROJECTS" value={<AnimatedNumber value={data.caselet_projects} />} sub="submitted" />
      </Stagger>

      <div className="card reveal" style={{ padding: 20, '--delay': '200ms' }}>
        <SectionTitle icon={Brain}>Module mastery</SectionTitle>
        <div style={{ display: 'grid', gap: 12 }}>
          {data.modules.map(m => (
            <div key={m.module_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '.85rem', color: 'var(--color-text-2)' }}>
                <span>Module {m.module_number}: {m.title}</span>
                <strong>{m.mastery === null ? 'not started' : `${m.mastery}%`} · {m.topics_attempted}/{m.topics_total} topics</strong>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${m.mastery || 0}%`, background: (m.mastery || 0) >= 80 ? 'var(--color-ok)' : 'var(--color-warn)' }} /></div>
            </div>
          ))}
        </div>
      </div>

      <Stagger start={280} step={90} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <div className="card hover-lift" style={{ padding: 20, height: '100%' }}>
          <SectionTitle icon={AlertTriangle}>Needs attention</SectionTitle>
          {data.weak_topics.length ? data.weak_topics.map(t => (
            <div key={t.topic_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '.88rem' }}>
              <span>{t.topic}</span><strong>{fmt(t.score)}</strong>
            </div>
          )) : <p style={{ color: 'var(--color-text-3)' }}>Nothing below 80% right now.</p>}
          {data.weak_topics.length > 0 && <button className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => onNavigate?.('planner')}>Practise in AI Study Planner</button>}
        </div>
        <div className="card hover-lift" style={{ padding: 20, height: '100%' }}>
          <SectionTitle icon={Award}>Strong topics</SectionTitle>
          {data.strong_topics.length ? data.strong_topics.map(t => (
            <div key={t.topic_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '.88rem' }}>
              <span>{t.topic}</span><strong>{fmt(t.score)}</strong>
            </div>
          )) : <p style={{ color: 'var(--color-text-3)' }}>Topics you score 80%+ on will appear here.</p>}
        </div>
        <div className="card hover-lift" style={{ padding: 20, height: '100%' }}>
          <SectionTitle icon={Lightbulb}>Insights</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-2)', lineHeight: 1.7, fontSize: '.88rem' }}>
            {data.insights.map(s => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </Stagger>
    </div>
  );
}
