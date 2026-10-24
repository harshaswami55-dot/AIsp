import React, { useState } from 'react';
import { authFetch } from '../api';
import {
  Brain, Send, Sparkles, AlertTriangle, BookOpen,
  MessageSquare, Compass, CheckCircle2, RefreshCw
} from 'lucide-react';
import ARIAChatPanel from '../components/ARIAChatPanel';

export default function AITutorView() {
  const [activeTab, setActiveTab] = useState('tutor'); // tutor, socratic, coach

  // AI Tutor State
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorMessages, setTutorMessages] = useState([
    {
      role: 'assistant',
      content: (
        "Hello! I am your MBA Business Forecasting AI Tutor for course SB6202.\n\n"
        + "I am grounded in Dr. Veena A's official syllabus, lecture modules, and reference texts. "
        + "Ask me about stationarity, ADF testing, ARIMA/SARIMA parameter selection, VAR, or translating error metrics into inventory decisions."
      )
    }
  ]);
  const [loadingTutor, setLoadingTutor] = useState(false);

  // Socratic State
  const [socraticTopic, setSocraticTopic] = useState('ARIMA');
  const [socraticInput, setSocraticInput] = useState('');
  const [socraticTurn, setSocraticTurn] = useState(1);
  const [socraticMessages, setSocraticMessages] = useState([
    {
      role: 'ai',
      text: "Welcome to Socratic Learning Mode. I teach through inquiry to build your independent forecasting intuition.\n\nLet us begin: Before estimating an ARIMA(p,d,q) model, what fundamental statistical property must your time series satisfy?"
    }
  ]);
  const [loadingSocratic, setLoadingSocratic] = useState(false);

  // Coach State
  const [coachForm, setCoachForm] = useState({
    is_multivariate: false,
    has_trend: true,
    has_seasonality: true,
    is_stationary: false,
    has_external_drivers: false,
    sample_size: 48,
    need_high_interpretability: true
  });
  const [coachResult, setCoachResult] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

  // Handlers
  const handleSendTutor = async (e) => {
    e?.preventDefault();
    if (!tutorQuery.trim()) return;

    const userText = tutorQuery;
    setTutorMessages(prev => [...prev, { role: 'user', content: userText }]);
    setTutorQuery('');
    setLoadingTutor(true);

    try {
      const res = await authFetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText, mode: 'standard' })
      });
      const data = await res.json();
      setTutorMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error(err);
      setTutorMessages(prev => [...prev, { role: 'assistant', content: "Failed to connect to AI reasoning service." }]);
    } finally {
      setLoadingTutor(false);
    }
  };

  const handleSendSocratic = async (e) => {
    e?.preventDefault();
    if (!socraticInput.trim()) return;

    const userText = socraticInput;
    setSocraticMessages(prev => [...prev, { role: 'user', text: userText }]);
    setSocraticInput('');
    setLoadingSocratic(true);

    try {
      const res = await authFetch('/api/ai/socratic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: socraticTopic,
          query: userText,
          turn_count: socraticTurn + 1
        })
      });
      const data = await res.json();
      setSocraticTurn(prev => prev + 1);
      setSocraticMessages(prev => [...prev, { role: 'ai', text: data.socratic_response }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSocratic(false);
    }
  };

  const handleRunCoach = async () => {
    setLoadingCoach(true);
    try {
      const res = await authFetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coachForm)
      });
      const data = await res.json();
      setCoachResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCoach(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header & Tabs */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain size={24} color="#3b82f6" /> ARIA AI Agent &amp; Pedagogical Center
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
              Powered by Ollama (local LLM) · Grounded in SB6202 Syllabus · Tool-use · Multi-turn Memory · Socratic Mode
            </p>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              className={`btn ${activeTab === 'tutor' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('tutor')}
            >
              <BookOpen size={14} /> ARIA AI Agent
            </button>
            <button
              className={`btn ${activeTab === 'socratic' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('socratic')}
            >
              <MessageSquare size={14} /> Socratic Mode
            </button>
            <button
              className={`btn ${activeTab === 'coach' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('coach')}
            >
              <Compass size={14} /> Model Coach
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: ARIA AI AGENT */}
      {activeTab === 'tutor' && (
        <ARIAChatPanel pageContext="AI Tutor & Socratic" />
      )}

      {/* TAB 2: SOCRATIC MODE */}
      {activeTab === 'socratic' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-purple">Socratic Inquiry</span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Teaching through questions without revealing answers</span>
            </div>
            <select
              style={{ width: '180px', padding: '6px 10px', fontSize: '0.82rem' }}
              value={socraticTopic}
              onChange={(e) => {
                setSocraticTopic(e.target.value);
                setSocraticTurn(1);
                setSocraticMessages([{
                  role: 'ai',
                  text: `Starting Socratic Inquiry on ${e.target.value}. What is your initial hypothesis on how this technique functions?`
                }]);
              }}
            >
              <option value="ARIMA">Topic: ARIMA Models</option>
              <option value="Stationarity">Topic: Stationarity & ADF</option>
              <option value="SARIMA">Topic: Seasonal ARIMA</option>
              <option value="Accuracy">Topic: Accuracy Metrics</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '8px' }}>
            {socraticMessages.map((msg, idx) => {
              const isAi = msg.role === 'ai';
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    background: isAi ? 'rgba(88, 28, 135, 0.2)' : 'rgba(59, 130, 246, 0.25)',
                    border: isAi ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.4)',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    color: '#f8fafc',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {isAi && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', color: '#c4b5fd', fontWeight: 700 }}>
                      <Sparkles size={13} /> SOCRATIC GUIDANCE
                    </div>
                  )}
                  {msg.text}
                </div>
              );
            })}
            {loadingSocratic && (
              <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontSize: '0.85rem' }}>
                Analyzing reasoning...
              </div>
            )}
          </div>

          <form onSubmit={handleSendSocratic} style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Type your explanation or reasoned response..."
              value={socraticInput}
              onChange={(e) => setSocraticInput(e.target.value)}
            />
            <button type="submit" className="btn btn-purple" disabled={loadingSocratic}>
              Respond <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: MODEL SELECTION COACH */}
      {activeTab === 'coach' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Diagnostic Questionnaire */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Business Model Selection Diagnostic
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={coachForm.is_multivariate}
                  onChange={(e) => setCoachForm({ ...coachForm, is_multivariate: e.target.checked })}
                />
                Multiple interrelated time series (Multivariate target)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={coachForm.has_trend}
                  onChange={(e) => setCoachForm({ ...coachForm, has_trend: e.target.checked })}
                />
                Linear or polynomial upward/downward trend detected
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={coachForm.has_seasonality}
                  onChange={(e) => setCoachForm({ ...coachForm, has_seasonality: e.target.checked })}
                />
                Recurring seasonal cycles (e.g. quarterly peaks or 12-month waves)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={coachForm.is_stationary}
                  onChange={(e) => setCoachForm({ ...coachForm, is_stationary: e.target.checked })}
                />
                Series is strictly stationary (ADF test p &lt; 0.05)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={coachForm.has_external_drivers}
                  onChange={(e) => setCoachForm({ ...coachForm, has_external_drivers: e.target.checked })}
                />
                External explanatory drivers available (Pricing, Ad spend, Promotions)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={coachForm.need_high_interpretability}
                  onChange={(e) => setCoachForm({ ...coachForm, need_high_interpretability: e.target.checked })}
                />
                Boardroom interpretability & auditability required (High transparency)
              </label>

              <button className="btn btn-primary" onClick={handleRunCoach} disabled={loadingCoach} style={{ marginTop: '10px' }}>
                {loadingCoach ? 'Evaluating...' : 'Recommend Forecasting Model'}
              </button>
            </div>
          </div>

          {/* Recommendation Output */}
          <div className="glass-panel-glow" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Executive Model Selection Verdict
            </h3>

            {coachResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 700 }}>PRIMARY RECOMMENDED MODEL</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                    {coachResult.primary_recommendation}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>
                    Managerial Justification:
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                    {coachResult.managerial_justification}
                  </p>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px 14px', borderRadius: '10px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7' }}>BOARDROOM TAKEAWAY</div>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '4px' }}>
                    {coachResult.boardroom_takeaway}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
                Select your business dataset characteristics on the left and click "Recommend Forecasting Model".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
