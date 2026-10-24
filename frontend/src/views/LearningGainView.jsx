import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3, Activity, Target, RefreshCw } from 'lucide-react';
import { authFetch } from '../api';

const SAMPLE_GAIN_DATA = [
  { topic: 'Time Series', pre: 42, post: 78, gain: 36 },
  { topic: 'ADF Test', pre: 35, post: 69, gain: 34 },
  { topic: 'ACF/PACF', pre: 48, post: 82, gain: 34 },
  { topic: 'ARIMA', pre: 30, post: 71, gain: 41 },
  { topic: 'Forecasting', pre: 55, post: 88, gain: 33 },
];

const SAMPLE_TREND = [
  { session: 'Wk 1', mastery: 38 },
  { session: 'Wk 2', mastery: 52 },
  { session: 'Wk 3', mastery: 61 },
  { session: 'Wk 4', mastery: 68 },
  { session: 'Wk 5', mastery: 74 },
  { session: 'Wk 6', mastery: 79 },
];

const RADAR_DATA = [
  { metric: 'Mastery', value: 74 },
  { metric: 'Learning Gain', value: 68 },
  { metric: 'Retention', value: 81 },
  { metric: 'AI Independence', value: 62 },
  { metric: 'Completion', value: 88 },
];

const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontSize: '0.8rem',
  color: 'var(--color-text)',
  boxShadow: 'var(--shadow-md)',
};

export default function LearningGainView({ currentUser }) {
  const [gainData, setGainData] = useState(SAMPLE_GAIN_DATA);
  const [trendData, setTrendData] = useState(SAMPLE_TREND);
  const [loading, setLoading] = useState(false);

  const avgGain = Math.round(gainData.reduce((a, d) => a + d.gain, 0) / gainData.length);
  const avgPost = Math.round(gainData.reduce((a, d) => a + d.post, 0) / gainData.length);
  const avgPre = Math.round(gainData.reduce((a, d) => a + d.pre, 0) / gainData.length);

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchGain = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/journey/dashboard/${currentUser.id}`);
        const data = await res.json();
        if (data.attempts_history?.length > 0) {
          const mapped = data.attempts_history.map(h => ({
            topic: h.topic_name?.slice(0, 12) || 'Topic',
            pre: Math.round(h.pre_score_pct || 0),
            post: Math.round(h.post_score_pct || 0),
            gain: Math.round(h.score_gain_pct || 0),
          }));
          setGainData(mapped.length ? mapped : SAMPLE_GAIN_DATA);

          const trend = data.attempts_history.map((h, i) => ({
            session: `Sess ${i + 1}`,
            mastery: Math.round(h.post_score_pct || 0),
          }));
          setTrendData(trend.length ? trend : SAMPLE_TREND);
        }
      } catch {
        // keep sample data
      } finally {
        setLoading(false);
      }
    };
    fetchGain();
  }, [currentUser?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="glass-panel-glow" style={{ padding: '22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <TrendingUp size={20} color="var(--color-ok)" />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Learning Gain Analytics
          </h2>
          {loading && <RefreshCw size={15} className="animate-spin" color="var(--color-text-3)" />}
        </div>
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.88rem' }}>
          Pre vs. post quiz score comparison per topic, mastery growth trends, and multi-dimensional performance radar.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Avg Learning Gain', value: `+${avgGain}%`, color: 'var(--color-ok)', icon: TrendingUp },
          { label: 'Avg Pre-Quiz Score', value: `${avgPre}%`, color: 'var(--color-student)', icon: Target },
          { label: 'Avg Post-Quiz Score', value: `${avgPost}%`, color: 'var(--color-accent)', icon: BarChart3 },
          { label: 'Topics Tracked', value: gainData.length, color: 'var(--color-dean)', icon: Activity },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="stat-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <Icon size={15} color={color} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Pre vs Post Bar Chart */}
        <div className="card" style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, paddingLeft: 8 }}>
            Pre vs Post Quiz Scores
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gainData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis dataKey="topic" tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              <Bar dataKey="pre" name="Pre-Quiz" fill="var(--color-student)" radius={[3, 3, 0, 0]} opacity={0.7} />
              <Bar dataKey="post" name="Post-Quiz" fill="var(--color-ok)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <caption style={{ textAlign: 'left', color: 'var(--color-text-3)', padding: '4px 8px' }}>Accessible data: pre- and post-quiz scores by topic</caption>
              <thead><tr>{['Topic', 'Pre-quiz', 'Post-quiz'].map(label => <th key={label} scope="col" style={{ textAlign: 'left', padding: 8, color: 'var(--color-text-3)' }}>{label}</th>)}</tr></thead>
              <tbody>{gainData.map(item => <tr key={item.topic}><th scope="row" style={{ textAlign: 'left', padding: 8, color: 'var(--color-text-2)' }}>{item.topic}</th><td style={{ padding: 8 }}>{item.pre}%</td><td style={{ padding: 8 }}>{item.post}%</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        {/* Mastery Trend Line */}
        <div className="card" style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, paddingLeft: 8 }}>
            Mastery Progression Over Time
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid stroke="var(--color-border)" />
              <XAxis dataKey="session" tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={75} stroke="var(--color-ok)" strokeWidth={1} label={{ value: 'Target', fill: 'var(--color-text-3)', fontSize: 10 }} />
              <Line type="monotone" dataKey="mastery" stroke="var(--color-accent)" strokeWidth={2} dot={{ fill: 'var(--color-accent)', stroke: 'var(--color-surface)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Mastery %" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <caption style={{ textAlign: 'left', color: 'var(--color-text-3)', padding: '4px 8px' }}>Accessible data: mastery by session</caption>
              <thead><tr>{['Session', 'Mastery'].map(label => <th key={label} scope="col" style={{ textAlign: 'left', padding: 8, color: 'var(--color-text-3)' }}>{label}</th>)}</tr></thead>
              <tbody>{trendData.map(item => <tr key={item.session}><th scope="row" style={{ textAlign: 'left', padding: 8, color: 'var(--color-text-2)' }}>{item.session}</th><td style={{ padding: 8 }}>{item.mastery}%</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Gain bar */}
        <div className="card" style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, paddingLeft: 8 }}>
            Learning Gain by Topic
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gainData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" domain={[0, 60]} tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} />
              <YAxis type="category" dataKey="topic" tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} width={70} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`+${v}%`, 'Learning Gain']} />
              <Bar dataKey="gain" name="Learning Gain" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="card" style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, paddingLeft: 8 }}>
            Performance Radar
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--color-text-3)' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--color-text-3)' }} tickCount={4} />
              <Radar name="You" dataKey="value" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.18} strokeWidth={2} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
