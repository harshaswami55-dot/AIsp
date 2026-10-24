import React, { useState, useEffect } from 'react';
import { authFetch } from '../api';
import { TrendingUp, AlertTriangle, Plus, GraduationCap, Target, Users, Brain, Layers, Repeat, Lightbulb, Activity } from 'lucide-react';
import { PageHero, Stagger, AnimatedNumber, SectionTitle, Skeleton } from '../components/ui';

const ROW_HOVER = '.fx-row td { transition: background .18s ease; } .fx-row:hover td { background: var(--color-surface-2); } .pill-live::before { display: none; }';

function Tile({ icon: Icon, label, value, sub, color = 'var(--color-text)' }) {
  return (
    <div className="card hover-lift" style={{ padding: 18, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-3)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.04em' }}><Icon size={15} /> {label}</div>
      <div style={{ fontSize: '1.9rem', fontWeight: 800, color, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: '.78rem', color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function FacultyDashboardView({ insightsOnly = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/faculty/dashboard');
      if (!res.ok) throw new Error('Could not load faculty analytics');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchIntervention = async (topic, misconception) => {
    setTriggering(true);
    try {
      const res = await authFetch('/api/faculty/intervention/trigger', {
        method: 'POST',
        body: {
          topic: topic || "ADF Test Stationarity Clinic",
          misconception: misconception || "P-value inversion misconception",
          action: "Schedule 20-minute live demonstration."
        }
      });
      if (!res.ok) throw new Error('Could not launch intervention');
      await fetchFacultyData();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  if (loading && !data) return <Skeleton rows={4} height={110} />;
  if (!data) {
    return (
      <div className="card" role="alert" style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-2)' }}>
        <AlertTriangle size={28} color="var(--color-danger)" style={{ margin: '0 auto 10px', display: 'block' }} />
        Faculty analytics are unavailable.
      </div>
    );
  }

  const {
    instructor,
    course_code,
    course_title,
    total_enrolled_students,
    class_average_mastery,
    overall_learning_gain,
    class_retention_rate,
    independent_solvers_pct,
    module_mastery = [],
    difficult_topics = [],
    active_interventions = [],
    aggregated_misconceptions = [],
    student_learning_gains = []
  } = data;

  if (insightsOnly) {
    return <section className="card reveal" style={{ padding: 24 }}>
      <style>{ROW_HOVER}</style>
      <SectionTitle icon={TrendingUp}>Student Learning Gain Insights</SectionTitle>
      <p style={{ color: 'var(--color-text-3)', margin: '0 0 18px' }}>Per-student Quiz 1 to Quiz 2 results from completed learning journeys.</p>
      {student_learning_gains.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text-2)' }}><thead><tr>{['Student', 'Completed topics', 'Quiz 1 average', 'Quiz 2 average', 'Learning gain'].map(label => <th key={label} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--color-border)', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-3)' }}>{label}</th>)}</tr></thead><tbody>{student_learning_gains.map(row => <tr key={row.student_id} className="fx-row">{[row.student_name, row.attempts, `${row.average_pre_score}%`, `${row.average_post_score}%`, `${row.average_learning_gain > 0 ? '+' : ''}${row.average_learning_gain} pp`].map((value, i) => <td key={i} style={{ padding: 10, borderBottom: '1px solid var(--color-border)', fontWeight: i === 4 ? 700 : 400, color: i === 4 ? (row.average_learning_gain >= 0 ? 'var(--color-ok)' : 'var(--color-danger)') : undefined }}>{value}</td>)}</tr>)}</tbody></table></div> : <p style={{ color: 'var(--color-text-3)' }}>No completed Quiz 1 and Quiz 2 attempts yet.</p>}
    </section>;
  }

  const masteryColor = v => (v >= 80 ? 'var(--color-ok)' : v >= 50 ? 'var(--color-warn)' : 'var(--color-danger)');

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <style>{ROW_HOVER}</style>
      <PageHero
        icon={GraduationCap}
        tone="faculty"
        eyebrow={`${course_code} · ${course_title}`}
        title="Faculty Learning & Intervention Intelligence"
        subtitle={`${instructor ? `${instructor} · ` : ''}Learning progress and misconception signals from completed student quizzes.`}
        actions={
          <button className="btn-hero" onClick={() => handleLaunchIntervention("Seasonal Differencing in SARIMA", "Confusing d=1 with D=1")} disabled={triggering}>
            <Plus size={14} /> {triggering ? 'Launching…' : 'Launch Targeted Clinic'}
          </button>
        }
        stats={[
          { label: 'Enrolled students', value: total_enrolled_students },
          { label: 'Class avg mastery', value: class_average_mastery, decimals: 1, suffix: '%' },
          { label: 'Avg learning gain', value: overall_learning_gain, decimals: 1, prefix: '±', suffix: ' pp' },
          { label: 'Topics at risk', value: difficult_topics.length },
        ]}
      />

      <Stagger step={60} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Tile icon={Target} label="CLASS AVG POST-QUIZ" value={<AnimatedNumber value={class_average_mastery} decimals={1} suffix="%" />} sub={`${student_learning_gains.length} students with completed journeys`} />
        <Tile icon={TrendingUp} label="COHORT LEARNING GAIN" color="var(--color-ok)" value={<AnimatedNumber value={overall_learning_gain} decimals={1} prefix="±" suffix=" pp" />} sub="Average Quiz 1 to Quiz 2 gain" />
        <Tile icon={Repeat} label="CONCEPT RETENTION" value={class_retention_rate ?? '–'} sub="No delayed retest data recorded" />
        <Tile icon={Users} label="INDEPENDENT SOLVERS" value={independent_solvers_pct ?? '–'} sub="No independent-solving data recorded" />
      </Stagger>

      <Stagger start={200} step={90} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: 20, height: '100%' }}>
          <SectionTitle icon={AlertTriangle} right={difficult_topics.length > 0 && <span className="badge badge-danger pill-live"><span className="pulse-dot" /> {difficult_topics.length} flagged</span>}>
            Topics requiring intervention
          </SectionTitle>
          <div style={{ display: 'grid', gap: 12 }}>
            {difficult_topics.length ? difficult_topics.map((item, idx) => (
              <div key={idx} className="card-inset hover-lift" style={{ padding: 14, borderLeft: '3px solid var(--color-danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text)' }}>{item.topic}</div>
                  <span className="badge badge-danger pill-live"><span className="pulse-dot" /> {item.students_at_risk} at risk</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-danger)', marginTop: 6 }}>Root cause: {item.common_error}</div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: 4 }}>
                    <span>Cohort mastery</span><strong style={{ color: 'var(--color-text-2)' }}>{item.cohort_mastery == null ? '–' : `${item.cohort_mastery}%`}</strong>
                  </div>
                  {item.cohort_mastery != null && <div className="progress-track"><div className="progress-fill" style={{ width: `${item.cohort_mastery || 0}%`, background: masteryColor(item.cohort_mastery) }} /></div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button className="btn btn-faculty" style={{ fontSize: '0.75rem', padding: '4px 12px' }} onClick={() => handleLaunchIntervention(item.topic, item.common_error)}>
                    Launch Clinic
                  </button>
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)', margin: 0 }}>No completed quiz attempts with weak-concept responses.</p>}
          </div>
        </div>

        <div className="card" style={{ padding: 20, height: '100%' }}>
          <SectionTitle icon={Activity}>Intervention impact & learning gains</SectionTitle>
          <div style={{ display: 'grid', gap: 12 }}>
            {active_interventions.length ? active_interventions.map((intv, idx) => (
              <div key={idx} className="card-inset hover-lift" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-text)' }}>{intv.topic}</span>
                  <span className={`badge ${intv.status === 'Completed' ? 'badge-ok' : 'badge-warn pill-live'}`}>
                    {intv.status !== 'Completed' && <span className="pulse-dot" />} {intv.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-2)', margin: '4px 0 0' }}>{intv.recommended_action}</p>
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface-3)', color: 'var(--color-text-3)', fontSize: '0.78rem' }}>
                  Learning gain is reported in Student Insights after Quiz 2 completion.
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)', margin: 0 }}>No faculty interventions have been launched.</p>}
          </div>
        </div>

        <div className="card" style={{ padding: 20, height: '100%' }}>
          <SectionTitle icon={Lightbulb}>Aggregated cohort misconceptions</SectionTitle>
          <div style={{ display: 'grid', gap: 12 }}>
            {aggregated_misconceptions.length ? aggregated_misconceptions.map((m, idx) => (
              <div key={idx} className="card-inset hover-lift" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-faculty">{m.topic}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 700 }}>Flagged {m.frequency} times</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, marginTop: 6 }}>"{m.text}"</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-2)', marginTop: 4, lineHeight: 1.5 }}>{m.correction}</div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)', margin: 0 }}>No aggregated quiz misconception signals recorded.</p>}
          </div>
        </div>

        <div className="card" style={{ padding: 20, height: '100%' }}>
          <SectionTitle icon={Layers}>Module post-quiz averages</SectionTitle>
          {module_mastery.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {module_mastery.map(item => (
                <div key={item.module}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '.85rem', color: 'var(--color-text-2)' }}>
                    <span>{item.name}</span><strong>{item.average_mastery}%</strong>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${item.average_mastery || 0}%`, background: masteryColor(item.average_mastery) }} /></div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--color-text-3)', fontSize: '0.85rem', margin: 0 }}>No completed quiz attempts to summarize.</p>}
          <div style={{ marginTop: 20 }}><SectionTitle icon={Brain}>Course outcome achievement</SectionTitle></div>
          <p style={{ color: 'var(--color-text-3)', fontSize: '0.85rem', margin: 0 }}>Course outcome mappings are not yet recorded for the completed quiz questions.</p>
        </div>
      </Stagger>
    </div>
  );
}
