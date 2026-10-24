import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Send, Sparkles, AlertTriangle, BookOpen,
  MessageSquare, Compass, CheckCircle2, RefreshCw,
  Wrench, ChevronDown, Zap, WifiOff, Wifi
} from 'lucide-react';

const API_BASE = '';

function useAgentChat(pageContext) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const sessionId = useRef('aria-' + Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    fetch('/api/agent/status')
      .then(r => r.json())
      .then(d => setOllamaStatus(d))
      .catch(() => setOllamaStatus({ online: false, models: [] }));
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId.current,
          page_context: pageContext,
          model: 'llama3.2:3b'
        })
      });
      const data = await res.json();
      const assistantMsg = {
        role: 'assistant',
        content: data.reply,
        toolCalls: data.tool_calls || [],
        toolResults: data.tool_results || [],
        id: Date.now() + 1
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to reach ARIA. Please ensure Ollama is running.',
        id: Date.now() + 1
      }]);
    } finally {
      setLoading(false);
    }
  }, [pageContext]);

  const clearChat = useCallback(async () => {
    await fetch(`/api/agent/clear?session_id=${sessionId.current}`, { method: 'POST' });
    setMessages([]);
  }, []);

  return { messages, loading, ollamaStatus, sendMessage, clearChat };
}

function StatusBadge({ status }) {
  if (!status) return null;
  const borderColor = status.online ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
  const modelName = status.models && status.models[0] ? status.models[0] : 'llama3.2:3b';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '4px 10px', borderRadius: '20px',
      background: status.online ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      border: '1px solid ' + borderColor,
      fontSize: '0.72rem', fontWeight: 700,
      color: status.online ? '#10b981' : '#ef4444'
    }}>
      {status.online ? <Wifi size={12} /> : <WifiOff size={12} />}
      {status.online ? ('ARIA Online \u2022 ' + modelName) : 'ARIA Offline (Ollama not running)'}
    </div>
  );
}

function ToolCallBadge({ calls }) {
  if (!calls || calls.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
      {calls.map((call, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '2px 8px', borderRadius: '4px',
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
          fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa'
        }}>
          <Wrench size={10} /> {call.tool}
        </span>
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const lines = (msg.content || '').split('\n');

  const renderContent = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|[^]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('') && part.endsWith('')) {
        return <code key={i} style={{
          background: 'rgba(0,0,0,0.3)', padding: '1px 5px',
          borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.85em'
        }}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '16px', gap: '10px'
    }}>
      {!isUser && (
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(124,58,237,0.4)'
        }}>
          <Brain size={18} color="#fff" />
        </div>
      )}
      <div style={{ maxWidth: '78%' }}>
        {!isUser && <ToolCallBadge calls={msg.toolCalls} />}
        <div style={{
          padding: '12px 16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
            : 'rgba(255,255,255,0.06)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color: '#f1f5f9', fontSize: '0.88rem', lineHeight: 1.65
        }}>
          {lines.map((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
              return <div key={i} style={{ paddingLeft: '12px', marginBottom: '3px' }}>• {renderContent(trimmed.slice(2))}</div>;
            }
            if (/^\d+\./.test(trimmed)) {
              return <div key={i} style={{ marginBottom: '3px' }}>{renderContent(trimmed)}</div>;
            }
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
              return <div key={i} style={{ fontFamily: 'monospace', fontSize: '0.82em', color: '#94a3b8', marginBottom: '2px' }}>{trimmed}</div>;
            }
            return trimmed ? <div key={i} style={{ marginBottom: '4px' }}>{renderContent(trimmed)}</div> : <div key={i} style={{ height: '6px' }} />;
          })}
        </div>
        {!isUser && msg.toolResults?.length > 0 && (
          <details style={{ marginTop: '6px' }}>
            <summary style={{ fontSize: '0.7rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
              View tool output ({msg.toolResults.length} result{msg.toolResults.length > 1 ? 's' : ''})
            </summary>
            {msg.toolResults.map((r, i) => (
              <div key={i} style={{
                marginTop: '6px', padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                fontSize: '0.78rem', color: '#c4b5fd', fontFamily: 'monospace', whiteSpace: 'pre-wrap'
              }}>{r}</div>
            ))}
          </details>
        )}
      </div>
      {isUser && (
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#94a3b8', fontWeight: 800, fontSize: '0.8rem'
        }}>S</div>
      )}
    </div>
  );
}

