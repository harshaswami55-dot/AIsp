import React, { useState, useEffect } from 'react';
import {
  Scale, Award, CheckCircle2, TrendingUp, RefreshCw,
  HelpCircle, ShieldCheck, FileSpreadsheet, ChevronRight
} from 'lucide-react';

export default function ModelComparisonView() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(1);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      runComparison(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/forecast/datasets');
      const data = await res.json();
      setDatasets(data.datasets || []);
      if (data.datasets?.length > 0) {
        setSelectedDatasetId(data.datasets[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runComparison = async (id) => {
    setLoading(true);
    try {
      const res = await fetch('/api/forecast/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: id, horizon: 6 })
      });
      const data = await res.json();
      setComparison(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-purple">Multi-Criteria Model Selection</span>
              <span className="badge badge-blue">Head-to-Head Tournament</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
              Multi-Model Tournament & Benchmarking Matrix
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '2px' }}>
              Evaluates statistical models vs ensemble machine learning across accuracy, board auditability, and operational complexity.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Evaluation Dataset:</span>
            <select
              style={{ width: '220px', fontWeight: 600 }}
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(parseInt(e.target.value))}
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={() => runComparison(selectedDatasetId)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '50px', textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={32} color="#3b82f6" style={{ margin: '0 auto 16px' }} />
          <h3>Running Real Python Fitting across ARIMA, SARIMA, Random Forest & XGBoost...</h3>
        </div>
      ) : comparison ? (
        <>
          {/* Winner Cards: Best Statistical, Best ML, Best Overall Business Choice */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Best Statistical */}
            <div className="glass-panel" style={{ padding: '20px', borderColor: 'rgba(59, 130, 246, 0.4)' }}>
              <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700 }}>BEST STATISTICAL MODEL</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
                {comparison.best_statistical}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                Optimal balance of formal hypothesis testability and parameter auditability.
              </p>
            </div>

            {/* Best ML */}
            <div className="glass-panel" style={{ padding: '20px', borderColor: 'rgba(139, 92, 246, 0.4)' }}>
              <span style={{ fontSize: '0.75rem', color: '#c4b5fd', fontWeight: 700 }}>BEST MACHINE LEARNING MODEL</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
                {comparison.best_ml}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                Captures high-order multi-lag interactions and promotional discount impacts.
              </p>
            </div>

            {/* Recommended Business Choice */}
            <div className="glass-panel-glow" style={{ padding: '20px', borderColor: 'rgba(16, 185, 129, 0.5)' }}>
              <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 800 }}>RECOMMENDED BOARDROOM CHOICE</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                {comparison.best_overall}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px' }}>
                Selected for best accuracy-to-explainability risk profile.
              </p>
            </div>
          </div>

          {/* Full Comparison Table */}
          <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Comprehensive Model Tournament Matrix
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>Model</th>
                  <th style={{ padding: '10px' }}>Type</th>
                  <th style={{ padding: '10px' }}>MAE</th>
                  <th style={{ padding: '10px' }}>MSE</th>
                  <th style={{ padding: '10px' }}>RMSE</th>
                  <th style={{ padding: '10px' }}>MAPE</th>
                  <th style={{ padding: '10px' }}>Interpretability</th>
                  <th style={{ padding: '10px' }}>Complexity</th>
                  <th style={{ padding: '10px' }}>Best Use Case</th>
                </tr>
              </thead>
              <tbody>
                {comparison.models?.map((row, idx) => {
                  const isWinner = row.model === comparison.best_overall;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: isWinner ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: '#ffffff' }}>
                        {row.model}
                        {isWinner && <span className="badge badge-emerald" style={{ marginLeft: '6px' }}>Top Pick</span>}
                      </td>
                      <td style={{ padding: '10px', color: '#93c5fd' }}>{row.type}</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>{row.metrics.mae}</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>{row.metrics.mse}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#f59e0b' }}>{row.metrics.rmse}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#10b981' }}>{row.metrics.mape}%</td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${row.interpretability.includes('High') ? 'badge-emerald' : (row.interpretability.includes('Moderate') ? 'badge-blue' : 'badge-amber')}`}>
                          {row.interpretability}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>{row.complexity}</td>
                      <td style={{ padding: '10px', color: '#cbd5e1', fontSize: '0.8rem' }}>{row.best_use_case}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Executive Narrative */}
          <div className="glass-panel-glow" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
              MBA Executive Synthesis & Managerial Rationale
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {comparison.narrative}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
