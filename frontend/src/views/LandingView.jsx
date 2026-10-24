import React, { useEffect, useRef, useState } from 'react';
import {
  Brain, ArrowRight, Sparkles, TrendingUp, Activity, BookOpen, Briefcase, Layers, GraduationCap,
  LayoutDashboard, Target, RotateCcw, ListChecks, Coffee, Users, Building2, Lightbulb, CheckCircle2, LogIn,
} from 'lucide-react';
import { apiFetch } from '../api';
import { AnimatedNumber } from '../components/ui';
import { BrandMark } from '../components/PortalShell';
import './landing.css';
import './landing-sections.css';

/** Adds `in` to the element the first time it scrolls into view. */
function InView({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.18 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`${className} ${seen ? 'in' : ''}`} {...rest}>{children}</Tag>;
}

// Illustrative monthly sales: trend + festive seasonality, then a forecast with an uncertainty band.
const W = 520, H = 220, PAD = 18;
const series = Array.from({ length: 30 }, (_, i) => 120 + i * 3.2 + 26 * Math.sin((i / 12) * Math.PI * 2 - 1.2) + (i % 5 === 0 ? 6 : 0));
const forecast = Array.from({ length: 9 }, (_, k) => { const i = 29 + k; return 120 + i * 3.2 + 26 * Math.sin((i / 12) * Math.PI * 2 - 1.2); });
const all = [...series, ...forecast.slice(1)];
const yMin = Math.min(...all) - 20, yMax = Math.max(...all) + 20;
const x = (i) => PAD + (i / (all.length - 1)) * (W - PAD * 2);
const y = (v) => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - PAD * 2);
const line = (pts, offset = 0) => pts.map((v, i) => `${i ? 'L' : 'M'}${x(i + offset).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
const band = (() => {
  const up = forecast.map((v, k) => [x(29 + k), y(v + 6 + k * 4)]);
  const down = forecast.map((v, k) => [x(29 + k), y(v - 6 - k * 4)]).reverse();
  return `M${[...up, ...down].map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' L')} Z`;
})();

function ForecastVisual() {
  return (
    <div className="fp-visual">
      <div className="fp-chart-card">
        <div className="fp-chart-head">
          <div><strong>Retail Monthly Sales</strong><div>Holt-Winters · 8-month forecast</div></div>
          <span className="fp-pill" style={{ padding: '4px 10px' }}><span className="pulse-dot" style={{ color: 'var(--color-ok)' }} /> MAPE 4.7%</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Animated chart of monthly sales with a seasonal forecast and uncertainty band">
          <defs>
            <linearGradient id="fpArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A2441" stopOpacity=".18" />
              <stop offset="100%" stopColor="#7A2441" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map(f => <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - 2 * PAD)} y2={PAD + f * (H - 2 * PAD)} stroke="var(--color-border)" strokeDasharray="3 5" />)}
          <path className="fp-band" d={`${line(series)} L${x(29)},${H - PAD} L${x(0)},${H - PAD} Z`} fill="url(#fpArea)" />
          <path className="fp-band" d={band} fill="#C4882E" fillOpacity=".2" />
          <path className="fp-draw" pathLength="1" d={line(series)} fill="none" stroke="#7A2441" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path className="fp-draw fp-draw-late" pathLength="1" d={line(forecast, 29)} fill="none" stroke="#C4882E" strokeWidth="3" strokeLinecap="round" />
          <line x1={x(29)} x2={x(29)} y1={PAD} y2={H - PAD} stroke="var(--color-border-md)" strokeDasharray="4 4" />
          <circle className="fp-dot" cx={x(all.length - 1)} cy={y(forecast[8])} r="6" fill="#C4882E" stroke="var(--color-surface)" strokeWidth="3" />
          <text x={x(29) + 6} y={PAD + 10} fontSize="10" fill="var(--color-text-3)">forecast →</text>
        </svg>
      </div>
      <div className="fp-float fp-float-a">
        <div className="t"><TrendingUp size={14} color="var(--color-ok)" /> Quiz 1 → Quiz 2</div>
        <div style={{ color: 'var(--color-text-3)' }}>Quiz 1 · 55%</div>
        <div className="fp-mini-bar"><span style={{ width: '55%', background: 'var(--color-warn)' }} /></div>
        <div style={{ color: 'var(--color-text-3)', marginTop: 6 }}>Quiz 2 · 85%</div>
        <div className="fp-mini-bar"><span style={{ width: '85%', background: 'var(--color-ok)', animationDelay: '.4s' }} /></div>
      </div>
      <div className="fp-float fp-float-b">
        <div className="t"><BookOpen size={14} color="var(--color-accent)" /> Reflection scored</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem' }}>82<span style={{ fontSize: '.8rem', color: 'var(--color-text-3)' }}>/100 · Good</span></div>
      </div>
      <div className="fp-float fp-float-c">
        <div className="t"><Coffee size={14} color="var(--color-warn)" /> Fatigue check</div>
        <div style={{ color: 'var(--color-text-3)' }}>Low · continue practice</div>
      </div>
    </div>
  );
}

const LOOP = [
  { icon: Target, title: 'Choose a topic', text: 'Subject → module → sub topic from the SB6202 syllabus.' },
  { icon: Brain, title: 'Quiz 1', text: '20 questions, difficulty matched to your level.' },
  { icon: ListChecks, title: 'Practise gaps', text: 'The concepts you missed, with context and worked problems.' },
  { icon: RotateCcw, title: 'Quiz 2', text: '20 fresh questions to measure what changed.' },
  { icon: Coffee, title: 'Fatigue check', text: 'Below 80%? Break or keep practising — the AI decides with you.' },
  { icon: CheckCircle2, title: 'Topics to study', text: 'Quiz 1 vs Quiz 2 comparison and a clear next step.' },
];

const FEATURES = [
  { tone: 'student', icon: LayoutDashboard, title: 'Dashboard', text: 'Mastery by module, strong and weak topics, all from your own work.' },
  { tone: 'planner', icon: Sparkles, title: 'AI Study Planner', text: 'The adaptive Quiz 1 → practice → Quiz 2 loop with locked tabs during quizzes.' },
  { tone: 'gain', icon: TrendingUp, title: 'Learning Gain', text: 'Day-wise comparison of quiz scores with automatic insights.' },
  { tone: 'fatigue', icon: Activity, title: 'Learning Fatigue', text: 'Session time, score trend and how you feel, turned into a fatigue score.' },
  { tone: 'reflections', icon: BookOpen, title: 'Reflections', text: 'Daily 500-character recall, compared with three reference answers.' },
  { tone: 'caselets', icon: Briefcase, title: 'Caselets', text: 'Business cases you solve with real models and a scored recommendation.' },
  { tone: 'skills', icon: Layers, title: 'Skill Studio', text: 'Pick a job role and practise exactly the skills it needs in the lab.' },
  { tone: 'teach', icon: GraduationCap, title: 'Teach the AI', text: 'Explain a topic you completed; get scored on the CIE rubric.' },
];

const PORTALS = [
  { tone: 'student', icon: GraduationCap, title: 'Student', items: ['Adaptive study planner', 'Learning gain & fatigue', 'Reflections and Teach the AI', 'Caselets and Skill Studio'] },
  { tone: 'faculty', icon: Users, title: 'Faculty', items: ['Class performance overview', 'Student insights (day-wise gain)', 'Topic-wise misconceptions', 'Every student reflection, scored'] },
  { tone: 'dean', icon: Building2, title: 'Dean', items: ['Department performance', 'Subject-wise performance', 'Faculty insights'] },
];

const MODULES = [
  { n: 1, title: 'Introduction to Forecasting', hours: 6 },
  { n: 2, title: 'Forecasting Techniques', hours: 10 },
  { n: 3, title: 'Univariate Time Series Models', hours: 12 },
  { n: 4, title: 'Multivariate Time Series Models', hours: 8 },
  { n: 5, title: 'Supervised & Advanced ML Models', hours: 4 },
];

function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ref.current?.style.setProperty('transform', `scaleX(${max > 0 ? window.scrollY / max : 0})`);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div ref={ref} className="fp-progress" aria-hidden="true" />;
}

const TOPICS = [
  'Nature of Forecasting', 'Types of Forecasts', 'Forecasting Process', 'Planning & Control', 'MAE · MSE · RMSE · MAPE',
  'Trend & Seasonality', 'Moving Average', 'Exponential Smoothing', "Holt's Linear Trend", 'Holt-Winters', 'Seasonal Variation',
  'ACF & PACF', 'MA(q)', 'AR(p)', 'ADF Unit Root Test', 'Differencing & Lags', 'ARMA', 'ARIMA', 'SARIMA',
  'VAR', 'VARIMAX', 'SARIMAX', 'Linear Regression', 'Decision Tree', 'KNN', 'Random Forest', 'XGBoost',
];

function TopicMarquee() {
  const rows = [TOPICS.slice(0, 14), TOPICS.slice(13)];
  return (
    <div className="fp-marquee" aria-label="Syllabus topics covered">
      {rows.map((row, r) => (
        <div key={r} className={`fp-marquee-row ${r ? 'rev' : ''}`}>
          {[...row, ...row].map((t, i) => <span key={i} className="fp-chip" aria-hidden={i >= row.length}>{t}</span>)}
        </div>
      ))}
    </div>
  );
}

const SHOWCASE = [
  { id: 'quiz', icon: Brain, title: 'Adaptive quizzes', text: 'Twenty questions matched to your level, one at a time, with keyboard shortcuts and a live navigator.' },
  { id: 'gain', icon: TrendingUp, title: 'Day-wise learning gain', text: 'Quiz 1 against Quiz 2, every day you study, with insights written for you.' },
  { id: 'recall', icon: BookOpen, title: 'Scored reflections', text: 'Write what you remember; see which key concepts you covered and which you missed.' },
];

function ShowPane({ id }) {
  if (id === 'quiz') {
    return (
      <div className="fp-pane">
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          {Array.from({ length: 12 }, (_, i) => <span key={i} className={`fp-q ${i < 4 ? 'done' : i === 4 ? 'cur' : ''}`}>{i + 1}</span>)}
        </div>
        <div className="fp-pane-label">QUESTION 5 OF 20 · <span style={{ color: 'var(--color-warn)' }}>medium</span></div>
        <p style={{ fontWeight: 700, margin: '6px 0 12px', lineHeight: 1.45 }}>An ADF test on monthly sales gives p = 0.41. What should the analyst conclude?</p>
        {['The series is stationary — fit ARMA directly', 'Cannot reject a unit root — difference the series first', 'The series has no trend at all', 'MAPE will be below 5%'].map((o, i) => (
          <div key={o} className={`fp-opt ${i === 1 ? 'sel' : ''}`} style={{ animationDelay: `${i * 90}ms` }}><b>{String.fromCharCode(65 + i)}</b>{o}</div>
        ))}
      </div>
    );
  }
  if (id === 'gain') {
    const days = [[40, 62], [55, 70], [48, 81], [66, 85], [72, 90]];
    return (
      <div className="fp-pane">
        <div className="fp-pane-label">QUIZ 1 VS QUIZ 2 · LAST 5 STUDY DAYS</div>
        <div className="fp-bars">
          {days.map(([a, b], i) => (
            <div key={i} className="fp-bar-group">
              <span style={{ height: `${a}%`, background: 'var(--color-warn)', animationDelay: `${i * 80}ms` }} />
              <span style={{ height: `${b}%`, background: 'var(--color-ok)', animationDelay: `${i * 80 + 40}ms` }} />
              <em>Day {i + 1}</em>
            </div>
          ))}
        </div>
        <div className="fp-insight"><TrendingUp size={15} /> Scores are trending up — average gain +21 points.</div>
      </div>
    );
  }
  return (
    <div className="fp-pane">
      <div className="fp-pane-label">TODAY'S RECALL · STATIONARITY & ADF TEST</div>
      <div className="fp-recall">"A series is stationary when its mean and variance don't change over time. The ADF test's null hypothesis is a unit root, so a high p-value means we difference…"</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <div className="fp-ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" /><circle cx="32" cy="32" r="26" className="v" /></svg><b>82</b></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {['unit root', 'p-value', 'differencing', 'constant mean'].map(c => <span key={c} className="fp-tag ok">{c}</span>)}
          {['critical value'].map(c => <span key={c} className="fp-tag miss">{c}</span>)}
        </div>
      </div>
    </div>
  );
}

function Showcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(() => setActive(a => (a + 1) % SHOWCASE.length), 5000);
    return () => clearTimeout(t);
  }, [active, paused]);
  return (
    <section id="showcase" className="fp-section">
      <InView className="fp-wrap fp-reveal">
        <div className="fp-kicker">Inside the app</div>
        <h2 className="fp-h2">Designed for focus, <em>built on real work.</em></h2>
        <div className="fp-show" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="fp-show-list">
            {SHOWCASE.map(({ id, icon: Icon, title, text }, i) => (
              <button key={id} className={`fp-show-item ${i === active ? 'on' : ''}`} onClick={() => setActive(i)}>
                <span className="fp-show-icon"><Icon size={18} /></span>
                <span><b>{title}</b><span>{text}</span></span>
                {i === active && <i className="fp-show-timer" key={`${active}-${paused}`} style={{ animationPlayState: paused ? 'paused' : 'running' }} />}
              </button>
            ))}
          </div>
          <div className="fp-browser">
            <div className="fp-browser-bar"><i /><i /><i /><span>AI Learning Partner 360 · Student portal</span></div>
            <div className="fp-browser-tabs">
              {SHOWCASE.map((s, i) => <span key={s.id} className={i === active ? 'on' : ''}>{s.title}</span>)}
            </div>
            <div className="fp-browser-body"><ShowPane id={SHOWCASE[active].id} key={active} /></div>
          </div>
        </div>
      </InView>
    </section>
  );
}

function FacultySection() {
  const bars = [['ADF Unit Root Test', 14], ['SARIMA', 11], ['ACF & PACF', 9], ['Holt-Winters', 6], ['MAPE', 4]];
  return (
    <section id="faculty" className="fp-dark">
      <InView className="fp-wrap fp-reveal fp-dark-grid">
        <div>
          <div className="fp-kicker" style={{ color: '#F2C6A0' }}>For faculty</div>
          <h2 className="fp-h2" style={{ color: '#FFF8F0' }}>See where the class is stuck — <em style={{ color: '#F2C6A0' }}>before the exam does.</em></h2>
          <p className="fp-sub" style={{ color: 'rgba(255,248,240,.75)' }}>
            Every quiz under 80% is a suggestion to relearn. Faculty see which topics collect the most, each student's day-wise learning gain,
            and every reflection with its score.
          </p>
          <div style={{ display: 'flex', gap: 22, marginTop: 26, flexWrap: 'wrap' }}>
            {[['Class overview', Users], ['Student insights', TrendingUp], ['Misconceptions', Lightbulb]].map(([t, Icon]) => (
              <span key={t} style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 700, fontSize: '.88rem' }}><Icon size={16} color="#F2C6A0" />{t}</span>
            ))}
          </div>
        </div>
        <div className="fp-dark-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <b>Most suggested for relearning</b><span className="fp-tag" style={{ background: 'rgba(255,255,255,.1)', color: '#FFF8F0' }}>example view</span>
          </div>
          {bars.map(([t, n], i) => (
            <div key={t} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.84rem', marginBottom: 5, opacity: .9 }}><span>{t}</span><b>{n}×</b></div>
              <div className="fp-dark-track"><span style={{ width: `${(n / 14) * 100}%`, transitionDelay: `${300 + i * 120}ms` }} /></div>
            </div>
          ))}
        </div>
      </InView>
    </section>
  );
}

const FAQS = [
  ['Who can sign in?', 'Students enrolled in SB6202 and the course faculty, using the RV University email and password issued for the course.'],
  ['How are quizzes made adaptive?', 'Each quiz has 20 questions drawn from 30 per topic (10 easy, 10 medium, 10 hard). The mix shifts towards easier or harder questions based on your recent scores, and Quiz 2 avoids repeating Quiz 1 where it can.'],
  ['What happens if I score below 80%?', 'After Quiz 1 you get the exact concepts you missed with explanations and a practice problem. After Quiz 2, a short fatigue check decides whether you take a break or continue practising.'],
  ['How are reflections and Teach the AI scored?', 'Your answer is compared with three reference answers written for each topic and checked for the key concepts a strong answer should mention, then mapped to the CIE rubric bands.'],
  ['Can my faculty see my work?', 'Yes. Faculty see learning gain, relearn counts by topic and scored reflections, so they can step in where the class needs it.'],
];

function Faq() {
  return (
    <section id="faq" className="fp-section">
      <InView className="fp-wrap fp-reveal" style={{ maxWidth: 860 }}>
        <div className="fp-kicker">FAQ</div>
        <h2 className="fp-h2">Questions, <em>answered.</em></h2>
        <div style={{ marginTop: 28 }}>
          {FAQS.map(([q, a]) => (
            <details key={q} className="fp-faq">
              <summary>{q}<span aria-hidden="true">+</span></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </InView>
    </section>
  );
}

export default function LandingView({ onSignIn }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    apiFetch('/api/public/stats').then(r => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, []);
  const statItems = [
    ['questions', 'quiz questions'], ['topics', 'syllabus topics'], ['job_roles', 'job roles'], ['caselets', 'caselets'],
  ];

  return (
    <div className="fp">
      <ScrollProgress />
      <nav className="fp-nav">
        <div className="fp-wrap fp-nav-inner">
          <div className="fp-brand"><BrandMark /> <span>AI Learning <em style={{ fontFamily: 'var(--font-editorial)', fontWeight: 500, color: 'var(--color-accent)' }}>Partner</em> 360</span></div>
          <div className="fp-links">
            <a href="#how">How it works</a><a href="#showcase">Inside the app</a><a href="#features">Features</a><a href="#faculty">Faculty</a><a href="#syllabus">Syllabus</a><a href="#faq">FAQ</a>
          </div>
          <button className="fp-btn fp-btn-primary" style={{ padding: '9px 18px' }} onClick={onSignIn}><LogIn size={16} /> Sign in</button>
        </div>
      </nav>

      <header className="fp-hero">
        <span className="fp-blob fp-blob-a" /><span className="fp-blob fp-blob-b" />
        <div className="fp-wrap fp-hero-grid">
          <div>
            <div className="reveal"><span className="fp-pill"><span className="pulse-dot" style={{ color: 'var(--color-accent)' }} /> RV University · School of Business · SB6202</span></div>
            <h1 className="fp-h1 reveal" style={{ '--delay': '80ms' }}>From AI that gives answers to AI that builds <em>forecasters.</em></h1>
            <p className="fp-lede reveal" style={{ '--delay': '160ms' }}>
              An adaptive learning partner for MBA Business Forecasting. It tests what you know, makes you practise what you don't,
              notices when you're tired, and shows faculty exactly where the class needs help.
            </p>
            <div className="fp-ctas reveal" style={{ '--delay': '240ms' }}>
              <button className="fp-btn fp-btn-primary" onClick={onSignIn}>Sign in to your portal <ArrowRight size={17} /></button>
              <a className="fp-btn fp-btn-ghost" href="#how">See how it works</a>
            </div>
            <div className="fp-stats reveal" style={{ '--delay': '320ms' }}>
              {statItems.map(([k, label]) => (
                <div key={k}>
                  <div className="fp-stat-v">{stats ? <AnimatedNumber value={stats[k]} duration={1400} /> : '·'}</div>
                  <div className="fp-stat-l">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal" style={{ '--delay': '200ms' }}><ForecastVisual /></div>
        </div>
      </header>

      <TopicMarquee />

      <section id="how" className="fp-section fp-section-alt">
        <InView className="fp-wrap fp-reveal">
          <div className="fp-kicker">The learning loop</div>
          <h2 className="fp-h2">Every topic follows the <em>same honest loop.</em></h2>
          <p className="fp-sub">No skipping ahead on a guess. You prove it at 80%, or the planner sends you back to exactly what you missed.</p>
          <div className="fp-loop">
            <div className="fp-loop-line"><span /></div>
            {LOOP.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="fp-step">
                <div className="fp-step-dot" style={{ '--d': `${300 + i * 300}ms` }}><Icon size={22} /></div>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <div className="fp-branches">
            <div className="fp-branch"><b>Quiz 1 ≥ 80%</b>You already know it — straight to the next learning path.</div>
            <div className="fp-branch"><b>Quiz 2 &lt; 80% and tired</b>Take a break with AI suggestions, then your topics to study.</div>
            <div className="fp-branch"><b>Quiz 2 &lt; 80% and fresh</b>Continue practice and retake Quiz 2 with new questions.</div>
          </div>
        </InView>
      </section>

      <Showcase />

      <section id="features" className="fp-section fp-section-alt">
        <InView className="fp-wrap fp-reveal">
          <div className="fp-kicker">Student portal</div>
          <h2 className="fp-h2">Eight tools, <em>one learning record.</em></h2>
          <p className="fp-sub">Everything a student does feeds the same profile, so the dashboard, insights and faculty views are always built from real work.</p>
          <div className="fp-grid fp-grid-4">
            {FEATURES.map(({ tone, icon: Icon, title, text }) => (
              <div key={title} className={`fp-card tone-${tone}`}>
                <div className="fp-card-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </InView>
      </section>

      <FacultySection />

      <section id="portals" className="fp-section">
        <InView className="fp-wrap fp-reveal">
          <div className="fp-kicker">Three portals</div>
          <h2 className="fp-h2">Built for students, <em>faculty and the dean.</em></h2>
          <div className="fp-grid fp-grid-3">
            {PORTALS.map(({ tone, icon: Icon, title, items }) => (
              <div key={title} className={`fp-card tone-${tone}`}>
                <div className="fp-card-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </InView>
      </section>

      <section id="syllabus" className="fp-section fp-section-alt">
        <InView className="fp-wrap fp-reveal">
          <div className="fp-kicker">Grounded in the syllabus</div>
          <h2 className="fp-h2">SB6202 Business Forecasting, <em>40 teaching hours.</em></h2>
          <p className="fp-sub">Every question, practice set and reference answer maps to a topic in Dr Veena A's course outline.</p>
          <div className="fp-modules">
            {MODULES.map(m => (
              <div key={m.n} className="fp-module hover-lift">
                <div className="n">0{m.n}</div>
                <h4>{m.title}</h4>
                <div className="h">{m.hours} hours</div>
                <div className="fp-hours"><span style={{ width: `${(m.hours / 12) * 100}%`, transitionDelay: `${m.n * 120}ms` }} /></div>
              </div>
            ))}
          </div>
        </InView>
      </section>

      <Faq />

      <section className="fp-section" style={{ paddingTop: 0 }}>
        <div className="fp-wrap">
          <div className="hero-band tone-student" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <span className="hero-grid" aria-hidden="true" />
            <Lightbulb size={30} />
            <h2 className="hero-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', marginTop: 10 }}>Ready to become a forecaster?</h2>
            <p className="hero-sub" style={{ margin: '8px auto 22px' }}>Sign in with your RV University email to pick up where you left off.</p>
            <button className="btn-hero" onClick={onSignIn} style={{ padding: '12px 24px', fontSize: '.95rem' }}>Sign in <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>

      <footer className="fp-footer">
        <div className="fp-wrap fp-foot-grid">
          <div>
            <div className="fp-brand"><BrandMark size={18} /> AI Learning Partner 360</div>
            <p style={{ margin: '12px 0 0', maxWidth: 320, lineHeight: 1.6 }}>An adaptive learning partner for SB6202 Business Forecasting at RV University School of Business.</p>
          </div>
          <div><b>Platform</b><a href="#how">Learning loop</a><a href="#showcase">Inside the app</a><a href="#features">Student tools</a><a href="#faculty">For faculty</a></div>
          <div><b>Course</b><a href="#syllabus">Syllabus</a><span>Dr Veena A</span><span>Semester III · 4 credits</span></div>
          <div><b>Access</b><button className="fp-linkbtn" onClick={onSignIn}>Sign in</button><a href="#faq">FAQ</a></div>
        </div>
        <div className="fp-wrap" style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span>© {new Date().getFullYear()} RV University School of Business</span>
          <span>Built for MBA Business Forecasting</span>
        </div>
      </footer>
    </div>
  );
}