function ARIAChatPanel({ pageContext, welcomeMessage, compact }) {
  const { messages, loading, ollamaStatus, sendMessage, clearChat } = useAgentChat(pageContext);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const welcome = welcomeMessage || (
    "Hello! I am **ARIA** — your Adaptive Reasoning & Intelligence Agent for SB6202 Business Forecasting.\n\n" +
    "I am grounded in Dr. Veena A's official syllabus and can run real statistical tools: ADF tests, accuracy metrics, dataset queries, and more.\n\n" +
    "Ask me anything about ARIMA, stationarity, SARIMA, XGBoost, or how to translate your forecast into a boardroom decision."
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Explain ADF test and stationarity",
    "When should I use SARIMA vs Holt-Winters?",
    "What is the difference between MAE and MAPE?",
    "Show me an accuracy metrics calculation",
    "Which dataset should I use for seasonal forecasting?"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: compact ? '100%' : '600px', background: 'rgba(15,23,42,0.8)', borderRadius: compact ? 0 : '16px', border: compact ? 'none' : '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: compact ? '12px 16px' : '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: compact ? '28px' : '34px', height: compact ? '28px' : '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(124,58,237,0.4)' }}>
            <Brain size={compact ? 15 : 18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: compact ? '0.82rem' : '0.95rem', color: '#fff' }}>ARIA <span style={{ color: '#7c3aed', fontWeight: 900 }}>AI Agent</span></div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>SB6202 Business Forecasting • Dr. Veena A</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={ollamaStatus} />
          <button onClick={clearChat} title="Clear chat" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
            <RefreshCw size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '12px' : '20px', display: 'flex', flexDirection: 'column' }}>
        {/* Welcome */}
        {messages.length === 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={18} color="#fff" />
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: '80%' }}>
                {welcome.split('\n').map((line, i) => {
                  if (!line.trim()) return <div key={i} style={{ height: '6px' }} />;
                  const parts = line.split(/(\*\*.*?\*\*)/g);
                  return <div key={i} style={{ marginBottom: '4px' }}>{parts.map((p, j) => p.startsWith('**') ? <strong key={j}>{p.slice(2,-2)}</strong> : p)}</div>;
                })}
              </div>
            </div>
            {!compact && (
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', paddingLeft: '44px' }}>QUICK START — Click to ask:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '44px' }}>
                  {quickPrompts.map((p, i) => (
                    <button key={i} onClick={() => sendMessage(p)} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.target.style.background='rgba(37,99,235,0.25)'}
                      onMouseLeave={e => e.target.style.background='rgba(37,99,235,0.1)'}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} color="#fff" />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '4px 16px 16px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', animation: 'bounce 1.2s infinite', animationDelay: (i * 0.2) + 's' }} />
                ))}
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>ARIA is thinking…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: compact ? '10px' : '16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)', flexShrink: 0 }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask ARIA about forecasting, stationarity, ARIMA, SARIMA..."
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#f1f5f9', fontSize: '0.88rem', resize: 'none',
              fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s'
            }}
            onFocus={e => e.target.style.borderColor='rgba(59,130,246,0.5)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'}
          />
          <button type="submit" disabled={loading || !input.trim()} style={{
            width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0, alignSelf: 'flex-end',
            background: loading || !input.trim() ? 'rgba(37,99,235,0.3)' : 'linear-gradient(135deg,#2563eb,#7c3aed)',
            border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', boxShadow: loading || !input.trim() ? 'none' : '0 4px 12px rgba(37,99,235,0.4)'
          }}>
            <Send size={17} color="#fff" />
          </button>
        </form>
        <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '6px', textAlign: 'center' }}>
          Enter to send • Shift+Enter for new line • Powered by Ollama (local, private)
        </div>
      </div>
    </div>
  );
}

export { ARIAChatPanel };
export default ARIAChatPanel;
