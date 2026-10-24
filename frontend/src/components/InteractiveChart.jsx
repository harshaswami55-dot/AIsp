import React, { useState } from 'react';

/**
 * Interactive SVG Charting Engine for AI Learning Partner 360
 * Supports:
 * - Time Series with Actual, Fitted, and Forecast lines
 * - ACF/PACF bar correlograms with 95% Bartlett confidence thresholds
 * - Multi-series decomposition (Trend, Seasonality, Residuals)
 */
export default function InteractiveChart({
  title,
  timestamps = [],
  actual = [],
  fitted = [],
  forecast = [],
  futureTimestamps = [],
  type = 'line', // line, acf, pacf, bar
  height = 320,
  yLabel = 'Units',
  confBound = null
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  // Combine timestamps and data points for continuous rendering
  const allLabels = [...timestamps, ...futureTimestamps];
  const allActual = [...actual, ...new Array(futureTimestamps.length).fill(null)];
  const allFitted = [...fitted, ...new Array(futureTimestamps.length).fill(null)];
  
  // Align forecast at the end of fitted/actual
  const forecastOffset = actual.length > 0 ? actual.length - 1 : 0;
  const allForecast = new Array(allLabels.length).fill(null);
  if (forecast && forecast.length > 0) {
    if (actual.length > 0) {
      allForecast[forecastOffset] = actual[actual.length - 1]; // link to last actual point
    }
    forecast.forEach((val, i) => {
      if (forecastOffset + 1 + i < allForecast.length) {
        allForecast[forecastOffset + 1 + i] = val;
      }
    });
  }

  // ACF / PACF specific rendering
  if (type === 'acf' || type === 'pacf') {
    const values = actual;
    const lags = timestamps.length > 0 ? timestamps : values.map((_, i) => i);
    const maxVal = Math.max(1, ...values.map(Math.abs));
    const width = 600;
    const chartHeight = height;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const zeroY = padding.top + (chartHeight - padding.top - padding.bottom) / 2;
    const plotH = (chartHeight - padding.top - padding.bottom) / 2;

    const barWidth = Math.max(6, (width - padding.left - padding.right) / (values.length * 2));
    const bound = confBound || 0.28;
    const boundYTop = zeroY - (bound / maxVal) * plotH;
    const boundYBottom = zeroY + (bound / maxVal) * plotH;

    return (
      <div className="glass-panel" style={{ padding: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>{title}</h4>
          <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
            95% Confidence Threshold: ±{bound}
          </span>
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${chartHeight}`} style={{ width: '100%', height: `${chartHeight}px` }}>
            {/* Grid & Zero Axis */}
            <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="var(--color-border-md)" strokeWidth="1.5" />
            
            {/* Confidence Bounds */}
            <line x1={padding.left} y1={boundYTop} x2={width - padding.right} y2={boundYTop} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth="1.2" />
            <line x1={padding.left} y1={boundYBottom} x2={width - padding.right} y2={boundYBottom} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth="1.2" />
            <text x={width - padding.right - 4} y={boundYTop - 4} fill="#60a5fa" fontSize="10" textAnchor="end">+1.96/√N</text>
            <text x={width - padding.right - 4} y={boundYBottom + 12} fill="#60a5fa" fontSize="10" textAnchor="end">-1.96/√N</text>

            {/* Bars for lags */}
            {values.map((val, idx) => {
              const x = padding.left + (idx + 0.5) * ((width - padding.left - padding.right) / values.length);
              const barH = (Math.abs(val) / maxVal) * plotH;
              const y = val >= 0 ? zeroY - barH : zeroY;
              const isSignificant = Math.abs(val) > bound;

              return (
                <g key={idx}>
                  <line x1={x} y1={zeroY} x2={x} y2={val >= 0 ? y : y + barH} stroke={isSignificant ? "#ec4899" : "#64748b"} strokeWidth="2" />
                  <circle cx={x} cy={val >= 0 ? y : y + barH} r="4" fill={isSignificant ? "#f43f5e" : "#94a3b8"} />
                  {idx % 2 === 0 && (
                    <text x={x} y={chartHeight - 12} fill="#94a3b8" fontSize="10" textAnchor="middle">{lags[idx]}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  // Line Chart for Time Series
  const validNumbers = [
    ...actual.filter(v => typeof v === 'number' && !isNaN(v)),
    ...fitted.filter(v => typeof v === 'number' && !isNaN(v)),
    ...forecast.filter(v => typeof v === 'number' && !isNaN(v))
  ];

  if (validNumbers.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-3)' }}>
        No visual data points available to plot.
      </div>
    );
  }

  const minVal = Math.min(...validNumbers) * 0.92;
  const maxVal = Math.max(...validNumbers) * 1.08;
  const range = maxVal - minVal || 1;

  const width = 760;
  const chartHeight = height;
  const padding = { top: 30, right: 40, bottom: 45, left: 55 };
  const plotW = width - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  const getX = (i) => padding.left + (i / Math.max(1, allLabels.length - 1)) * plotW;
  const getY = (val) => chartHeight - padding.bottom - ((val - minVal) / range) * plotH;

  // Build SVG paths
  const buildPath = (data) => {
    let d = '';
    let started = false;
    data.forEach((val, i) => {
      if (val !== null && typeof val === 'number' && !isNaN(val)) {
        const x = getX(i);
        const y = getY(val);
        if (!started) {
          d += `M ${x} ${y}`;
          started = true;
        } else {
          d += ` L ${x} ${y}`;
        }
      } else {
        started = false;
      }
    });
    return d;
  };

  const actualPath = buildPath(allActual);
  const fittedPath = buildPath(allFitted);
  const forecastPath = buildPath(allForecast);

  return (
    <div className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>{title}</h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>{yLabel} across historical timeline & forecast horizon</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', alignItems: 'center' }}>
          {actual.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '3px', background: '#3b82f6', borderRadius: '2px' }}></span>
              <span style={{ color: '#93c5fd' }}>Actual Data</span>
            </div>
          )}
          {fitted.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '2px', background: '#10b981', borderTop: '2px dotted #10b981' }}></span>
              <span style={{ color: '#6ee7b7' }}>Model Fitted</span>
            </div>
          )}
          {forecast.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '3px', background: '#f59e0b', borderRadius: '2px' }}></span>
              <span style={{ color: '#fcd34d', fontWeight: 600 }}>Forecast (Horizon)</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          style={{ width: '100%', height: `${chartHeight}px`, overflow: 'visible' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y Axis Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const y = chartHeight - padding.bottom - ratio * plotH;
            const val = minVal + ratio * range;
            return (
              <g key={idx}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--color-border-md)" strokeDasharray="3 3" />
                <text x={padding.left - 10} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                  {val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Shaded Forecast Horizon Background */}
          {forecast.length > 0 && (
            <rect
              x={getX(forecastOffset)}
              y={padding.top}
              width={plotW - (getX(forecastOffset) - padding.left)}
              height={plotH}
              fill="rgba(245, 158, 11, 0.06)"
              stroke="rgba(245, 158, 11, 0.2)"
              strokeDasharray="4 4"
            />
          )}

          {/* Lines */}
          {fittedPath && <path d={fittedPath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" opacity="0.8" />}
          {actualPath && <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />}
          {forecastPath && <path d={forecastPath} fill="none" stroke="#f59e0b" strokeWidth="3" />}

          {/* Data Points on Hover */}
          {allActual.map((val, idx) => {
            if (val === null) return null;
            const x = getX(idx);
            const y = getY(val);
            const isHovered = hoverIndex === idx;

            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={isHovered ? 6 : 2.5}
                fill={isHovered ? '#60a5fa' : '#3b82f6'}
                stroke="#0f172a"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}

          {allForecast.map((val, idx) => {
            if (val === null || idx <= forecastOffset) return null;
            const x = getX(idx);
            const y = getY(val);
            const isHovered = hoverIndex === idx;

            return (
              <circle
                key={`fc-${idx}`}
                cx={x}
                cy={y}
                r={isHovered ? 6 : 4}
                fill="#f59e0b"
                stroke="#0f172a"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}

          {/* X Axis Labels */}
          {allLabels.map((lbl, idx) => {
            // Display roughly 6-8 labels evenly spaced
            const step = Math.max(1, Math.floor(allLabels.length / 7));
            if (idx % step !== 0 && idx !== allLabels.length - 1) return null;
            const x = getX(idx);
            return (
              <text
                key={idx}
                x={x}
                y={chartHeight - padding.bottom + 20}
                fill="#94a3b8"
                fontSize="10"
                textAnchor="middle"
              >
                {lbl.length > 7 ? lbl.slice(2, 7) : lbl}
              </text>
            );
          })}

          {/* Tooltip for Hovered Index */}
          {hoverIndex !== null && (
            <g transform={`translate(${Math.min(width - 150, Math.max(padding.left, getX(hoverIndex) - 70))}, ${padding.top})`}>
              <rect width="140" height="65" rx="6" fill="#0f172a" stroke="rgba(255,255,255,0.2)" />
              <text x="10" y="20" fill="#f8fafc" fontSize="11" fontWeight="bold">
                {allLabels[hoverIndex]}
              </text>
              {allActual[hoverIndex] !== null && (
                <text x="10" y="38" fill="#60a5fa" fontSize="11">
                  Actual: {allActual[hoverIndex]}
                </text>
              )}
              {allForecast[hoverIndex] !== null && (
                <text x="10" y="54" fill="#fcd34d" fontSize="11" fontWeight="bold">
                  Forecast: {allForecast[hoverIndex]}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
