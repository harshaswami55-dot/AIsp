import React from 'react';
import {
  Award, CheckCircle2, FileText, BookOpen, Layers,
  Compass, ExternalLink, ShieldCheck
} from 'lucide-react';

export default function CourseOutcomesView() {
  const courseOutcomes = [
    {
      code: "CO1",
      title: "Forecast Taxonomy & Business Horizons",
      description: "Explain different types of forecasts and their use in business.",
      bloom: "Remember, Understand (Level 1)",
      evaluationComponent: "CIE 1: Quiz/Test (10%), CIE 3: Midterm (20%)",
      mastery: 82,
      evidence: ["Diagnostic Assessment Q1-Q5", "Managerial Planning Case", "Forecast Horizon Audit"]
    },
    {
      code: "CO2",
      title: "Data Patterns & Classical Smoothing",
      description: "Identify patterns in data and apply classical forecasting methods like moving average and exponential smoothing.",
      bloom: "Apply, Analyse (Level 2)",
      evaluationComponent: "CIE 2: Forecasting Analysis Assignment (10%), CIE 5: Project (20%)",
      mastery: 76,
      evidence: ["Moving Average Lab", "Simple & Double Exponential Smoothing", "Holt-Winters Seasonal Run"]
    },
    {
      code: "CO3",
      title: "Univariate Time Series (ARIMA / SARIMA)",
      description: "Build time series models such as ARIMA and SARIMA for forecasting.",
      bloom: "Apply, Evaluate (Levels 2-3)",
      evaluationComponent: "CIE 3: Midterm (20%), CIE 4: Model Development (10%)",
      mastery: 59,
      evidence: ["ADF Stationarity Unit Root Test", "ACF & PACF Correlogram Analysis", "SARIMA Grid Tuning"]
    },
    {
      code: "CO4",
      title: "Multivariate Interrelated Modeling",
      description: "Use multivariate forecasting models like VAR and SARIMAX.",
      bloom: "Analyse, Evaluate (Level 3)",
      evaluationComponent: "CIE 5: Project (20%), Final Examination (30%)",
      mastery: 65,
      evidence: ["Exogenous Advertising vs Sales Regressors", "VAR Cross-lag System", "Granger Causality Check"]
    },
    {
      code: "CO5",
      title: "Supervised ML Forecasting & Comparison",
      description: "Apply machine learning methods (like decision trees and XGBoost) for forecasting and compare with traditional models.",
      bloom: "Analyse, Create (Level 3)",
      evaluationComponent: "CIE 5: Project (20%), Final Examination (30%)",
      mastery: 73,
      evidence: ["Lag Feature Engineering", "Random Forest Regressor", "XGBoost Hyperparameter Run", "Model Comparison Matrix"]
    }
  ];

  const cieComponents = [
    { name: "CIE 1: Quiz / Test", weight: "10%", blooms: "Remember, Understand", co: "CO1" },
    { name: "CIE 2: Forecasting Analysis Assignment", weight: "10%", blooms: "Apply, Analyse", co: "CO2" },
    { name: "CIE 3: Midterm Examination", weight: "20%", blooms: "Apply, Evaluate", co: "CO1, CO2, CO3" },
    { name: "CIE 4: Model Development Assignment", weight: "10%", blooms: "Apply, Evaluate", co: "CO3" },
    { name: "CIE 5: Business Forecasting Project", weight: "20%", blooms: "Analyse, Create", co: "CO2, CO3, CO4" },
    { name: "Final Examination", weight: "30%", blooms: "Understand, Apply, Evaluate", co: "CO1 to CO5" }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Banner */}
      <div className="glass-panel-glow" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span className="badge badge-purple">RV University SOB</span>
          <span className="badge badge-blue">SB6202 Business Forecasting</span>
          <span className="badge badge-emerald">4 Credits • 40 Teaching Hours</span>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
          Course Outcomes (CO) & Official Assessment Rubrics
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '2px' }}>
          Every platform activity generates tamper-proof evidence mapped directly to Bloom's taxonomy and RV University CIE standards.
        </p>
      </div>

      {/* CO Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {courseOutcomes.map((co, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-blue" style={{ fontSize: '0.9rem', padding: '4px 12px' }}>{co.code}</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{co.title}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-purple">{co.bloom}</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: co.mastery >= 75 ? '#10b981' : (co.mastery >= 60 ? '#f59e0b' : '#f43f5e') }}>
                  {co.mastery}%
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', marginBottom: '14px' }}>
              {co.description}
            </p>

            {/* Assessment Component & Evidence */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  EVALUATED IN CIE
                </span>
                <div style={{ fontSize: '0.82rem', color: '#93c5fd', marginTop: '2px' }}>
                  {co.evaluationComponent}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  GENERATED EVIDENCE OF LEARNING
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {co.evidence.map((ev, i) => (
                    <span key={i} className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                      <CheckCircle2 size={10} /> {ev}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CIE Assessment Structure Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
          Official Continuous Internal Evaluation (CIE) Structure
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>Component</th>
              <th style={{ padding: '10px' }}>Weightage</th>
              <th style={{ padding: '10px' }}>Bloom's Thinking Level</th>
              <th style={{ padding: '10px' }}>COs Assessed</th>
            </tr>
          </thead>
          <tbody>
            {cieComponents.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px', fontWeight: 600, color: '#ffffff' }}>{c.name}</td>
                <td style={{ padding: '10px', color: '#10b981', fontWeight: 700 }}>{c.weight}</td>
                <td style={{ padding: '10px', color: '#cbd5e1' }}>{c.blooms}</td>
                <td style={{ padding: '10px', color: '#93c5fd' }}>{c.co}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
