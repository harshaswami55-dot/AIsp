import React, { useState, useEffect } from 'react';
import { authFetch } from '../api';
import { TrendingUp, AlertTriangle, Plus, RefreshCw } from 'lucide-react';

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

  if (loading || !data) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw className={loading ? 'animate-spin' : ''} size={32} color="var(--color-faculty)" style={{ margin: '0 auto 16px' }} />
        <h3>{loading ? 'Loading Faculty Cohort Analytics...' : 'Faculty analytics are unavailable.'}</h3>
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
    return <section className="card" style={{ padding: 24 }}>
      <h2 style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>Student Learning Gain Insights</h2>
      <p style={{ color: 'var(--color-text-3)', margin: '6px 0 18px' }}>Per-student Quiz 1 to Quiz 2 results from completed learning journeys.</p>
      {student_learning_gains.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text-2)' }}><thead><tr>{['Student', 'Completed topics', 'Quiz 1 average', 'Quiz 2 average', 'Learning gain'].map(label => <th key={label} style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--color-border)' }}>{label}</th>)}</tr></thead><tbody>{student_learning_gains.map(row => <tr key={row.student_id}>{[row.student_name, row.attempts, `${row.average_pre_score}%`, `${row.average_post_score}%`, `${row.average_learning_gain > 0 ? '+' : ''}${row.average_learning_gain} pp`].map((value, i) => <td key={i} style={{ padding: 10, borderBottom: '1px solid var(--color-border)' }}>{value}</td>)}</tr>)}</tbody></table></div> : <p style={{ color: 'var(--color-text-3)' }}>No completed Quiz 1 and Quiz 2 attempts yet.</p>}
    </section>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Faculty Top Banner */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-purple">{course_code} - {course_title}</span>
              <span className="badge badge-emerald">Faculty Portal: {instructor}</span>
              <span className="badge badge-blue">Cohort Size: {total_enrolled_students} MBA Candidates</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>
              Faculty Learning & Intervention Intelligence
            </h2>
            <p style={{ color: 'var(--color-text-3)', fontSize: '0.92rem', marginTop: '2px' }}>
              Learning progress and misconception signals from completed student quizzes.
            </p>
          </div>

          <button
            className="btn btn-emerald"
            onClick={() => handleLaunchIntervention("Seasonal Differencing in SARIMA", "Confusing d=1 with D=1")}
            disabled={triggering}
          >
            <Plus size={16} /> Launch Targeted Clinic
          </button>
        </div>
      </div>

      {/* Cohort KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 600 }}>CLASS AVERAGE POST-QUIZ SCORE</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '6px' }}>
            {class_average_mastery == null ? '—' : `${class_average_mastery}%`}
          </div>
          <span className="badge badge-blue" style={{ marginTop: '10px' }}>{student_learning_gains.length} students with completed journeys</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderColor: 'var(--color-ok)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 600 }}>COHORT LEARNING GAIN</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-ok)', marginTop: '6px' }}>
            {overall_learning_gain == null ? '—' : `${overall_learning_gain > 0 ? '+' : ''}${overall_learning_gain} pp`}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: '10px', display: 'block' }}>Average Quiz 1 to Quiz 2 score gain</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 600 }}>CONCEPT RETENTION</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-student)', marginTop: '6px' }}>
            {class_retention_rate ?? '—'}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: '10px', display: 'block' }}>No delayed retest data recorded</span>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 600 }}>INDEPENDENT SOLVERS</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-warn)', marginTop: '6px' }}>
            {independent_solvers_pct ?? '—'}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: '10px', display: 'block' }}>No independent-solving data recorded</span>
        </div>
      </div>

      {/* Main Grid: Difficult Topics & Interventions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* Difficult Topics Requiring Intervention */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#f43f5e" /> Topics Requiring Faculty Intervention
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {difficult_topics.length ? difficult_topics.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--color-surface-inset)', padding: '14px', borderRadius: '12px', borderLeft: '3px solid var(--color-danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>{item.topic}</div>
                  <span className="badge badge-rose">{item.students_at_risk} Students at Risk</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#fda4af', marginTop: '6px' }}>
                  Root Cause: {item.common_error}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Cohort Mastery: {item.cohort_mastery}%</span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => handleLaunchIntervention(item.topic, item.common_error)}
                  >
                    Launch Clinic
                  </button>
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)' }}>No completed quiz attempts with weak-concept responses.</p>}
          </div>
        </div>

        {/* Measured Faculty Interventions (Pre vs Post) */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#10b981" /> Faculty Intervention Impact & Learning Gains
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {active_interventions.length ? active_interventions.map((intv, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>{intv.topic}</span>
                  <span className={`badge ${intv.status === 'Completed' ? 'badge-emerald' : 'badge-amber'}`}>
                    {intv.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px' }}>
                  {intv.recommended_action}
                </p>

                <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '8px', background: 'var(--color-surface-inset)', color: 'var(--color-text-3)', fontSize: '0.78rem' }}>
                  Learning gain is reported in Student Insights after Quiz 2 completion.
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)' }}>No faculty interventions have been launched.</p>}
          </div>
        </div>
      </div>

      {/* Aggregated Misconceptions & CO Achievement */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* Aggregated Misconceptions */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
            Aggregated Cohort Misconceptions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aggregated_misconceptions.length ? aggregated_misconceptions.map((m, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-purple">{m.topic}</span>
                  <span style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: 700 }}>
                    Flagged {m.frequency} times
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600, marginTop: '6px' }}>
                  "{m.text}"
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                  {m.correction}
                </div>
              </div>
            )) : <p style={{ color: 'var(--color-text-3)' }}>No aggregated quiz misconception signals recorded.</p>}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>Module Post-Quiz Averages</h3>
          {module_mastery.length ? <div style={{ display: 'grid', gap: 10 }}>{module_mastery.map(item => <div key={item.module} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--color-text-2)' }}><span>{item.name}</span><strong>{item.average_mastery}%</strong></div>)}</div> : <p style={{ color: 'var(--color-text-3)', fontSize: '0.85rem' }}>No completed quiz attempts to summarize.</p>}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', margin: '20px 0 16px' }}>Course Outcome Achievement</h3>
          <p style={{ color: 'var(--color-text-3)', fontSize: '0.85rem' }}>Course outcome mappings are not yet recorded for the completed quiz questions.</p>
        </div>
      </div>
    </div>
  );
}
