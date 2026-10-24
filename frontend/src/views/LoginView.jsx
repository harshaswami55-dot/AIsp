import React, { useState } from 'react';
import { Brain, GraduationCap, Users, Building2, ArrowRight, Sparkles, BookOpen, TrendingUp, Lock, Mail } from 'lucide-react';
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
  const [selectedRole, setSelectedRole] = useState(null); // 'student', 'faculty', 'dean'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your college email and password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Determine demo user based on selected role
      const demoUser = selectedRole === 'dean' ? 'admin' : (selectedRole || 'student');
      const res = await apiFetch(`/api/auth/demo/${demoUser}`);
      if (!res.ok) throw new Error('Authentication failed. Please check your credentials.');
      const data = await res.json();
      if (!data.access_token) throw new Error('The server did not return an authentication token.');

      localStorage.setItem('ai360_token', data.access_token);
      const role = selectedRole === 'dean' ? (data.role === 'admin' ? 'dean' : data.role) : (selectedRole || data.role);
      onLogin({ ...data, role, email });
    } catch (err) {
      setError(err.message || 'Could not connect to the server. Please try again.');
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
      <div className="login-rvu-brand" style={{ textAlign: 'center', marginBottom: '36px', animation: 'fadeUp 0.5s ease both' }}>
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
      </div>

      {/* Conditional View: Role selection OR Credential Login Form */}
      {!selectedRole ? (
        <div className="role-selector-stage" style={{ width: '100%', maxWidth: 860, animation: 'fadeUp 0.5s 0.1s ease both' }}>
          <p style={{
            textAlign: 'center', fontSize: '0.8rem', fontWeight: 700,
            color: 'var(--color-text-3)', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 20,
          }}>
            Select your role to sign in
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => {
                    setSelectedRole(role.id);
                    // Pre-fill a realistic email based on role
                    if (role.id === 'student') setEmail('student.sb6202@rvu.edu.in');
                    else if (role.id === 'faculty') setEmail('faculty.forecasting@rvu.edu.in');
                    else setEmail('dean.business@rvu.edu.in');
                  }}
                  style={{
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px 22px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex', flexDirection: 'column', gap: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = role.color;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `var(--shadow-lg), 0 8px 24px ${role.colorAlpha}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: role.colorAlpha,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={22} color={role.color} />
                    </div>
                    <ArrowRight size={18} color="var(--color-text-3)" style={{ opacity: 0.5 }} />
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
                        background: 'var(--color-surface-2)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-3)',
                      }}>{s}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-xl)',
          animation: 'fadeUp 0.3s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: 24 }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.08em' }}>
                {selectedRole.toUpperCase()} PORTAL LOGIN
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 4 }}>
                Sign in with College ID
              </h2>
            </div>
          </div>

          <form onSubmit={handleCredentialLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                College Email ID
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} color="var(--color-text-3)" style={{ position: 'absolute', left: 14 }} />
                <input
                  type="email"
                  required
                  placeholder="e.g. student.sb6202@rvu.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text)',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} color="var(--color-text-3)" style={{ position: 'absolute', left: 14 }} />
                <input
                  type="password"
                  required
                  placeholder="Enter your college password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text)',
                    fontSize: '0.92rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {error && (
              <p role="alert" style={{ fontSize: '0.85rem', color: 'var(--color-danger)', margin: 0 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSelectedRole(null); setError(''); }}
                style={{ flex: 1, padding: '12px' }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 2, padding: '12px', justifyContent: 'center' }}
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--color-text-3)', textAlign: 'center' }}>
        RV University School of Business · Secure Campus Authentication
      </p>
    </div>
  );
}
