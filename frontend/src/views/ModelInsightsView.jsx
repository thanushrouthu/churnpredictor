import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Layers,
  Database,
  ShieldCheck,
  TrendingUp,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Cpu,
  BarChart3,
  GitBranch,
  Info,
  ChevronRight,
  Target,
  Scale,
  Grid2x2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import KpiCard3D from '../components/KpiCard3D.jsx';
import CountUp from '../components/CountUp.jsx';
import BloomButton from '../components/BloomButton.jsx';
import { API_BASE_URL } from '../utils/api.js';

export default function ModelInsightsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' | 'shap' | 'eda' | 'methodology'
  const [selectedThreshold, setSelectedThreshold] = useState(0.50);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/model/insights`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to load insights (status: ${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching model insights:', err);
      setError(err.message || 'Unable to retrieve insights from backend.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
          <Brain className="w-6 h-6 text-white absolute inset-0 m-auto" />
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-white tracking-wide">Loading Model Insights...</div>
          <div className="text-xs text-zinc-400 mt-1">Retrieving audited metrics, PR curve, and SHAP portfolio attributions</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-red-950/50 border border-red-800 rounded-full flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Failed to Load Model Insights</h2>
        <p className="text-xs text-zinc-400">{error || 'Unknown server response'}</p>
        <BloomButton variant="secondary" onClick={fetchInsights} className="px-4 py-2 text-xs">
          Retry Audit Retrieval
        </BloomButton>
      </div>
    );
  }

  const { eda, preprocessing, class_imbalance, architecture, evaluation, feature_importance } = data;
  const metrics = evaluation.metrics;
  const prCurve = evaluation.precision_recall_curve || [];
  const top5Drivers = feature_importance.top_5_portfolio_drivers || [];

  // Selected threshold trade-off data
  const currentTradeoff =
    evaluation.threshold_tradeoffs.find((t) => Math.abs(t.threshold - selectedThreshold) < 0.001) ||
    evaluation.threshold_tradeoffs[2]; // Default to 0.50

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800/90">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white">
              <Brain className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Enterprise ML Architecture & Methodology
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Model Insights & Portfolio Analytics
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl mt-1 leading-relaxed">
            Rigorous evaluation of our calibrated gradient-boosted ensemble across 440,832 training and 64,374 test records.
            Demonstrates data preprocessing, imbalance remediation, test set precision-recall trade-offs, and global SHAP interpretability.
          </p>
        </div>

        {/* System Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-xs font-mono text-zinc-200">XGBoost 2.1.4</span>
          </div>
          <div className="px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-xs font-mono text-zinc-200">Platt Calibrated</span>
          </div>
          <div className="px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-xs font-mono text-zinc-200">64,374 Holdout Test</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 p-1 bg-zinc-900/70 border border-zinc-800/90 rounded-xl overflow-x-auto">
        <button
          id="btn-tab-performance"
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'performance'
              ? 'bg-white text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Test Evaluation & PR Curve</span>
        </button>

        <button
          id="btn-tab-shap"
          type="button"
          onClick={() => setActiveTab('shap')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'shap'
              ? 'bg-white text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Top 5 SHAP Portfolio Drivers</span>
        </button>

        <button
          id="btn-tab-eda"
          type="button"
          onClick={() => setActiveTab('eda')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'eda'
              ? 'bg-white text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Exploratory Data Analysis</span>
        </button>

        <button
          id="btn-tab-methodology"
          type="button"
          onClick={() => setActiveTab('methodology')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'methodology'
              ? 'bg-white text-zinc-950 shadow-md font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pipeline & Architecture</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: REQUIREMENT 5 - MODEL PERFORMANCE & PR CURVE                 */}
      {/* ==================================================================== */}
      {activeTab === 'performance' && (
        <div className="space-y-8">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard3D
              title="ROC-AUC Score"
              value={metrics.roc_auc}
              decimals={4}
              subtext="Holdout test discriminative capacity (Random = 0.50)"
              icon={Target}
              badge={{ text: '+0.247 vs Baseline', type: 'up' }}
              index={0}
            />
            <KpiCard3D
              title="Holdout Recall"
              value={metrics.recall_pct}
              suffix="%"
              decimals={2}
              subtext="22,729 of 30,493 churners successfully identified"
              icon={Activity}
              badge={{ text: '74.5% Detection', type: 'up' }}
              index={1}
            />
            <KpiCard3D
              title="Holdout Precision"
              value={metrics.precision_pct}
              suffix="%"
              decimals={2}
              subtext="True churn positive rate at 0.50 threshold"
              icon={TrendingUp}
              badge={{ text: 'Controlled FP', type: 'neutral' }}
              index={2}
            />
            <KpiCard3D
              title="Overall Accuracy"
              value={metrics.accuracy_pct}
              suffix="%"
              decimals={2}
              subtext="42,812 correct predictions on 64,374 test set"
              icon={ShieldCheck}
              badge={{ text: '66.5% Accuracy', type: 'neutral' }}
              index={3}
            />
          </div>

          {/* Secondary Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-mono uppercase">PR-AUC (Area Under PR)</div>
              <div className="text-xl font-bold font-mono text-white mt-1">{metrics.pr_auc}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Prevalence baseline: {evaluation.baseline_churn_rate_pct}%</div>
            </div>
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-mono uppercase">F1-Score</div>
              <div className="text-xl font-bold font-mono text-white mt-1">{metrics.f1_score}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Harmonic mean of precision & recall</div>
            </div>
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-mono uppercase">Brier Score (Calibrated)</div>
              <div className="text-xl font-bold font-mono text-white mt-1">{metrics.brier_score}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {evaluation.calibration_audit.brier_improvement_pct}% better than uncalibrated ({evaluation.calibration_audit.uncalibrated_brier})
              </div>
            </div>
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-mono uppercase">False Positive Rate (FPR)</div>
              <div className="text-xl font-bold font-mono text-white mt-1">{metrics.fpr_pct}%</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Controlled vs 93.13% under SMOTE</div>
            </div>
          </div>

          {/* Interactive Precision-Recall Curve & 2x2 Confusion Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PR Curve Chart */}
            <div className="lg:col-span-7 hud-panel-outer p-[1px]">
              <div className="hud-panel-inner p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Target className="w-4 h-4 text-white" />
                      <span>Precision-Recall Curve (Holdout Test Set)</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Evaluated on 64,374 real holdout samples. PR-AUC = {metrics.pr_auc}.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="flex items-center space-x-1.5 text-zinc-300">
                      <span className="w-2.5 h-0.5 bg-white inline-block" />
                      <span>XGBoost</span>
                    </span>
                    <span className="flex items-center space-x-1.5 text-zinc-400">
                      <span className="w-2.5 h-0.5 bg-zinc-600 inline-block border-t border-dashed" />
                      <span>Baseline ({evaluation.baseline_churn_rate_pct}%)</span>
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={prCurve}
                      margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="prGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="recall"
                        type="number"
                        domain={[0, 1]}
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={{ stroke: '#3f3f46' }}
                        label={{ value: 'Recall (Churn Detection Rate)', position: 'insideBottom', offset: -10, fill: '#71717a', fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="precision"
                        type="number"
                        domain={[0.4, 1.0]}
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={{ stroke: '#3f3f46' }}
                        label={{ value: 'Precision', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 11 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const pt = payload[0].payload;
                            return (
                              <div className="bg-zinc-900/95 border border-zinc-700 p-3 rounded-lg shadow-xl backdrop-blur-md text-xs font-mono space-y-1">
                                <div className="text-white font-bold">PR Operating Point</div>
                                <div className="text-zinc-300">Recall: <span className="text-white">{(pt.recall * 100).toFixed(1)}%</span></div>
                                <div className="text-zinc-300">Precision: <span className="text-white">{(pt.precision * 100).toFixed(1)}%</span></div>
                                <div className="text-zinc-400">Threshold: {pt.threshold}</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine
                        y={evaluation.baseline_churn_rate_pct / 100}
                        stroke="#52525b"
                        strokeDasharray="4 4"
                        label={{ value: `Baseline (${evaluation.baseline_churn_rate_pct}%)`, fill: '#71717a', fontSize: 10, position: 'right' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="precision"
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#prGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="text-[11px] text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/70 leading-relaxed">
                  <span className="font-semibold text-zinc-200">Engineering Interpretation: </span>
                  At the operational 0.50 cutoff, the model operates at 74.54% Recall and 62.23% Precision, substantially outperforming the 47.37% random baseline. Enterprise retention teams can adjust the decision threshold depending on intervention unit costs.
                </div>
              </div>
            </div>

            {/* 2x2 Confusion Matrix Card */}
            <div className="lg:col-span-5 hud-panel-outer p-[1px]">
              <div className="hud-panel-inner p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Grid2x2 className="w-4 h-4 text-white" />
                      <span>2x2 Confusion Matrix</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Threshold: {selectedThreshold.toFixed(2)}</p>
                  </div>

                  {/* Threshold Selector */}
                  <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
                    {[0.30, 0.40, 0.50, 0.60, 0.70].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => setSelectedThreshold(th)}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded cursor-pointer transition-colors ${
                          selectedThreshold === th
                            ? 'bg-white text-zinc-950 font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {th.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matrix Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* True Negatives */}
                  <div className="p-3.5 bg-zinc-900/80 border border-zinc-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>True Negative (TN)</span>
                      <span className="text-emerald-400 font-bold">Retained</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {currentTradeoff.tn.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400">Correctly classified loyal accounts</div>
                  </div>

                  {/* False Positives */}
                  <div className="p-3.5 bg-zinc-900/80 border border-zinc-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>False Positive (FP)</span>
                      <span className="text-amber-400 font-bold">Type I</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {currentTradeoff.fp.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400">Retained flagged as churn</div>
                  </div>

                  {/* False Negatives */}
                  <div className="p-3.5 bg-zinc-900/80 border border-zinc-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>False Negative (FN)</span>
                      <span className="text-rose-400 font-bold">Type II</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {currentTradeoff.fn.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400">Churned customers missed</div>
                  </div>

                  {/* True Positives */}
                  <div className="p-3.5 bg-zinc-900/80 border border-zinc-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>True Positive (TP)</span>
                      <span className="text-emerald-400 font-bold">Caught</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {currentTradeoff.tp.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-400">Churned customers captured</div>
                  </div>
                </div>

                {/* Operating Point Metrics */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Operating Precision:</span>
                    <span className="font-mono font-bold text-white">{currentTradeoff.precision}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Operating Recall:</span>
                    <span className="font-mono font-bold text-white">{currentTradeoff.recall}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Operating F1-Score:</span>
                    <span className="font-mono font-bold text-white">{currentTradeoff.f1}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calibration Audit Table: Before vs After */}
          <div className="hud-panel-outer p-[1px]">
            <div className="hud-panel-inner p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-white" />
                    <span>Probability Calibration Audit: Raw XGBoost vs Platt Calibrated</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Demonstrates empirical reliability improvement on holdout test set.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-zinc-900 border border-zinc-800 font-mono text-emerald-400 rounded-md">
                  +{evaluation.calibration_audit.brier_improvement_pct}% Brier Gain
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Pipeline State</th>
                      <th className="py-2.5 px-3">Brier Score</th>
                      <th className="py-2.5 px-3">False Positive Rate (FPR)</th>
                      <th className="py-2.5 px-3">Probability Distribution</th>
                      <th className="py-2.5 px-3">Operational Readiness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    <tr className="text-zinc-400">
                      <td className="py-3 px-3 font-semibold text-zinc-300">Raw XGBoost (Uncalibrated)</td>
                      <td className="py-3 px-3 text-amber-400">{evaluation.calibration_audit.uncalibrated_brier}</td>
                      <td className="py-3 px-3">{evaluation.calibration_audit.uncalibrated_fpr_pct}%</td>
                      <td className="py-3 px-3">Extreme sigmoid saturation (probabilities cluster near 0.0 or 1.0)</td>
                      <td className="py-3 px-3 text-amber-400 font-sans">Distorted Confidence</td>
                    </tr>
                    <tr className="bg-white/5 text-white">
                      <td className="py-3 px-3 font-bold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Platt Calibrated XGBoost (Active)</span>
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">{evaluation.calibration_audit.calibrated_brier}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">{evaluation.calibration_audit.calibrated_fpr_pct}%</td>
                      <td className="py-3 px-3">Well-calibrated logit mapping ({architecture.calibration_parameters.formula})</td>
                      <td className="py-3 px-3 text-emerald-400 font-sans font-bold">Production Ready</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: REQUIREMENT 6 - GLOBAL SHAP PORTFOLIO DRIVERS                 */}
      {/* ==================================================================== */}
      {activeTab === 'shap' && (
        <div className="space-y-8">
          {/* Top 5 Portfolio Drivers Section */}
          <div className="hud-panel-outer p-[1px]">
            <div className="hud-panel-inner p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-white" />
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Top 5 Drivers of Customer Churn — Portfolio-Wide
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Computed via SHAP TreeExplainer across test cohort. Features ranked by mean absolute SHAP value:
                    E[|SHAP|].
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                  <span className="text-zinc-400">Method:</span>
                  <span className="text-white font-semibold">Exact TreeSHAP (Lundberg et al.)</span>
                </div>
              </div>

              {/* Horizontal Bar Chart of Top 5 Drivers */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top5Drivers}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 140, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                    <XAxis
                      type="number"
                      domain={[0, 'auto']}
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={{ stroke: '#3f3f46' }}
                      tickLine={{ stroke: '#3f3f46' }}
                      label={{ value: 'Mean |SHAP Value| (Impact on Model Margin)', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      tick={{ fill: '#e4e4e7', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#3f3f46' }}
                      tickLine={false}
                      width={135}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-zinc-900/95 border border-zinc-700 p-3 rounded-lg shadow-xl backdrop-blur-md text-xs font-mono space-y-1">
                              <div className="text-white font-bold">Rank #{item.rank}: {item.feature}</div>
                              <div className="text-zinc-300">Mean |SHAP|: <span className="text-white font-bold">{item.mean_abs_shap}</span></div>
                              <div className="text-zinc-400 text-[11px] mt-1 font-sans">
                                {feature_importance.interpretability_narrative[item.rank - 1]}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="mean_abs_shap" radius={[0, 4, 4, 0]}>
                      {top5Drivers.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={idx === 0 ? '#ffffff' : idx === 1 ? '#e4e4e7' : idx === 2 ? '#a1a1aa' : idx === 3 ? '#71717a' : '#52525b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 5 Narrative Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {top5Drivers.map((driver, index) => (
                  <div
                    key={driver.feature}
                    className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-zinc-800 text-white rounded font-bold">
                        #{driver.rank} Global Driver
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        {driver.mean_abs_shap} |SHAP|
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{driver.feature}</div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {feature_importance.interpretability_narrative[index]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Feature Importance Ranking Table */}
          <div className="hud-panel-outer p-[1px]">
            <div className="hud-panel-inner p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-white" />
                <span>Complete 15-Feature SHAP Attributions (Full Model Portfolio)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Encoded Feature</th>
                      <th className="py-2.5 px-3">Mean |SHAP|</th>
                      <th className="py-2.5 px-3">Feature Impact Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {feature_importance.all_ranked_features.map((feat) => (
                      <tr key={feat.feature} className={feat.rank <= 5 ? 'bg-white/5 text-white' : 'text-zinc-400'}>
                        <td className="py-2.5 px-3 font-bold">#{feat.rank}</td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-200">{feat.feature}</td>
                        <td className="py-2.5 px-3 font-bold">{feat.mean_abs_shap}</td>
                        <td className="py-2.5 px-3 font-sans">
                          {feat.rank === 1 && <span className="text-white font-semibold">Primary Risk Escalator</span>}
                          {feat.rank === 2 && <span className="text-zinc-300 font-semibold">Primary Retention Anchor</span>}
                          {feat.rank === 3 && <span className="text-zinc-300 font-semibold">Financial Friction Indicator</span>}
                          {feat.rank === 4 && <span className="text-zinc-400 font-semibold">Contractual Lock-In Barrier</span>}
                          {feat.rank === 5 && <span className="text-zinc-400 font-semibold">Demographic Vulnerability</span>}
                          {feat.rank > 5 && <span className="text-zinc-400">Secondary Factor</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: REQUIREMENT 1 - EXPLORATORY DATA ANALYSIS (EDA)                */}
      {/* ==================================================================== */}
      {activeTab === 'eda' && (
        <div className="space-y-8">
          {/* Top Level Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-900/70 border border-zinc-800/90 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-mono uppercase">Dataset Volume</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {eda.total_training_samples.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Total clean records analyzed</div>
            </div>
            <div className="p-4 bg-zinc-900/70 border border-zinc-800/90 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-mono uppercase">Portfolio Baseline Churn</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {eda.overall_train_churn_rate_pct}%
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">249,999 churners / 190,833 retained</div>
            </div>
            <div className="p-4 bg-zinc-900/70 border border-zinc-800/90 rounded-xl">
              <div className="text-[11px] text-zinc-400 font-mono uppercase">Strongest Linear Predictor</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                Support Calls (+0.574)
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Pearson correlation with churn</div>
            </div>
          </div>

          {/* 3 Cohort Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contract Length Chart */}
            <div className="hud-panel-outer p-[1px]">
              <div className="hud-panel-inner p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <h3 className="text-xs font-bold text-white">1. Churn by Contract Length</h3>
                  <span className="text-[10px] font-mono text-zinc-400">Deterministic Rule</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eda.contract_analysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                      <XAxis dataKey="contract" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#3f3f46' }} unit="%" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 border border-zinc-700 p-2.5 rounded text-xs font-mono">
                                <div className="text-white font-bold">{d.contract} Contract</div>
                                <div>Churn Rate: <span className="text-white font-bold">{d.churn_rate_pct}%</span></div>
                                <div className="text-zinc-400">{d.churned_customers.toLocaleString()} / {d.total_customers.toLocaleString()} accounts</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="churn_rate_pct" radius={[4, 4, 0, 0]}>
                        {eda.contract_analysis.map((entry) => (
                          <Cell key={entry.contract} fill={entry.churn_rate_pct > 90 ? '#ffffff' : '#71717a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                  Monthly contract exhibits <span className="text-white font-bold">100.0% churn</span> across 87,104 rows, serving as a hard deterministic threshold in this Kaggle dataset.
                </div>
              </div>
            </div>

            {/* Tenure Buckets Chart */}
            <div className="hud-panel-outer p-[1px]">
              <div className="hud-panel-inner p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <h3 className="text-xs font-bold text-white">2. Churn vs Tenure Buckets</h3>
                  <span className="text-[10px] font-mono text-zinc-400">Lifecycle Risk</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eda.tenure_analysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                      <XAxis dataKey="tenure_bucket" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} />
                      <YAxis domain={[40, 70]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#3f3f46' }} unit="%" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 border border-zinc-700 p-2.5 rounded text-xs font-mono">
                                <div className="text-white font-bold">Tenure: {d.tenure_bucket}</div>
                                <div>Churn Rate: <span className="text-white font-bold">{d.churn_rate_pct}%</span></div>
                                <div className="text-zinc-400">{d.churned_customers.toLocaleString()} / {d.total_customers.toLocaleString()} accounts</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="churn_rate_pct" radius={[4, 4, 0, 0]}>
                        {eda.tenure_analysis.map((entry) => (
                          <Cell key={entry.tenure_bucket} fill={entry.churn_rate_pct > 60 ? '#ffffff' : '#71717a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                  Churn peaks during the <span className="text-white font-bold">12–24 month window (63.27%)</span> as introductory incentives expire, then moderates to 54.18% past 24 months.
                </div>
              </div>
            </div>

            {/* Spend Buckets Chart */}
            <div className="hud-panel-outer p-[1px]">
              <div className="hud-panel-inner p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <h3 className="text-xs font-bold text-white">3. Churn vs Total Spend</h3>
                  <span className="text-[10px] font-mono text-zinc-400">Value Cohorts</span>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eda.spend_analysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                      <XAxis dataKey="spend_bucket" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={{ stroke: '#3f3f46' }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#3f3f46' }} unit="%" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 border border-zinc-700 p-2.5 rounded text-xs font-mono">
                                <div className="text-white font-bold">Spend: {d.spend_bucket}</div>
                                <div>Churn Rate: <span className="text-white font-bold">{d.churn_rate_pct}%</span></div>
                                <div className="text-zinc-400">{d.churned_customers.toLocaleString()} / {d.total_customers.toLocaleString()} accounts</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="churn_rate_pct" radius={[4, 4, 0, 0]}>
                        {eda.spend_analysis.map((entry) => (
                          <Cell key={entry.spend_bucket} fill={entry.churn_rate_pct > 90 ? '#ffffff' : '#71717a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                  Sharp bifurcation: accounts spending &lt;$500 have near 100% churn, while accounts spending &gt;$500 drop to <span className="text-white font-bold">41.2% churn</span>.
                </div>
              </div>
            </div>
          </div>

          {/* 8x8 Feature Correlation Matrix Heatmap */}
          <div className="hud-panel-outer p-[1px]">
            <div className="hud-panel-inner p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-white" />
                    <span>8x8 Numeric Feature Correlation Matrix (Pearson r)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Linear correlations across all 7 numerical features and the binary Churn target.
                  </p>
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-white rounded-sm" />
                    <span className="text-zinc-300">Positive (+r)</span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-zinc-700 rounded-sm" />
                    <span className="text-zinc-400">Negative (-r)</span>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-[10px]">
                      <th className="p-2 text-left">Feature</th>
                      {eda.correlation_matrix.features.map((f) => (
                        <th key={f} className="p-2 truncate max-w-[90px]">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 font-mono text-[11px]">
                    {eda.correlation_matrix.features.map((rowName, rIdx) => (
                      <tr key={rowName} className={rowName === 'Churn' ? 'bg-white/5 font-bold' : ''}>
                        <td className="p-2.5 text-left text-zinc-300 font-semibold whitespace-nowrap">{rowName}</td>
                        {eda.correlation_matrix.values[rIdx].map((val, cIdx) => {
                          const isDiagonal = rIdx === cIdx;
                          const isTarget = rowName === 'Churn' || eda.correlation_matrix.features[cIdx] === 'Churn';
                          const absVal = Math.abs(val);

                          let bgClass = 'bg-zinc-900/40 text-zinc-400';
                          if (isDiagonal) {
                            bgClass = 'bg-zinc-800/80 text-white font-bold';
                          } else if (val > 0.3) {
                            bgClass = 'bg-white text-zinc-950 font-bold';
                          } else if (val > 0.1) {
                            bgClass = 'bg-zinc-700 text-white';
                          } else if (val < -0.3) {
                            bgClass = 'bg-zinc-800 text-zinc-200 border border-zinc-600 font-bold';
                          } else if (val < -0.05) {
                            bgClass = 'bg-zinc-900/80 text-zinc-400';
                          }

                          return (
                            <td key={cIdx} className="p-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] w-14 ${bgClass}`}>
                                {val > 0 ? `+${val.toFixed(3)}` : val.toFixed(3)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Correlation Summary Callout */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 text-xs">
                  <span className="font-bold text-white">Strongest Positive Churn Drivers:</span>
                  <ul className="mt-1 space-y-0.5 text-zinc-400 font-mono text-[11px]">
                    <li>• Support Calls: <span className="text-white font-bold">+0.5743</span></li>
                    <li>• Payment Delay: <span className="text-white font-bold">+0.3121</span></li>
                    <li>• Customer Age: <span className="text-white font-bold">+0.2184</span></li>
                    <li>• Last Interaction: <span className="text-white font-bold">+0.1496</span></li>
                  </ul>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 text-xs">
                  <span className="font-bold text-white">Strongest Protective Retention Anchors:</span>
                  <ul className="mt-1 space-y-0.5 text-zinc-400 font-mono text-[11px]">
                    <li>• Total Spend: <span className="text-white font-bold">-0.4294</span> (Strongest barrier)</li>
                    <li>• Customer Tenure: <span className="text-white font-bold">-0.0519</span></li>
                    <li>• Usage Frequency: <span className="text-white font-bold">-0.0461</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: REQUIREMENTS 2, 3 & 4 - PREPROCESSING, IMBALANCE & ARCHITECTURE*/}
      {/* ==================================================================== */}
      {activeTab === 'methodology' && (
        <div className="space-y-8">
          {/* Requirement 2: Data Preprocessing Architecture */}
          <div className="hud-panel-outer p-[1px]">
            <div className="hud-panel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-white" />
                    <h2 className="text-base font-bold text-white">
                      Data Preprocessing & ColumnTransformer Pipeline
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Orchestrated via Scikit-Learn Pipeline in <code className="text-zinc-200">src/preprocessing.py</code>.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-1 rounded">
                  <span>{preprocessing.input_feature_count} Input Features</span>
                  <span>&rarr;</span>
                  <span className="text-white font-bold">{preprocessing.encoded_feature_count} Encoded Features</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Numerical Pipeline Card */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Numerical Feature Pipeline</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                      7 Features
                    </span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/90 rounded text-zinc-300">
                      <span className="text-zinc-400">1. Imputation: </span>
                      <span className="text-white">{preprocessing.numerical.imputer}</span>
                    </div>
                    <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/90 rounded text-zinc-300">
                      <span className="text-zinc-400">2. Scaling: </span>
                      <span className="text-white">{preprocessing.numerical.scaler}</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">Features: </span>
                    {preprocessing.numerical.features.join(', ')}
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2">
                    {preprocessing.numerical.rationale}
                  </div>
                </div>

                {/* Categorical Pipeline Card */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Categorical Feature Pipeline</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                      3 Features &rarr; 8 Dummies
                    </span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/90 rounded text-zinc-300">
                      <span className="text-zinc-400">1. Imputation: </span>
                      <span className="text-white">{preprocessing.categorical.imputer}</span>
                    </div>
                    <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/90 rounded text-zinc-300">
                      <span className="text-zinc-400">2. Encoding: </span>
                      <span className="text-white">{preprocessing.categorical.encoder}</span>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">Features: </span>
                    {preprocessing.categorical.features.join(', ')}
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2">
                    {preprocessing.categorical.rationale}
                  </div>
                </div>
              </div>

              {/* Data Hygiene Checklist */}
              <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-xs font-bold text-white">Data Hygiene & Leakage Prevention:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {preprocessing.hygiene_steps.map((step, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-zinc-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Requirement 3: Class Imbalance Strategy */}
          <div className="hud-panel-outer p-[1px]">
            <div className="hud-panel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <Scale className="w-4 h-4 text-white" />
                    <h2 className="text-base font-bold text-white">
                      Class Imbalance Strategy & SMOTE Evaluation
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Comparative audit of synthetic resampling vs probability calibration.
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 bg-zinc-900 border border-zinc-800 text-white rounded">
                  Training Ratio: {class_imbalance.train_distribution.ratio}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distribution Overview */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-4">
                  <span className="text-xs font-bold text-white">Empirical Class Distributions</span>
                  
                  {/* Train Distribution */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Training Set (440,832 records)</span>
                      <span className="text-white font-bold">{class_imbalance.train_distribution.churn_pct}% Churn</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${class_imbalance.train_distribution.churn_pct}%` }} className="bg-white h-full" />
                      <div style={{ width: `${class_imbalance.train_distribution.retained_pct}%` }} className="bg-zinc-600 h-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Churned: {class_imbalance.train_distribution.churned.toLocaleString()}</span>
                      <span>Retained: {class_imbalance.train_distribution.retained.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Test Distribution */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Testing Set (64,374 records)</span>
                      <span className="text-white font-bold">{class_imbalance.test_distribution.churn_pct}% Churn</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${class_imbalance.test_distribution.churn_pct}%` }} className="bg-white h-full" />
                      <div style={{ width: `${class_imbalance.test_distribution.retained_pct}%` }} className="bg-zinc-600 h-full" />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Churned: {class_imbalance.test_distribution.churned.toLocaleString()}</span>
                      <span>Retained: {class_imbalance.test_distribution.retained.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* SMOTE Rejection & Production Solution */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">SMOTE Evaluation Verdict</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-950/70 border border-rose-800 text-rose-300 rounded font-bold">
                      SMOTE Rejected
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {class_imbalance.smote_analysis.technical_reason}
                  </p>
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded text-xs space-y-1">
                    <div className="font-semibold text-white">Production Strategy:</div>
                    <div className="text-zinc-400 font-mono text-[11px]">
                      Preserve natural distribution + Post-hoc Platt Sigmoid Scaling (cal_a = {architecture.calibration_parameters.cal_a}, cal_b = {architecture.calibration_parameters.cal_b})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requirement 4: Model Architecture & Hyperparameters */}
          <div className="hud-panel-outer p-[1px]">
            <div className="hud-panel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-white" />
                    <h2 className="text-base font-bold text-white">
                      Model Architecture & Hyperparameter Specifications
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {architecture.model_name} &bull; {architecture.framework}
                  </p>
                </div>
                <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 font-mono text-xs text-white rounded">
                  Artifact: models/churn_pipeline.pkl
                </div>
              </div>

              {/* Hyperparameter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <div className="text-[10px] text-zinc-400">n_estimators</div>
                  <div className="text-lg font-bold text-white mt-0.5">{architecture.hyperparameters.n_estimators}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Sequential boosting iterations</div>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <div className="text-[10px] text-zinc-400">max_depth</div>
                  <div className="text-lg font-bold text-white mt-0.5">{architecture.hyperparameters.max_depth}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Shallow trees prevent overfitting</div>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <div className="text-[10px] text-zinc-400">learning_rate (eta)</div>
                  <div className="text-lg font-bold text-white mt-0.5">{architecture.hyperparameters.learning_rate}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Conservative shrinkage factor</div>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <div className="text-[10px] text-zinc-400">reg_lambda (L2)</div>
                  <div className="text-lg font-bold text-white mt-0.5">{architecture.hyperparameters.reg_lambda}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Heavy leaf weight regularization</div>
                </div>
              </div>

              {/* Justification Points */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-white">Architectural Justification:</span>
                <ul className="space-y-1 text-xs text-zinc-400">
                  {architecture.architectural_justification.map((just, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
                      <span>{just}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
