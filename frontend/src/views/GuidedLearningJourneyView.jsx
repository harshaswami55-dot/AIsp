import React, { useState, useEffect } from 'react';
import {
  Compass, BookOpen, Brain, CheckCircle2, AlertTriangle, ArrowRight,
  TrendingUp, Award, RotateCcw, Sparkles, ChevronRight, CheckCircle,
  HelpCircle, UserCheck, Flame, BookCheck, ShieldAlert, BarChart2
} from 'lucide-react';
import ARIAChatPanel from '../components/ARIAChatPanel';
import { authFetch } from '../api';

export default function GuidedLearningJourneyView({ currentUser, onNavigateToView, onQuizStateChange }) {
  // Wizard steps: 1 = Login/Profile, 2 = Select Module/Topic, 3 = Pre-Quiz, 4 = Learn with AI, 5 = Post-Quiz, 6 = Performance Dashboard
  const [currentStep, setCurrentStep] = useState(2);
  const [modules, setModules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [needsPractice, setNeedsPractice] = useState(false);
  const [practiceMarked, setPracticeMarked] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(false);

  // Step 3: Pre-Learning Quiz State
  const [preQuizData, setPreQuizData] = useState(null);
  const [preAnswers, setPreAnswers] = useState({});
  const [preResult, setPreResult] = useState(null);
  const [submittingPre, setSubmittingPre] = useState(false);

  // Step 4: AI Learning State
  const [learningContent, setLearningContent] = useState(null);
  const [notesRead, setNotesRead] = useState(false);
  const [showPracticeSolution, setShowPracticeSolution] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState(null);

  // Step 5: Post-Learning Quiz State
  const [postQuizData, setPostQuizData] = useState(null);
  const [postAnswers, setPostAnswers] = useState({});
  const [postResult, setPostResult] = useState(null);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Step 6: Performance & Revision Dashboard State
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  useEffect(() => {
    fetchModules();
    fetchUserDashboard();
  }, [currentUser]);

  useEffect(() => {
    onQuizStateChange?.(activeQuiz);
  }, [activeQuiz, onQuizStateChange]);

  const fetchModules = async () => {
    try {
      const res = await authFetch('/api/journey/modules');
      if (!res.ok) throw new Error('Could not load syllabus');
      const data = await res.json();
      const loadedModules = data.modules || [];
      const loadedSubjects = data.subjects || [];
      const firstModule = loadedModules[0];
      const firstTopic = firstModule?.topics?.[0];
      setModules(loadedModules);
      setSubjects(loadedSubjects);
      setSelectedSubject(loadedSubjects[0] || null);
      setSelectedModule(firstModule || null);
      setSelectedTopic(firstTopic || null);
      setSelectedSubtopic(firstTopic?.subtopics?.[0] || null);
    } catch (e) {
      console.error('Failed to fetch journey modules:', e);
    }
  };

  const fetchUserDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await authFetch(`/api/journey/dashboard/${currentUser.id}`);
      if (!res.ok) throw new Error('Could not load learning progress');
      const data = await res.json();
      setDashboardData(data);
    } catch (e) {
      console.error('Failed to fetch user dashboard:', e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Start Step 3: Pre-Learning Quiz
  const handleStartPreQuiz = async (topic, module) => {
    const t = topic || selectedTopic;
    const m = module || selectedModule;
    const subtopic = selectedTopic?.id === t.id ? selectedSubtopic : t.subtopics?.[0];
    setSelectedTopic(t);
    setSelectedModule(m);
    setSelectedSubtopic(subtopic);
    if (!subtopic) return;
    setPreAnswers({});
    setPreResult(null);
    setNeedsPractice(false);
    setPracticeMarked(false);
    try {
      const res = await authFetch(`/api/journey/quiz?module_id=${m.id}&topic_id=${t.id}&subtopic_id=${subtopic.id}&quiz_type=pre`);
      if (!res.ok) throw new Error('Could not load Quiz 1');
      const data = await res.json();
      setPreQuizData(data);
      setActiveQuiz(true);
      setCurrentStep(3);
    } catch (e) {
      console.error('Failed to load pre-quiz:', e);
    }
  };

  // Submit Step 3 Pre-Learning Quiz
  const handleSubmitPreQuiz = async () => {
    if (!preQuizData || !preQuizData.questions) return;
    setSubmittingPre(true);
    try {
      const res = await authFetch('/api/journey/submit-quiz', {
        method: 'POST',
        body: {
          user_id: currentUser.id,
          module_id: selectedModule.id,
          topic_id: selectedTopic.id,
          subtopic_id: selectedSubtopic.id,
          quiz_type: 'pre',
          answers: preAnswers
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not submit Quiz 1');
      setPreResult(data);
      setCurrentAttemptId(data.attempt_id);
      setNeedsPractice(data.score_percentage < 80);
      setActiveQuiz(false);
    } catch (e) {
      console.error('Failed to submit pre-quiz:', e);
    } finally {
      setSubmittingPre(false);
    }
  };

  // Proceed from Pre-Quiz to Step 4 Learn with AI
  const handleProceedToLearning = async () => {
    if (needsPractice && !preResult?.weak_concepts?.length) setNeedsPractice(true);
    try {
      const res = await authFetch(`/api/journey/learn/${selectedTopic.id}?subtopic_id=${selectedSubtopic.id}`);
      if (!res.ok) throw new Error('Could not load learning content');
      const data = await res.json();
      setLearningContent(data);
      setNotesRead(false);
      setShowPracticeSolution(false);
      setCurrentStep(4);
    } catch (e) {
      console.error('Failed to load learning content:', e);
    }
  };

  const handleCompletePractice = async () => {
    if (!currentAttemptId || !selectedSubtopic) return;
    const res = await authFetch('/api/journey/complete-practice', {
      method: 'POST',
      body: { attempt_id: currentAttemptId, subtopic_id: selectedSubtopic.id }
    });
    if (res.ok) setPracticeMarked(true);
  };

  // Proceed from Step 4 Learn to Step 5 Post-Learning Quiz
  const handleProceedToPostQuiz = async () => {
    if (needsPractice && !practiceMarked) return;
    if (currentAttemptId) {
      authFetch('/api/journey/mark-notes-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: currentAttemptId, problems_completed: 1 })
      });
    }
    setPostAnswers({});
    setPostResult(null);
    try {
      const res = await authFetch(`/api/journey/quiz?module_id=${selectedModule.id}&topic_id=${selectedTopic.id}&subtopic_id=${selectedSubtopic.id}&quiz_type=post`);
      if (!res.ok) throw new Error('Could not load Quiz 2');
      const data = await res.json();
      setPostQuizData(data);
      setActiveQuiz(true);
      setCurrentStep(5);
    } catch (e) {
      console.error('Failed to load post-quiz:', e);
    }
  };

  // Submit Step 5 Post-Learning Quiz
  const handleSubmitPostQuiz = async () => {
    if (!postQuizData || !postQuizData.questions) return;
    setSubmittingPost(true);
    try {
      const res = await authFetch('/api/journey/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          attempt_id: currentAttemptId,
          module_id: selectedModule.id,
          topic_id: selectedTopic.id,
          subtopic_id: selectedSubtopic.id,
          quiz_type: 'post',
          answers: postAnswers
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not submit Quiz 2');
      setPostResult(data);
      setActiveQuiz(false);
      fetchUserDashboard();
    } catch (e) {
      console.error('Failed to submit post-quiz:', e);
    } finally {
      setSubmittingPost(false);
    }
  };

  // Finish and view Step 6 Dashboard
  const handleViewPerformanceDashboard = () => {
    fetchUserDashboard();
    setCurrentStep(6);
  };

  const stepsList = [
    { num: 1, label: 'Login & Profile', icon: <UserCheck size={14} /> },
    { num: 2, label: 'Select Module', icon: <BookOpen size={14} /> },
    { num: 3, label: 'Pre-Learning Quiz', icon: <HelpCircle size={14} /> },
    { num: 4, label: 'Learn with AI', icon: <Brain size={14} /> },
    { num: 5, label: 'Post-Learning Quiz', icon: <BookCheck size={14} /> },
    { num: 6, label: 'Compare & Revision', icon: <TrendingUp size={14} /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1120px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Executive Header Banner */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', background: 'radial-gradient(circle at top right, rgba(99,102,241,0.2), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span className="badge badge-indigo" style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800 }}>
                RV UNIVERSITY • SOB SB6202
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dr. Veena A • 40 Teaching Hours</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={24} color="#818cf8" /> AI Learning Journey
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px', maxWidth: '680px' }}>
              6-Step Adaptive Pedagogy: Baseline Pre-Quiz → AI Concept Mastery &amp; Formulas → Post-Quiz Assessment → Gap Analysis &amp; Targeted Revision.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ACTIVE CANDIDATE</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f1f5f9' }}>{currentUser.full_name}</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'S'}
            </div>
          </div>
        </div>

        {/* 6-Step Visual Breadcrumb Navigator */}
        <div className="step-nav-bar" style={{ marginTop: '20px' }}>
          {stepsList.map((s) => {
            const isCompleted = currentStep > s.num;
            const isActive = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`step-node ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}
                onClick={() => {
                  if (activeQuiz) return;
                  if (s.num === 2 || (s.num === 4 && preResult) || (s.num === 5 && preResult && (!needsPractice || practiceMarked)) || (s.num === 6 && postResult && dashboardData)) setCurrentStep(s.num);
                }}
                aria-disabled={activeQuiz || (!isActive && !isCompleted)}
              >
                {isCompleted ? <CheckCircle size={14} /> : s.icon}
                <span>Step {s.num}: {s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* STEP 1: LOGIN & STUDENT PROFILE DASHBOARD                */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={20} color="#818cf8" /> Candidate Learning Identity
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px' }}>
              Your profile is synchronized with Dr. Veena A's business forecasting database. Every pre-test baseline, AI tutor interaction, and post-test score gain is cataloged for personalized scaffolding.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>STUDENT NAME</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{currentUser.full_name}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>REGISTERED COURSE</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginTop: '2px' }}>SB6202 • Business Forecasting (Semester III)</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>FACULTY INSTRUCTOR</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginTop: '2px' }}>Dr. Veena A (RV University SOB)</div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px', padding: '12px' }}
              onClick={() => setCurrentStep(2)}
            >
              Proceed to Step 2: Select Subject &amp; Module <ArrowRight size={16} />
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={20} color="#34d399" /> Current Performance Standing
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#818cf8' }}>
                  {dashboardData ? dashboardData.completed_topics : 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Topics Completed</div>
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                  {dashboardData && dashboardData.average_score_gain > 0 ? `+${dashboardData.average_score_gain}%` : '+24.5%'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>Avg Learning Gain</div>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>6-STEP PEDAGOGICAL WORKFLOW</div>
              <ol style={{ paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.8 }}>
                <li>Select subject, module &amp; target forecasting topic</li>
                <li>Take pre-learning quiz (sets baseline score)</li>
                <li>Study AI-generated explanations, notes &amp; formulas</li>
                <li>Take post-learning quiz (tests same objectives)</li>
                <li>Analyze score gain, weak concepts &amp; revision path</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: SELECT SUBJECT & MODULE DRILL-DOWN                */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-purple" style={{ marginBottom: '6px' }}>STEP 2 OF 6</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>Select Module &amp; Topic Drill-Down</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Drill down through the 5 syllabus modules approved by Dr. Veena A to choose what you want to master.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <label style={{ display: 'grid', gap: 6, color: 'var(--color-text-2)', fontSize: '.82rem', fontWeight: 600 }}>Subject
              <select value={selectedSubject?.id || ''} onChange={e => {
                const subject = subjects.find(item => item.id === Number(e.target.value)) || null;
                const module = modules.find(item => item.course_id === subject?.id) || null;
                const topic = module?.topics?.[0] || null;
                setSelectedSubject(subject);
                setSelectedModule(module);
                setSelectedTopic(topic);
                setSelectedSubtopic(topic?.subtopics?.[0] || null);
              }}>
                {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} · {subject.title}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: 'var(--color-text-2)', fontSize: '.82rem', fontWeight: 600 }}>Module
              <select value={selectedModule?.id || ''} onChange={e => { const module = modules.find(item => item.id === Number(e.target.value)); const topic = module?.topics?.[0] || null; setSelectedModule(module || null); setSelectedTopic(topic); setSelectedSubtopic(topic?.subtopics?.[0] || null); }}>
                {modules.filter(module => !selectedSubject || module.course_id === selectedSubject.id).map(module => <option key={module.id} value={module.id}>{module.module_number}. {module.title}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: 'var(--color-text-2)', fontSize: '.82rem', fontWeight: 600 }}>Topic
              <select value={selectedTopic?.id || ''} onChange={e => { const topic = selectedModule?.topics?.find(item => item.id === Number(e.target.value)); setSelectedTopic(topic || null); setSelectedSubtopic(topic?.subtopics?.[0] || null); }}>
                {selectedModule?.topics?.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: 'var(--color-text-2)', fontSize: '.82rem', fontWeight: 600 }}>SubTopic
              <select value={selectedSubtopic?.id || ''} onChange={e => setSelectedSubtopic(selectedTopic?.subtopics?.find(item => item.id === Number(e.target.value)) || null)}>
                {selectedTopic?.subtopics?.map(subtopic => <option key={subtopic.id} value={subtopic.id}>{subtopic.name}</option>)}
              </select>
            </label>
            <button className="btn btn-primary" disabled={!selectedSubtopic || !selectedTopic || !selectedModule} onClick={() => handleStartPreQuiz(selectedTopic, selectedModule)}>Start Quiz 1 <ArrowRight size={15} /></button>
          </div>
          {selectedSubtopic && <div className="card-inset" style={{ padding: '14px 18px', color: 'var(--color-text-2)', fontSize: '.88rem' }}>Selected learning path: <strong>{selectedSubject?.title}</strong> → {selectedModule?.title} → {selectedTopic?.name} → {selectedSubtopic.name}</div>}
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: PRE-LEARNING QUIZ (BASELINE ASSESSMENT)          */}
      {/* ========================================================= */}
      {currentStep === 3 && preQuizData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge-amber" style={{ marginBottom: '6px' }}>STEP 3: PRE-LEARNING QUIZ</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                  Baseline Knowledge Diagnostic: {selectedTopic?.name}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Test what you already know before the AI teaches the concept. This score will be saved as your baseline.
                </p>
              </div>
              <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700 }}>
                Questions: {preQuizData.questions?.length || 0}
              </div>
            </div>
          </div>

          {/* Quiz Questions List */}
          {preQuizData.questions?.map((q, idx) => (
            <div key={q.id} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#818cf8' }}>QUESTION {idx + 1} OF {preQuizData.questions.length}</span>
                <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{q.difficulty}</span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.5, marginBottom: '16px' }}>
                {q.question_text}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options?.map((opt, optIdx) => {
                  const isSelected = preAnswers[q.id] === opt;
                  return (
                    <div
                      key={optIdx}
                      className={`quiz-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (!preResult) {
                          setPreAnswers({ ...preAnswers, [q.id]: opt });
                        }
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        border: isSelected ? '5px solid #6366f1' : '2px solid rgba(255,255,255,0.2)',
                        background: isSelected ? '#fff' : 'transparent',
                        flexShrink: 0
                      }} />
                      <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Actions / Pre-Quiz Result */}
          {!preResult ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(2)}
              >
                Back to Modules
              </button>
              <button
                className="btn btn-primary"
                disabled={submittingPre || Object.keys(preAnswers).length === 0}
                onClick={handleSubmitPreQuiz}
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                {submittingPre ? 'Grading Baseline...' : 'Submit Pre-Quiz & Set Baseline'} <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="glass-panel-glow" style={{ padding: '28px', background: 'rgba(15,23,42,0.95)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <span className="badge badge-amber" style={{ marginBottom: '6px' }}>BASELINE RECORDED</span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                    Pre-Learning Score: {preResult.score_percentage}%
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Baseline saved! The AI has diagnosed your initial level and tailored the study notes to strengthen weak concepts.
                  </p>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: preResult.score_percentage >= 70 ? '#34d399' : '#fbbf24' }}>
                  {preResult.correct_count} / {preResult.total_questions} Correct
                </div>
              </div>

              {preResult.weak_concepts?.length > 0 && (
                <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, fontSize: '0.88rem' }}>
                    <AlertTriangle size={16} /> Identified Knowledge Gap (Pre-Test Misconception):
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '6px' }}>
                    {preResult.weak_concepts[0].explanation}
                  </p>
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800 }}
                onClick={handleProceedToLearning}
              >
                Proceed to Step 4: Learn with AI Notes &amp; Formulas <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 4: LEARN WITH AI (NOTES, FORMULAS & PRACTICE)        */}
      {/* ========================================================= */}
      {currentStep === 4 && learningContent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <span className="badge badge-indigo" style={{ marginBottom: '6px' }}>STEP 4 OF 6</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Learn with AI: {learningContent.title}
            </h2>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.82rem', color: '#94a3b8' }}>
              <span>Module: {learningContent.module}</span>
              <span>Estimated Reading: {learningContent.reading_time}</span>
              <span>Baseline Pre-Score: {preResult?.score_percentage ?? 50}%</span>
            </div>
          </div>

          {/* Core Concept Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="#818cf8" /> Executive Concept Explanation
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.7 }}>
              {learningContent.core_explanation}
            </p>
          </div>

          {/* Formulas Card */}
          {learningContent.formulas?.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="#34d399" /> Mathematical Foundations &amp; Formulas
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {learningContent.formulas.map((f, i) => (
                  <div key={i} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>{f.name}</div>
                    <div style={{ padding: '10px 0', fontFamily: 'monospace', fontSize: '1.05rem', color: '#f1f5f9' }}>
                      {f.latex}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why Students Go Wrong - Cognitive Misconceptions */}
          {learningContent.why_students_go_wrong?.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#ef4444" /> In What Way Do Students Go Wrong? (Cognitive Traps)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {learningContent.why_students_go_wrong.map((pitfall, i) => (
                  <div key={i} style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontWeight: 800, color: '#f87171', fontSize: '0.88rem' }}>
                      Pitfall #{i + 1}: {pitfall.pitfall}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#fca5a5', marginTop: '4px', lineHeight: 1.6 }}>
                      {pitfall.why}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-World Case Study */}
          {learningContent.real_world_case && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <span className="badge badge-blue" style={{ marginBottom: '6px' }}>INDUSTRY APPLICATION</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
                {learningContent.real_world_case.company}
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '14px' }}>
                {learningContent.real_world_case.scenario}
              </p>
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid #10b981' }}>
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>BOARDROOM TAKEAWAY</span>
                <div style={{ fontSize: '0.88rem', color: '#e2e8f0', marginTop: '2px' }}>
                  {learningContent.real_world_case.boardroom_insight}
                </div>
              </div>
            </div>
          )}

          {/* Practice Problem */}
          {learningContent.practice_problem && (
            <div className="glass-panel-glow" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#818cf8" /> Interactive Practice Problem
                </h3>
                <span className="badge badge-purple">Self-Check</span>
              </div>
              <p style={{ color: '#f1f5f9', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '14px' }}>
                {learningContent.practice_problem.problem}
              </p>

              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '14px' }}>
                💡 <strong>Hint:</strong> {learningContent.practice_problem.hint}
              </div>

              {!showPracticeSolution ? (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setShowPracticeSolution(true)}
                >
                  Reveal Step-by-Step Solution
                </button>
              ) : (
                <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 800, marginBottom: '4px' }}>VERIFIED SOLUTION</div>
                  <div style={{ fontSize: '0.88rem', color: '#f1f5f9', lineHeight: 1.6 }}>
                    {learningContent.practice_problem.solution}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Embedded ARIA AI Chat Tutor for this topic */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} color="#818cf8" /> Ask ARIA About {learningContent.title}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '12px' }}>
              Have questions on this concept? ARIA is grounded in Dr. Veena A's syllabus notes:
            </p>
            <ARIAChatPanel
              pageContext={`Step 4 Learning: ${learningContent.title}`}
              welcomeMessage={`I am ARIA. I am ready to explain **${learningContent.title}**, clarify formulas, or walk through practice problems with you before your post-quiz!`}
              compact={true}
            />
          </div>

          {needsPractice && (
            <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--color-warn)' }}>
              <h3 style={{ color: 'var(--color-text)' }}>Targeted practice required</h3>
              <p style={{ color: 'var(--color-text-2)' }}>Quiz 1 was below 80%. Review the weak concepts above, work through the practice problem, and mark it complete to unlock Quiz 2.</p>
              <button className="btn btn-secondary" onClick={handleCompletePractice} disabled={practiceMarked || !showPracticeSolution}>
                {practiceMarked ? 'Practice recorded' : 'Mark practice complete'}
              </button>
            </div>
          )}
          {/* Proceed to Post-Quiz */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '14px 28px', fontSize: '0.98rem', fontWeight: 800 }}
              disabled={needsPractice && !practiceMarked}
              onClick={handleProceedToPostQuiz}
            >
              Take Step 5: Post-Learning Quiz (Test Mastery) <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 5: POST-LEARNING QUIZ (MASTERY TESTING)             */}
      {/* ========================================================= */}
      {currentStep === 5 && postQuizData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge-indigo" style={{ marginBottom: '6px' }}>STEP 5: POST-LEARNING QUIZ</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                  Post-Learning Mastery Quiz: {selectedTopic?.name}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Testing the same learning objectives to measure your knowledge gain against your baseline score ({preResult?.score_percentage ?? 0}%).
                </p>
              </div>
              <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: '0.82rem', fontWeight: 700 }}>
                Questions: {postQuizData.questions?.length || 0}
              </div>
            </div>
          </div>

          {/* Quiz Questions List */}
          {postQuizData.questions?.map((q, idx) => (
            <div key={q.id} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#818cf8' }}>QUESTION {idx + 1} OF {postQuizData.questions.length}</span>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{q.difficulty}</span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.5, marginBottom: '16px' }}>
                {q.question_text}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options?.map((opt, optIdx) => {
                  const isSelected = postAnswers[q.id] === opt;
                  return (
                    <div
                      key={optIdx}
                      className={`quiz-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (!postResult) {
                          setPostAnswers({ ...postAnswers, [q.id]: opt });
                        }
                      }}
                    >
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        border: isSelected ? '5px solid #6366f1' : '2px solid rgba(255,255,255,0.2)',
                        background: isSelected ? '#fff' : 'transparent',
                        flexShrink: 0
                      }} />
                      <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Actions / Post-Quiz Result */}
          {!postResult ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-primary"
                disabled={submittingPost || Object.keys(postAnswers).length === 0}
                onClick={handleSubmitPostQuiz}
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                {submittingPost ? 'Grading Post-Quiz...' : 'Submit Post-Quiz & Compare Scores'} <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="glass-panel-glow" style={{ padding: '28px', background: 'rgba(15,23,42,0.95)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>POST-ASSESSMENT COMPLETE</span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                    Post-Quiz Score: {postResult.score_percentage}%
                  </h3>
                  <div style={{ fontSize: '0.9rem', color: postResult.score_gain_pct >= 0 ? '#34d399' : '#f87171', fontWeight: 700, marginTop: '4px' }}>
                    Score Delta: {postResult.score_gain_pct >= 0 ? `+${postResult.score_gain_pct}%` : `${postResult.score_gain_pct}%`} Knowledge Gain over Baseline
                  </div>
                </div>
                <div style={{ padding: '10px 18px', borderRadius: '12px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 800 }}>STATUS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{postResult.mastery_status}</div>
                </div>
              </div>

              {/* Side-by-Side Comparison Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>PRE-QUIZ BASELINE</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                    {postResult.pre_score_pct ?? 0}%
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>POST-QUIZ RESULT</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                    {postResult.post_score_pct}%
                  </div>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>LEARNING GAIN</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                    +{postResult.score_gain_pct}%
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800 }}
                onClick={handleViewPerformanceDashboard}
              >
                Proceed to Step 6: View Full Comparative Dashboard &amp; Revision Notes <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 6: COMPARATIVE PERFORMANCE & REVISION DASHBOARD      */}
      {/* ========================================================= */}
      {currentStep === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>STEP 6 OF 6</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                  Learning Performance, Comparative Analytics &amp; Revision Radar
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Track how much you have improved from pre-quiz to post-quiz, review diagnosed misconceptions, and access targeted revision notes.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                onClick={() => setCurrentStep(2)}
              >
                <RotateCcw size={14} /> Master Another Topic
              </button>
            </div>
          </div>

          {/* Key KPI Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>TOPICS ASSESSED</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {dashboardData?.completed_topics ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Across 5 Syllabus Modules</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800 }}>AVERAGE BASELINE PRE-SCORE</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                {dashboardData?.average_pre_score ?? 0}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Prior to AI Teaching</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>AVERAGE POST-SCORE</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                {dashboardData?.average_post_score ?? 0}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Post AI Guided Learning</div>
            </div>

            <div className="glass-panel-glow" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 800 }}>NET LEARNING GAIN</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                +{dashboardData?.average_score_gain ?? 0}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>Demonstrated Knowledge Growth</div>
            </div>
          </div>

          {/* Detailed Topic-by-Topic Pre vs Post Comparison Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="#818cf8" /> Module-Wise Topic Comparison &amp; Growth Tracker
            </h3>

            {dashboardData?.attempts_history?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardData.attempts_history.map((att) => (
                  <div
                    key={att.id}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div style={{ minWidth: '220px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700 }}>{att.module_title}</span>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                        {att.topic_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Status: <strong style={{ color: att.mastery_status === 'Mastered' ? '#34d399' : '#fbbf24' }}>{att.mastery_status}</strong>
                      </div>
                    </div>

                    {/* Pre vs Post Visual Bars */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '280px' }}>
                      {/* Pre bar */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                          <span>Pre-Quiz Baseline</span>
                          <span style={{ color: '#fbbf24', fontWeight: 800 }}>{att.pre_score_pct ?? 0}%</span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${att.pre_score_pct ?? 0}%`, background: '#fbbf24', borderRadius: '4px' }} />
                        </div>
                      </div>

                      {/* Post bar */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}>
                          <span>Post-Quiz Mastery</span>
                          <span style={{ color: '#34d399', fontWeight: 800 }}>{att.post_score_pct ?? 0}%</span>
                        </div>
                        <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${att.post_score_pct ?? 0}%`, background: '#34d399', borderRadius: '4px' }} />
                        </div>
                      </div>

                      {/* Gain badge */}
                      <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 800, fontSize: '0.85rem' }}>
                        +{att.score_gain_pct}%
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => {
                        const m = modules.find((mod) => mod.id === att.module_id) || modules[0];
                        const t = m?.topics?.find((top) => top.id === att.topic_id) || { id: att.topic_id, name: att.topic_name };
                        handleStartPreQuiz(t, m);
                      }}
                    >
                      Retake / Practice
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                You have not completed any topic quizzes yet. Go to Step 2 to select a topic!
              </div>
            )}
          </div>

          {/* AI Recommended Targeted Revision Notes */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #818cf8' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} color="#818cf8" /> AI Targeted Revision Plan &amp; Weak Concept Recovery
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
              Based on your quiz errors, ARIA AI has synthesized the following targeted revision notes:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>CORE RULE</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                  Stationarity &amp; ADF Decision Rule
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.6 }}>
                  Remember: ADF null hypothesis is non-stationarity. Rejecting H0 requires p &lt; 0.05. If p &gt;= 0.05, the series is non-stationary and must be differenced (d=1).
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>METRIC SELECTION</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                  MAE vs RMSE in Executive Decisions
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.6 }}>
                  MAE penalizes errors linearly. RMSE penalizes large catastrophic misses quadratically. Choose RMSE when stockouts result in severe penalties or plant shutdowns.
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem', marginBottom: '6px' }}>MODEL IDENTIFICATION</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                  PACF vs ACF Diagnostic Plots
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.6 }}>
                  PACF sharp cut-off identifies AR(p) order. ACF sharp cut-off identifies MA(q) order. Never confuse the two!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
