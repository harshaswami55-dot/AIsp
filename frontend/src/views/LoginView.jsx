import React, { useState } from 'react';
import { GraduationCap, Users, Building2, ArrowRight, ArrowLeft, Lock, Mail, Eye, EyeOff, Sparkles, TrendingUp, ShieldCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '../api';
import { BrandMark } from '../components/PortalShell';

const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap, hint: 'Use your RV University student email, e.g. name…@rvu.edu.in' },
  { id: 'faculty', label: 'Faculty', icon: Users, hint: 'Use your faculty email.' },
  { id: 'dean', label: 'Dean', icon: Building2, hint: 'Use your department email.' },
];

const POINTS = [
  { icon: Sparkles, text: 'An adaptive study planner that tests, teaches and re-tests every topic.' },
  { icon: TrendingUp, text: 'Day-wise learning gain, fatigue checks and scored reflections.' },
  { icon: ShieldCheck, text: 'One record shared with your faculty, so help arrives where it is needed.' },
];

export default function LoginView({ onLogin, onBack }) {
  const [selectedRole, setSelectedRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const roleIndex = ROLES.findIndex(r => r.id === selectedRole);

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your college email and password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/auth/token', {
        method: 'POST',
        body: { username: email.trim(), password },
      });
      if (res.status === 401) throw new Error('Incorrect email or password.');
      if (!res.ok) throw new Error('Authentication failed. Please try again.');
      const data = await res.json();
      if (!data.access_token) throw new Error('The server did not return an authentication token.');

      const role = data.role === 'admin' ? 'dean' : data.role;
      const deanAsFaculty = role === 'dean' && selectedRole === 'faculty';
      if (selectedRole && role !== selectedRole && !deanAsFaculty) {
        throw new Error(`This is a ${role} account. Choose "${role[0].toUpperCase() + role.slice(1)}" above.`);
      }
      localStorage.setItem('ai360_token', data.access_token);
      onLogin({ ...data, role, portal: deanAsFaculty ? 'faculty' : role });
    } catch (err) {
      setError(err.message || 'Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg-root">
      <aside className="lg-side">
        <span className="lg-orb" style={{ width: 380, height: 380, right: -120, top: -100, background: '#E8A0B4' }} />
        <span className="lg-orb" style={{ width: 300, height: 300, left: -80, bottom: -60, background: '#D7B88D', animationDirection: 'reverse' }} />
        <div className="reveal" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandMark />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>AI Learning Partner 360</div>
        </div>
        <div>
          <div className="hero-eyebrow reveal" style={{ '--delay': '80ms', color: '#FFF8F0' }}>RV University · School of Business</div>
          <h1 className="lg-title reveal" style={{ '--delay': '140ms', marginTop: 12 }}>Welcome back.<br />Let's keep <em>learning.</em></h1>
          <div className="lg-points">
            {POINTS.map(({ icon: Icon, text }, i) => (
              <div key={text} className="lg-point reveal" style={{ '--delay': `${260 + i * 90}ms` }}><i><Icon size={16} /></i>{text}</div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '.78rem', opacity: .65 }}>Adaptive learning for every course</div>
      </aside>

      <main className="lg-main">
        {onBack && <button className="lg-back" onClick={onBack}><ArrowLeft size={15} /> Home</button>}
        <form className="lg-card reveal" style={{ '--delay': '120ms' }} onSubmit={handleCredentialLogin} noValidate>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.7rem', letterSpacing: '-.02em', color: 'var(--color-text)' }}>Sign in</h2>
          <p style={{ margin: '6px 0 22px', color: 'var(--color-text-3)', fontSize: '.92rem' }}>Choose your role and use your college email.</p>

          <div className="lg-seg" role="radiogroup" aria-label="Role">
            <span className="lg-seg-pill" style={{ transform: `translateX(${roleIndex * 100}%)` }} aria-hidden="true" />
            {ROLES.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={selectedRole === id} className={selectedRole === id ? 'on' : ''}
                onClick={() => { setSelectedRole(id); setError(''); }}>
                <Icon size={19} />{label}
              </button>
            ))}
          </div>

          <label className="lg-field">College email
            <span className="lg-input">
              <Mail size={17} />
              <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@rvu.edu.in" required />
            </span>
          </label>
          <div style={{ fontSize: '.74rem', color: 'var(--color-text-3)', marginTop: 6 }}>{ROLES[roleIndex].hint}</div>

          <label className="lg-field">Password
            <span className="lg-input">
              <Lock size={17} />
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your college password" required />
              <button type="button" className="lg-eye" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {error && <div className="lg-error" role="alert" key={error}>{error}</div>}

          <button type="submit" className="lg-submit" disabled={loading}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in…</> : <>Sign in as {ROLES[roleIndex].label} <ArrowRight size={18} /></>}
          </button>
          <p style={{ textAlign: 'center', fontSize: '.76rem', color: 'var(--color-text-3)', marginTop: 18 }}>Secure campus sign-in · your session ends when you sign out</p>
        </form>
      </main>
    </div>
  );
}
