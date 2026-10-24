import React, { useState, useEffect } from 'react';
import {
  BarChart3, Upload, Play, RefreshCw, Layers, Database,
  Sliders, TrendingUp, AlertCircle, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';
import InteractiveChart from '../components/InteractiveChart';

export default function ForecastingLabView() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(1);
  const [datasetDetails, setDatasetDetails] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  // Model training state
  const [selectedModel, setSelectedModel] = useState('holt_winters');
  const [horizon, setHorizon] = useState(6);
  const [params, setParams] = useState({
    p: 1, d: 1, q: 1,
    P: 1, D: 1, Q: 1, s: 12,
    window: 3, alpha: 0.3
  });
  const [modelResult, setModelResult] = useState(null);
  const [training, setTraining] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('chart'); // chart, adf, acf, decomp, data

  // File Upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      loadDataset(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/forecast/datasets');
      const data = await res.json();
      setDatasets(data.datasets || []);
      if (data.datasets && data.datasets.length > 0) {
        setSelectedDatasetId(data.datasets[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDataset = async (id) => {
    setAnalyzing(true);
    try {
      // 1. Fetch details
      const detRes = await fetch(`/api/forecast/dataset/${id}`);
      const det = await detRes.json();
      setDatasetDetails(det);

      // 2. Run analysis
      const anaRes = await fetch('/api/forecast/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: id })
      });
      const ana = await anaRes.json();
      setAnalysisData(ana);
      setModelResult(null); // reset prior model fit
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTrainModel = async () => {
    setTraining(true);
    try {
      const res = await fetch('/api/forecast/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDatasetId,
          model_name: selectedModel,
          horizon: parseInt(horizon),
          parameters: params
        })
      });
      const data = await res.json();
      setModelResult(data);
      setActiveTab('chart'); // switch to chart view
    } catch (e) {
      console.error(e);
      alert("Model fitting error: Ensure parameter validity and sufficient data points.");
    } finally {
      setTraining(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);

    setUploading(true);
    try {
      const res = await fetch('/api/forecast/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      alert(`Success: ${data.message}`);
      await fetchDatasets();
      setSelectedDatasetId(data.id);
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to upload CSV.");
    } finally {
      setUploading(false);
    }
  };

  const isSeasonal = selectedModel.includes('sarima') || selectedModel === 'holt_winters';
  const isArima = selectedModel.includes('arima');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls Header */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-blue">Interactive Lab</span>
              <span className="badge badge-purple">Real Python Calculations</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff' }}>
              MBA Forecasting Lab & Statistical Laboratory
            </h2>
          </div>

          {/* Dataset Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Dataset:</span>
            <select
              style={{ width: '230px', fontWeight: 600 }}
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(parseInt(e.target.value))}
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.category})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout: Model Config & Chart Visualizer */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Left Column: Model Selection & Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} color="#3b82f6" /> Model Configuration
            </h3>

            {/* Model Family */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  SELECT FORECASTING ALGORITHM
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <optgroup label="Classical Smoothing">
                    <option value="naive">Naive (Last Value Benchmark)</option>
                    <option value="moving_average">Moving Average (Smoothing)</option>
                    <option value="ses">Simple Exponential Smoothing (SES)</option>
                    <option value="holt">Holt's Linear (Trend)</option>
                    <option value="holt_winters">Holt-Winters (Triple Exponential)</option>
                  </optgroup>
                  <optgroup label="Univariate Time Series">
                    <option value="arima">ARIMA(p, d, q)</option>
                    <option value="sarima">SARIMA(p,d,q)x(P,D,Q)_s</option>
                  </optgroup>
                  <optgroup label="Supervised Machine Learning">
                    <option value="random_forest">Random Forest Regressor</option>
                    <option value="xgboost">XGBoost Regressor</option>
                    <option value="linear_regression">Linear Regression</option>
                    <option value="decision_tree">Decision Tree Regressor</option>
                  </optgroup>
                </select>
              </div>

              {/* Horizon */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  FORECAST HORIZON (PERIODS)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                />
              </div>

              {/* ARIMA Parameters */}
              {isArima && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                    ARIMA Orders (p, d, q)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>p (AR)</span>
                      <input type="number" min="0" max="5" value={params.p} onChange={(e) => setParams({ ...params, p: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>d (Diff)</span>
                      <input type="number" min="0" max="2" value={params.d} onChange={(e) => setParams({ ...params, d: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>q (MA)</span>
                      <input type="number" min="0" max="5" value={params.q} onChange={(e) => setParams({ ...params, q: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Seasonal Orders */}
              {selectedModel === 'sarima' && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#c4b5fd', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                    Seasonal Orders (P, D, Q)_s
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>P</span>
                      <input type="number" min="0" max="2" value={params.P} onChange={(e) => setParams({ ...params, P: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>D</span>
                      <input type="number" min="0" max="1" value={params.D} onChange={(e) => setParams({ ...params, D: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Q</span>
                      <input type="number" min="0" max="2" value={params.Q} onChange={(e) => setParams({ ...params, Q: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>s (Cycle)</span>
                      <input type="number" min="2" max="24" value={params.s} onChange={(e) => setParams({ ...params, s: parseInt(e.target.value) || 12 })} />
                    </div>
                  </div>
                </div>
              )}

              {selectedModel === 'moving_average' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Window Size (k periods)
                  </label>
                  <input type="number" min="2" max="12" value={params.window} onChange={(e) => setParams({ ...params, window: parseInt(e.target.value) || 3 })} />
                </div>
              )}

              {/* Train Button */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '6px' }}
                disabled={training}
                onClick={handleTrainModel}
              >
                {training ? (
                  <>Fitting Model in Python...</>
                ) : (
                  <><Play size={15} /> Fit & Forecast Model</>
                )}
              </button>
            </div>
          </div>

          {/* Upload Custom Dataset Card */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={14} /> Upload Custom CSV
            </h4>
            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files[0])}
                style={{ fontSize: '0.75rem', padding: '6px' }}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                disabled={!uploadFile || uploading}
              >
                {uploading ? 'Processing CSV...' : 'Process Dataset'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Visualizer & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* View Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
            <button
              className={`btn ${activeTab === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => setActiveTab('chart')}
            >
              <TrendingUp size={14} /> Forecast & Fitted Chart
            </button>
            <button
              className={`btn ${activeTab === 'adf' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => setActiveTab('adf')}
            >
              Stationarity (ADF Test)
            </button>
            <button
              className={`btn ${activeTab === 'acf' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => setActiveTab('acf')}
            >
              ACF / PACF Correlograms
            </button>
            <button
              className={`btn ${activeTab === 'decomp' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => setActiveTab('decomp')}
            >
              Decomposition (Trend/Season)
            </button>
            <button
              className={`btn ${activeTab === 'data' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => setActiveTab('data')}
            >
              <Database size={14} /> Data Table
            </button>
          </div>

          {/* TAB 1: CHART & MODEL ACCURACY */}
          {activeTab === 'chart' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analysisData && (
                <InteractiveChart
                  title={`${datasetDetails?.name || 'Time Series'} — ${modelResult?.model_result?.model_name || 'Historical Baseline'}`}
                  timestamps={analysisData.timestamps}
                  actual={analysisData.actual_values}
                  fitted={modelResult?.model_result?.fitted_values || []}
                  forecast={modelResult?.model_result?.forecast_values || modelResult?.model_result?.future_forecasts || []}
                  futureTimestamps={modelResult?.future_timestamps || []}
                  height={340}
                  yLabel={datasetDetails?.target_col || "Demand / Sales"}
                />
              )}

              {/* REAL METRICS TABLE (MAE, MSE, RMSE, MAPE) */}
              {modelResult?.model_result?.metrics && (
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                      Real Forecast Accuracy Metrics (Python Computed)
                    </h4>
                    <span className="badge badge-emerald">Out-of-Sample Evaluation</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>MAE (Absolute Error)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                        {modelResult.model_result.metrics.mae}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Original Units</span>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>MSE (Mean Squared)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                        {modelResult.model_result.metrics.mse}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Quadratic Penalty</span>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>RMSE (Root MSE)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        {modelResult.model_result.metrics.rmse}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Volatility Buffer</span>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>MAPE (Percentage)</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                        {modelResult.model_result.metrics.mape}%
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Relative Deviation</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' }}>
                    Footnote: {modelResult.model_result.metrics.note}
                  </p>
                </div>
              )}

              {/* MANAGERIAL 3-LAYER INTERPRETATION */}
              {modelResult?.model_result?.managerial && (
                <div className="glass-panel-glow" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#3b82f6" /> Executive Decision Translation Layer
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Layer 1: Forecast */}
                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #3b82f6' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#93c5fd' }}>1. STATISTICAL FORECAST STATEMENT</span>
                      <p style={{ fontSize: '0.88rem', color: '#f1f5f9', marginTop: '4px' }}>
                        {modelResult.model_result.managerial.forecast_statement}
                      </p>
                    </div>

                    {/* Layer 2: Interpretation */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fcd34d' }}>2. BUSINESS INTERPRETATION & RISK ASSESSMENT</span>
                      <p style={{ fontSize: '0.88rem', color: '#f1f5f9', marginTop: '4px' }}>
                        {modelResult.model_result.managerial.business_interpretation}
                      </p>
                    </div>

                    {/* Layer 3: Recommendation */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6ee7b7' }}>3. MANAGERIAL RECOMMENDATION FOR LEADERSHIP</span>
                      <p style={{ fontSize: '0.88rem', color: '#f1f5f9', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                        {modelResult.model_result.managerial.managerial_recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADF TEST RESULTS */}
          {activeTab === 'adf' && analysisData?.adf_test && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                  Augmented Dickey-Fuller (ADF) Unit Root Test
                </h3>
                <span className={`badge ${analysisData.adf_test.is_stationary ? 'badge-emerald' : 'badge-rose'}`} style={{ fontSize: '0.85rem' }}>
                  {analysisData.adf_test.verdict}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ADF Test Statistic</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
                    {analysisData.adf_test.adf_statistic}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>p-Value (Threshold 0.05)</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: analysisData.adf_test.p_value < 0.05 ? '#10b981' : '#f43f5e' }}>
                    {analysisData.adf_test.p_value}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Critical Value (5%)</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                    {analysisData.adf_test.critical_values?.['5%']}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd' }}>EXPLANATION FOR MBA EXECUTIVES</div>
                <p style={{ fontSize: '0.88rem', color: '#f1f5f9', marginTop: '6px', lineHeight: 1.6 }}>
                  {analysisData.adf_test.explanation}
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6ee7b7' }}>ACTIONABLE MODELING RECOMMENDATION</div>
                <p style={{ fontSize: '0.88rem', color: '#f1f5f9', marginTop: '6px' }}>
                  {analysisData.adf_test.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ACF / PACF */}
          {activeTab === 'acf' && analysisData?.acf_pacf && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <InteractiveChart
                title="Autocorrelation Function (ACF)"
                timestamps={analysisData.acf_pacf.lags}
                actual={analysisData.acf_pacf.acf}
                type="acf"
                confBound={analysisData.acf_pacf.confidence_bound}
                height={280}
              />
              <InteractiveChart
                title="Partial Autocorrelation Function (PACF)"
                timestamps={analysisData.acf_pacf.lags}
                actual={analysisData.acf_pacf.pacf}
                type="pacf"
                confBound={analysisData.acf_pacf.confidence_bound}
                height={280}
              />
            </div>
          )}

          {/* TAB 4: DECOMPOSITION */}
          {activeTab === 'decomp' && analysisData?.decomposition && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <InteractiveChart
                title="Identified Trend Component (Centered Moving Average)"
                timestamps={analysisData.timestamps}
                actual={analysisData.decomposition.trend}
                height={220}
              />
              <InteractiveChart
                title="Identified Seasonal Variations Component"
                timestamps={analysisData.timestamps}
                actual={analysisData.decomposition.seasonal}
                height={220}
              />
            </div>
          )}

          {/* TAB 5: DATA TABLE */}
          {activeTab === 'data' && datasetDetails && (
            <div className="glass-panel" style={{ padding: '20px', maxHeight: '480px', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
                Historical Observations ({datasetDetails.records?.length} rows)
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '8px' }}>Period</th>
                    <th style={{ padding: '8px' }}>Target ({datasetDetails.target_col})</th>
                    {datasetDetails.feature_cols?.map((col, i) => (
                      <th key={i} style={{ padding: '8px' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {datasetDetails.records?.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px', color: '#93c5fd' }}>{row[datasetDetails.time_col]}</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#ffffff' }}>{row[datasetDetails.target_col]}</td>
                      {datasetDetails.feature_cols?.map((col, i) => (
                        <td key={i} style={{ padding: '8px', color: '#cbd5e1' }}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
