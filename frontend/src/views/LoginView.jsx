import React, { useState } from 'react';
import { Brain, GraduationCap, Users, Building2, ArrowRight, Sparkles, BookOpen, TrendingUp } from 'lucide-react';
import DepthScene from '../components/DepthScene';
import { apiFetch } from '../api';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    subtitle: 'MBA Candidate',
    description: 'Access your personalized AI learning journey, quizzes, skill studio, and performance dashboard.',
    icon: GraduationCap,
    color: 'var(--color-student)',
    colorAlpha: 'rgba(74,127,165,0.10)',
    colorBorder: 'rgba(74,127,165,0.25)',
    demoUser: 'student',
    stats: ['AI Study Planner', 'Skill Studio', 'Teach the AI'],
  },
  {
    id: 'faculty',
    label: 'Faculty',
    subtitle: 'Course Instructor',
    description: 'View class performance, topic misconceptions, student insights, and trigger targeted interventions.',
    icon: Users,
    color: 'var(--color-faculty)',
    colorAlpha: 'rgba(107,127,74,0.10)',
    colorBorder: 'rgba(107,127,74,0.25)',
    demoUser: 'faculty',
    stats: ['Class Overview', 'Student Insights', 'Misconceptions'],
  },
  {
    id: 'dean',
    label: 'Dean',
    subtitle: 'Department Head',
    description: 'Monitor department-wide performance metrics, faculty insights, and subject-wise analytics.',
    icon: Building2,
    color: 'var(--color-dean)',
    colorAlpha: 'rgba(122,74,107,0.10)',
    colorBorder: 'rgba(122,74,107,0.25)',
    demoUser: 'admin',
    stats: ['Dept. Performance', 'Faculty Insights', 'Subject Analysis'],
  },
];

export default function LoginView({ onLogin, onBack }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/auth/demo/${selected.demoUser}`);
      if (!res.ok) throw new Error('Demo login is unavailable. Please try again later.');
      const data = await res.json();
      if (!data.access_token) throw new Error('The server did not return an authentication token.');
      localStorage.setItem('ai360_token', data.access_token);
      const role = selected.id === 'dean' ? (data.role === 'admin' ? 'dean' : data.role) : selected.id;
      onLogin({ ...data, role });
    } catch (e) {
      setError(e.message || 'Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-rvu-shell" style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <DepthScene variant="login" />
      {/* Background texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 50% at 20% 20%, rgba(196,122,46,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 50% 60% at 80% 80%, rgba(74,127,165,0.06) 0%, transparent 70%)
        `,
      }} />

      {/* Brand header */}
      <div className="login-rvu-brand" style={{ textAlign: 'center', marginBottom: '48px', animation: 'fadeUp 0.5s ease both' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: 'var(--shadow-lg), 0 8px 24px rgba(196,122,46,0.25)',
        }}>
          <Brain size={30} color="#fff" />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 2.8rem)',
          fontWeight: 700,
          color: 'var(--color-text)',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
        }}>
          AI Learning <em>Partner</em> 360
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--color-text-3)',
          marginTop: 10,
          fontStyle: 'italic',
        }}>
          RV University School of Business · SB6202 Business Forecasting
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { icon: Sparkles, label: 'AI-Powered Learning' },
            { icon: BookOpen, label: 'Business Forecasting' },
            { icon: TrendingUp, label: 'Adaptive Analytics' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-3)', fontSize: '0.82rem' }}>
              <Icon size={14} color="var(--color-accent)" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Role selector */}
      <div className="role-selector-stage" style={{
        width: '100%', maxWidth: 860,
        animation: 'fadeUp 0.5s 0.1s ease both',
      }}>
        <p style={{
          textAlign: 'center', fontSize: '0.8rem', fontWeight: 700,
          color: 'var(--color-text-3)', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 20,
        }}>
          Select your role to continue
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            const isSelected = selected?.id === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelected(role)}
                style={{
                  background: isSelected ? role.colorAlpha : 'var(--color-surface)',
                  border: `2px solid ${isSelected ? role.colorBorder : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px 22px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: isSelected ? `var(--shadow-lg), 0 8px 24px ${role.colorAlpha}` : 'var(--shadow-md)',
                  transform: isSelected ? 'translateY(-3px)' : 'none',
                  animation: `fadeUp 0.5s ${0.1 + i * 0.07}s ease both`,
                  display: 'flex', flexDirection: 'column', gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: isSelected ? role.color : 'var(--color-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s ease',
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                  }}>
                    <Icon size={22} color={isSelected ? '#fff' : role.color} />
                  </div>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: `2px solid ${isSelected ? role.color : 'var(--color-border-md)'}`,
                    background: isSelected ? role.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.18s ease',
                  }}>
                    {isSelected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                      {role.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{role.subtitle}</span>
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                    {role.description}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {role.stats.map(s => (
                    <span key={s} style={{
                      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                      borderRadius: 9999, border: '1px solid',
                      background: isSelected ? role.colorAlpha : 'var(--color-surface-2)',
                      borderColor: isSelected ? role.colorBorder : 'var(--color-border)',
                      color: isSelected ? role.color : 'var(--color-text-3)',
                      transition: 'all 0.18s ease',
                    }}>{s}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {error && <p role="alert" style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: 16 }}>{error}</p>}

        {/* Enter button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <button
            className="btn"
            disabled={!selected || loading}
            onClick={handleLogin}
            style={{
              padding: '13px 36px', fontSize: '1rem', fontWeight: 700,
              background: selected ? selected.color : 'var(--color-surface-3)',
              color: selected ? '#fff' : 'var(--color-text-3)',
              borderColor: 'transparent',
              borderRadius: 'var(--radius-lg)',
              boxShadow: selected ? `var(--shadow-lg), 0 8px 24px ${selected?.colorAlpha || 'transparent'}` : 'var(--shadow-sm)',
              transform: selected ? 'none' : 'none',
              cursor: selected ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.25s ease',
              gap: 10,
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Entering portal…
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Enter {selected?.label || ''} Portal
                <ArrowRight size={18} />
              </span>
            )}
          </button>
        </div>
      </div>

      {onBack && <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: 18 }}>Back to overview</button>}
      <p style={{ marginTop: 20, fontSize: '0.75rem', color: 'var(--color-text-3)', textAlign: 'center' }}>
        Demo mode · No credentials required · RV University SOB
      </p>
    </div>
  );
}
