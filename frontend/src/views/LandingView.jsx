import React from 'react';
import { ArrowRight, Brain, ChartNoAxesCombined, GraduationCap, LibraryBig, Sparkles } from 'lucide-react';
import DepthScene from '../components/DepthScene';

const pillars = [
  { icon: LibraryBig, title: 'Learn in sequence', text: 'Move from course subjects and modules to focused topics and subtopics.' },
  { icon: Brain, title: 'Practice with purpose', text: 'Use diagnostic quizzes, targeted practice, and mastery checks to guide progress.' },
  { icon: ChartNoAxesCombined, title: 'Understand progress', text: 'Review learning evidence and course insights grounded in recorded activity.' },
];

export default function LandingView({ onContinue }) {
  return (
    <main className="landing-shell">
      <DepthScene variant="login" />
      <header className="landing-header">
        <div className="landing-brand"><span className="landing-mark"><Brain size={21} /></span><span>AI Learning Partner <b>360</b></span></div>
        <button className="btn btn-secondary" onClick={onContinue}>Sign in <ArrowRight size={16} /></button>
      </header>
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-eyebrow"><Sparkles size={14} /> RV University · School of Business</span>
          <h1>Build your forecasting <em>instinct.</em></h1>
          <p className="landing-lede">A guided learning partner for SB6202 Business Forecasting—connecting course concepts, hands-on practice, and evidence of learning.</p>
          <div className="landing-actions">
            <button className="btn btn-primary" onClick={onContinue}>Explore the learning portal <ArrowRight size={17} /></button>
            <span className="landing-course"><GraduationCap size={16} /> MBA Business Forecasting · SB6202</span>
          </div>
          <p className="landing-demo-note">Demo access is available for student, faculty, and dean views. Demo accounts are for evaluation, not production authentication.</p>
        </div>
        <aside className="landing-visual" aria-label="Learning journey preview">
          <div className="landing-orbit orbit-one" /><div className="landing-orbit orbit-two" />
          <div className="landing-glass-card">
            <div className="landing-card-top"><span className="landing-mini-icon"><Brain size={19} /></span><span>YOUR LEARNING JOURNEY</span><span className="landing-dot" /></div>
            <h2>From first question<br />to confident forecast.</h2>
            <div className="landing-steps">
              {['Choose a topic', 'Check your understanding', 'Practice what needs work', 'Measure your learning gain'].map((step, i) => <div className="landing-step" key={step}><span>{String(i + 1).padStart(2, '0')}</span><i />{step}</div>)}
            </div>
            <div className="landing-card-footer"><span>SB6202 · Course-aligned</span><span>80% mastery threshold</span></div>
          </div>
          <div className="landing-float landing-float-a">Subject → Topic → Practice</div>
          <div className="landing-float landing-float-b">Learn · Apply · Reflect</div>
        </aside>
      </section>
      <section className="landing-pillars" aria-label="Platform features">{pillars.map(({ icon: Icon, title, text }) => <article className="landing-pillar card" key={title}><span><Icon size={18} /></span><h3>{title}</h3><p>{text}</p></article>)}</section>
      <footer className="landing-footer"><span>AI Learning Partner 360</span><span>Designed for learning. Grounded in course outcomes.</span></footer>
    </main>
  );
}
