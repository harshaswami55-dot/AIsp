import React, { useState, useEffect } from 'react';
import {
  GitCommit, CheckCircle2, Clock, Lock, ArrowRight,
  Sparkles, BookOpen, Brain, BarChart3
} from 'lucide-react';

export default function LearningPathView({ onNavigate }) {
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPath();
  }, []);

  const fetchPath = async () => {
    try {
      const res = await fetch('/api/student/learning-path');
      const data = await res.json();
      setPath(data.learning_path || []);
    } catch (e) {
      console.error("Failed to load learning path:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-emerald"><CheckCircle2 size={12} /> Mastered</span>;
      case 'in_progress':
        return <span className="badge badge-amber"><Clock size={12} /> Active Focus</span>;
      case 'recommended_next':
        return <span className="badge badge-blue"><Sparkles size={12} /> Recommended Next</span>;
      default:
        return <span className="badge badge-rose" style={{ opacity: 0.6 }}><Lock size={12} /> Prerequisite Locked</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
          Personalized Learning Path & Prerequisite Dependency Engine
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
          Generated from your Diagnostic Test results. Advanced topics (like SARIMA) unlock only after mastering prerequisite stationarity and differencing.
        </p>
      </div>

      {/* Prerequisite Pipeline Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {path.map((item, idx) => {
          const isNext = item.status === 'recommended_next' || item.status === 'in_progress';
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '20px 24px',
                borderLeft: isNext ? '4px solid #3b82f6' : (item.status === 'completed' ? '4px solid #10b981' : '4px solid rgba(255,255,255,0.1)'),
                background: isNext ? 'rgba(59, 130, 246, 0.08)' : 'rgba(17, 24, 43, 0.75)'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: item.status === 'completed' ? '#10b981' : (isNext ? '#3b82f6' : 'rgba(255,255,255,0.1)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: '#ffffff'
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-purple">{item.module}</span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                        {item.topic}
                      </h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                      {item.description}
                    </p>
                    {item.prerequisite && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                        Prerequisite: {item.prerequisite}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Mastery</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: item.mastery >= 70 ? '#10b981' : (item.mastery >= 50 ? '#f59e0b' : '#f43f5e') }}>
                      {item.mastery}%
                    </div>
                  </div>

                  {isNext && (
                    <button className="btn btn-primary" onClick={() => onNavigate('lab')}>
                      Practice in Lab <ArrowRight size={14} />
                    </button>
                  )}
                  {item.status === 'completed' && (
                    <button className="btn btn-secondary" onClick={() => onNavigate('tutor')}>
                      <Brain size={14} /> Review Concept
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
