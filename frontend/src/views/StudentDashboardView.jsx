import React from 'react';
import {
  TrendingUp, Award, Target, CheckCircle2, AlertTriangle,
  Brain, ArrowRight, ShieldCheck, BookOpen, Sparkles, BarChart3
} from 'lucide-react';

export default function StudentDashboardView({ data, onNavigate }) {
  if (!data) return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center' }}>Loading dashboard analytics...</div>;

  const {
    student_name,
    course_title,
    instructor,
    school,
    overall_mastery,
    mastery_level,
    module_mastery = [],
    strong_topics = [],
    needs_attention_topics = [],
    todays_goal = {},
    learning_gain,
    retention_rate,
    independent_performance,
    ai_independence_gain,
    ai_support_level
  } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-blue">{school}</span>
              <span className="badge badge-purple">{course_title}</span>
              <span className="badge badge-emerald">Instructor: {instructor}</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              Welcome back, {student_name}
            </h2>
            <p style={{ color: 'var(--color-text-3)', fontSize: '0.95rem', marginTop: '4px' }}>
              "From AI that gives answers to AI that builds forecasters."
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('lab')}>
              <BarChart3 size={16} /> Open Forecasting Lab
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('independence')}>
              <ShieldCheck size={16} /> AI Independence
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* Overall Mastery */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 600 }}>OVERALL MASTERY</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--color-text)', marginTop: '6px' }}>
                {overall_mastery}%
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', color: '#60a5fa' }}>
              <Award size={24} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-blue">{mastery_level}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>Benchmark: 60%</span>
          </div>
        </div>

        {/* AI Independence Gain */}
        <div className="glass-panel" style={{ padding: '20px', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 600 }}>AI INDEPENDENCE GAIN</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                {ai_independence_gain}
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', color: '#10b981' }}>
              <ShieldCheck size={24} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>Unaided Score: 50% → 82%</span>
          </div>
        </div>

        {/* Learning Gain */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 600 }}>LEARNING GAIN</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
                {learning_gain}
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '12px', color: '#38bdf8' }}>
              <TrendingUp size={24} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>Pre vs Post Assessment</span>
          </div>
        </div>

        {/* AI Support Level */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 600 }}>AI SUPPORT LEVEL</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '8px' }}>
                Level 2
              </div>
            </div>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px', color: '#f59e0b' }}>
              <Brain size={24} />
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <span className="badge badge-amber">Hints Only (Fading Active)</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Module Mastery Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#3b82f6" /> Syllabus Module Mastery
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>RV University SB6202</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {module_mastery.map((m, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-blue">Mod {m.module_number}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-text)' }}>{m.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: m.mastery_score >= 70 ? '#10b981' : (m.mastery_score >= 55 ? '#f59e0b' : '#f43f5e') }}>
                      {m.mastery_score}%
                    </span>
                    <span className={`badge ${m.mastery_score >= 70 ? 'badge-emerald' : (m.mastery_score >= 55 ? 'badge-amber' : 'badge-rose')}`} style={{ fontSize: '0.7rem' }}>
                      {m.mastery_level}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${m.mastery_score}%`,
                      height: '100%',
                      background: m.mastery_score >= 70 ? 'linear-gradient(90deg, #10b981, #059669)' : (m.mastery_score >= 55 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #f43f5e, #e11d48)'),
                      borderRadius: '999px',
                      transition: 'width 0.8s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Learning Goal & Recommended Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Action Box */}
          <div className="glass-panel" style={{ padding: '24px', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sparkles size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)' }}>Today's Learning Focus</h3>
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#93c5fd', marginBottom: '16px' }}>
              {todays_goal.title}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todays_goal.steps?.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: st.status === 'ready' ? '#3b82f6' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {st.step}
                  </span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--color-text-2)', flex: 1 }}>{st.task}</span>
                  {st.status === 'ready' ? (
                    <span className="badge badge-blue">Ready</span>
                  ) : (
                    <span className="badge badge-amber">In Progress</span>
                  )}
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: '20px', width: '100%' }}
              onClick={() => onNavigate('lab')}
            >
              Resume Today's Forecasting Plan <ArrowRight size={16} />
            </button>
          </div>

          {/* Topics Breakdown (Strong vs Needs Attention) */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>
              Topic Proficiency Analysis
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Strong */}
              <div>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <CheckCircle2 size={15} /> STRONG TOPICS
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {strong_topics.map((t, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                      <span style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>Mastery: {t.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Needs Attention */}
              <div>
                <span style={{ fontSize: '0.8rem', color: '#f43f5e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <AlertTriangle size={15} /> NEEDS ATTENTION
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {needs_attention_topics.map((t, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '8px', borderLeft: '3px solid #f43f5e' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                      <span style={{ fontSize: '0.72rem', color: '#fda4af' }}>Mastery: {t.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
