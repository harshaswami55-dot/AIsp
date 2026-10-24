import React, { useState, useRef, useEffect } from 'react';
import { Brain, X, MessageSquare, Minimize2, ChevronDown } from 'lucide-react';
import ARIAChatPanel from './ARIAChatPanel';

export default function FloatingAssistant({ currentView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const prevView = useRef(currentView);

  // Flash badge when navigating to a new page
  useEffect(() => {
    if (prevView.current !== currentView && !isOpen) {
      setHasNew(true);
    }
    prevView.current = currentView;
  }, [currentView, isOpen]);

  const pageLabels = {
    dashboard: 'Student Dashboard',
    diagnostic: 'Diagnostic Assessment',
    path: 'Personalized Learning Path',
    tutor: 'AI Tutor & Socratic',
    lab: 'Forecasting Lab',
    comparison: 'Model Comparison',
    teach: 'Teach the AI',
    independence: 'AI Independence Mode',
    outcomes: 'Course Outcomes',
    faculty: 'Faculty Dashboard'
  };

  const pageContext = pageLabels[currentView] || currentView;

  const handleOpen = () => {
    setIsOpen(true);
    setHasNew(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          className="aria-float-button"
          onClick={handleOpen}
          title="Ask ARIA - AI Agent"
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-accent), #9B5C70)',
            border: '2px solid rgba(215,184,141,0.72)',
            boxShadow: '0 12px 28px rgba(110,32,57,0.35), 0 0 0 0 rgba(110,32,57,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 9999,
            animation: 'pulse-ring 2s infinite'
          }}
        >
          <Brain size={24} color="#fff" />
          {hasNew && (
            <div style={{
              position: 'absolute', top: '-2px', right: '-2px',
              width: '14px', height: '14px', borderRadius: '50%',
              background: '#ef4444', border: '2px solid #0f172a',
              animation: 'bounce 1s infinite'
            }} />
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="aria-chat-shell" style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '420px', maxWidth: 'calc(100vw - 48px)',
          height: isMinimized ? '56px' : '560px',
          borderRadius: '16px', zIndex: 9999,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
          overflow: 'hidden', transition: 'height 0.25s ease',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Minimized bar */}
          {isMinimized ? (
            <div
              onClick={() => setIsMinimized(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 16px', height: '56px',
                background: 'linear-gradient(135deg,var(--color-accent),#8E3E59)',
                cursor: 'pointer', backdropFilter: 'blur(12px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>
                <Brain size={18} /> ARIA AI Agent — {pageContext}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <ChevronDown size={16} color="rgba(255,255,255,0.6)" />
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
              {/* Minimize / Close buttons overlay */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px', zIndex: 2 }}>
                <button onClick={() => setIsMinimized(true)} title="Minimize" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                  <Minimize2 size={13} />
                </button>
                <button onClick={() => setIsOpen(false)} title="Close" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                  <X size={13} />
                </button>
              </div>
              <ARIAChatPanel pageContext={pageContext} compact={true} />
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 12px 28px rgba(110,32,57,.35), 0 0 0 0 rgba(110,32,57,.28); }
          70% { box-shadow: 0 12px 28px rgba(110,32,57,.35), 0 0 0 14px rgba(110,32,57,0); }
          100% { box-shadow: 0 12px 28px rgba(110,32,57,.35), 0 0 0 0 rgba(110,32,57,0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
