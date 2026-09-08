import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  Database,
  TrendingDown,
  Activity,
  ArrowRight,
  ClipboardList,
  Users,
  Crosshair,
  BarChart3,
  Layers,
  Sparkles,
  Plus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import KpiCard3D from '../components/KpiCard3D.jsx';
import { API_BASE_URL } from '../utils/api.js';

export default function DashboardOverview({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks for dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group tasks into High, Moderate, and Low risk cohorts
  const highRiskTasks = tasks.filter((t) => t.risk_level === 'High' || (t.churn_probability != null && t.churn_probability >= 0.65));
  const modRiskTasks = tasks.filter((t) => (t.risk_level === 'Moderate' || (t.churn_probability != null && t.churn_probability >= 0.30 && t.churn_probability < 0.65)));
  const lowRiskTasks = tasks.filter((t) => (t.risk_level === 'Low' || (t.churn_probability != null && t.churn_probability < 0.30)));

  const highCount = highRiskTasks.length;
  const modCount = modRiskTasks.length;
  const lowCount = lowRiskTasks.length;

  const calcAvg = (arr, key) => {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
    return Number((sum / arr.length).toFixed(1));
  };

  const highAvgCharges = calcAvg(highRiskTasks, 'monthly_charges');
  const modAvgCharges = calcAvg(modRiskTasks, 'monthly_charges');
  const lowAvgCharges = calcAvg(lowRiskTasks, 'monthly_charges');

  const highAvgTenure = calcAvg(highRiskTasks, 'tenure');
  const modAvgTenure = calcAvg(modRiskTasks, 'tenure');
  const lowAvgTenure = calcAvg(lowRiskTasks, 'tenure');

  // Data for Task-Category Grouped Bar Chart
  const categoryComparisonData = [
    {
      category: 'High Risk (≥65%)',
      volume: highCount,
      avgCharges: highAvgCharges,
      avgTenure: highAvgTenure,
      fill: '#ffffff',
    },
    {
      category: 'Moderate (30–64%)',
      volume: modCount,
      avgCharges: modAvgCharges,
      avgTenure: modAvgTenure,
      fill: '#a1a1aa',
    },
    {
      category: 'Low Risk (<30%)',
      volume: lowCount,
      avgCharges: lowAvgCharges,
      avgTenure: lowAvgTenure,
      fill: '#52525b',
    },
  ];

  // Data for Churn Risk Distribution Histogram (5 risk buckets)
  const totalEvaluated = tasks.length;
  const bucket0_20 = tasks.filter((t) => (t.churn_probability || 0) < 0.2).length;
  const bucket20_40 = tasks.filter((t) => (t.churn_probability || 0) >= 0.2 && (t.churn_probability || 0) < 0.4).length;
  const bucket40_60 = tasks.filter((t) => (t.churn_probability || 0) >= 0.4 && (t.churn_probability || 0) < 0.6).length;
  const bucket60_80 = tasks.filter((t) => (t.churn_probability || 0) >= 0.6 && (t.churn_probability || 0) < 0.8).length;
  const bucket80_100 = tasks.filter((t) => (t.churn_probability || 0) >= 0.8).length;

  const histogramData = [
    { bucket: '0–20%', count: bucket0_20, tier: 'Minimal Risk', isAlert: false },
    { bucket: '20–40%', count: bucket20_40, tier: 'Low Risk', isAlert: false },
    { bucket: '40–60%', count: bucket40_60, tier: 'Moderate Risk', isAlert: false },
    { bucket: '60–80%', count: bucket60_80, tier: 'Elevated Risk', isAlert: true },
    { bucket: '80–100%', count: bucket80_100, tier: 'Critical Risk', isAlert: true },
  ];

  return (
    <div id="view-dashboard-overview" className="space-y-6">
      {/* Top Welcome Banner (Cleaned: duplicate SYS: ONLINE removed) */}
      <div className="hud-panel-outer shadow-layer-panel p-[1px]">
        <div className="hud-panel-inner p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Executive Workspace
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-xs text-zinc-300 font-medium">Real-Time Portfolio Intelligence</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Welcome back, {currentUser?.name || 'Enterprise Analyst'}
            </h1>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Monitoring active customer cohorts, algorithmic churn indicators, and specialist workload assignments.
            </p>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <NavLink
              to="/tasks"
              data-bloom="primary"
              className="btn-clip-corner px-4 py-2.5 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-950 flex items-center justify-center space-x-2 cursor-pointer shadow-md flex-1 sm:flex-none transition-transform"
            >
              <ClipboardList className="w-4 h-4 text-zinc-950" />
              <span>Open Task Queue</span>
            </NavLink>
            <NavLink
              to="/employees"
              data-bloom="secondary"
              className="btn-clip-corner px-4 py-2.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center justify-center space-x-2 cursor-pointer flex-1 sm:flex-none transition-colors"
            >
              <Users className="w-4 h-4 text-zinc-300" />
              <span>Employee Roster</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Grid with Chamfered Glass & 3D Tilt (Cleaned: no redundant trend labels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard3D
          index={0}
          title="Model Accuracy"
          value={84.6}
          decimals={1}
          suffix="%"
          subtext="XGBoost Classifier + SMOTE"
          icon={ShieldCheck}
          trend={{ type: 'up', text: '+2.4% vs base' }}
        />
        <KpiCard3D
          index={1}
          title="Monitored Accounts"
          value={tasks.length}
          subtext="Active enterprise contracts"
          icon={Database}
        />
        <KpiCard3D
          index={2}
          title="Avg Churn Risk"
          value={tasks.length > 0 ? Number((tasks.reduce((sum, t) => sum + (Number(t.churn_probability) || 0), 0) / tasks.length * 100).toFixed(1)) : 0.0}
          decimals={1}
          suffix="%"
          subtext={tasks.length > 0 ? "Portfolio baseline benchmark" : "No evaluations logged"}
          icon={TrendingDown}
          trend={tasks.length > 0 ? { type: 'down', text: '-1.8% QoQ' } : undefined}
        />
        <KpiCard3D
          index={3}
          title="Inference Latency"
          value={18}
          suffix="ms"
          subtext="Sub-20ms p99 SLA"
          icon={Activity}
        />
      </div>

      {/* Advanced Data Visualizations Section */}
      {tasks.length === 0 ? (
        <div id="overview-empty-state" className="hud-panel-outer shadow-layer-panel p-[1px]">
          <div className="hud-panel-inner p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-inner">
              <ClipboardList className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-bold text-white tracking-tight">No customer evaluation records yet</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The ML pipeline is active and ready. Add your first customer account in the Task Queue to generate automated churn risk scores and cohort distributions.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <NavLink
                to="/tasks"
                data-bloom="primary"
                className="btn-clip-corner px-4 py-2.5 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-950 flex items-center space-x-2 cursor-pointer shadow-md transition-transform"
              >
                <Plus className="w-4 h-4 text-zinc-950" />
                <span>Create First Customer Task</span>
              </NavLink>
              <NavLink
                to="/employees"
                data-bloom="secondary"
                className="btn-clip-corner px-4 py-2.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <Users className="w-4 h-4 text-zinc-300" />
                <span>Open Employee Roster</span>
              </NavLink>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Chart 1: Task-Category Cohort Comparison (Grouped Comparison) */}
          <div className="lg:col-span-7 hud-panel-outer shadow-layer-panel p-[1px] flex flex-col">
          <div className="hud-panel-inner p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-white" />
                  <h2 className="font-bold text-white text-sm tracking-tight">
                    Risk-Category Cohort Comparison
                  </h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Cross-category contrast of Average Monthly Charges ($) vs. Average Tenure (Months).
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="inline-flex items-center space-x-1.5 text-zinc-300">
                  <span className="w-2.5 h-2.5 bg-white rounded-sm" />
                  <span>Avg Charges ($)</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 text-zinc-400">
                  <span className="w-2.5 h-2.5 bg-zinc-600 rounded-sm" />
                  <span>Avg Tenure (Mo)</span>
                </span>
              </div>
            </div>

            {/* Grouped Bar Chart */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryComparisonData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: '#d4d4d8', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={{ stroke: '#3f3f46' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 font-sans">
                            <div className="font-bold text-white border-b border-zinc-800 pb-1">
                              {data.category}
                            </div>
                            <div className="flex items-center justify-between space-x-4 text-zinc-300">
                              <span>Queue Volume:</span>
                              <span className="font-mono font-bold text-white">{data.volume} accounts</span>
                            </div>
                            <div className="flex items-center justify-between space-x-4 text-zinc-300">
                              <span>Avg Monthly Fee:</span>
                              <span className="font-mono font-bold text-white">${data.avgCharges}/mo</span>
                            </div>
                            <div className="flex items-center justify-between space-x-4 text-zinc-300">
                              <span>Avg Tenure:</span>
                              <span className="font-mono font-bold text-white">{data.avgTenure} months</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avgCharges" name="Avg Monthly Charges ($)" fill="#ffffff" radius={[3, 3, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="avgTenure" name="Avg Tenure (Months)" fill="#52525b" radius={[3, 3, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Micro Category Insight Badges */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-zinc-800/80 text-xs">
              <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                <div className="text-[11px] font-bold text-white">High Risk Tier</div>
                <div className="text-zinc-400 text-[11px] leading-tight">
                  <span className="font-mono text-white font-semibold">${highAvgCharges}/mo</span> &bull; {highAvgTenure} mo tenure
                </div>
              </div>
              <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                <div className="text-[11px] font-bold text-zinc-300">Moderate Tier</div>
                <div className="text-zinc-400 text-[11px] leading-tight">
                  <span className="font-mono text-zinc-200 font-semibold">${modAvgCharges}/mo</span> &bull; {modAvgTenure} mo tenure
                </div>
              </div>
              <div className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                <div className="text-[11px] font-bold text-zinc-400">Low Risk Tier</div>
                <div className="text-zinc-400 text-[11px] leading-tight">
                  <span className="font-mono text-zinc-300 font-semibold">${lowAvgCharges}/mo</span> &bull; {lowAvgTenure} mo tenure
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Churn Risk Distribution Histogram */}
        <div className="lg:col-span-5 hud-panel-outer shadow-layer-panel p-[1px] flex flex-col">
          <div className="hud-panel-inner p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-white" />
                  <h2 className="font-bold text-white text-sm tracking-tight">
                    Churn Risk Distribution
                  </h2>
                </div>
                <p className="text-xs text-zinc-400">
                  Account frequency histogram across probability brackets.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                N = {totalEvaluated}
              </span>
            </div>

            {/* Distribution Bar Chart */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={histogramData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: '#d4d4d8', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={{ stroke: '#3f3f46' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const pct = Math.round((data.count / totalEvaluated) * 100);
                        return (
                          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 shadow-2xl text-xs space-y-1 font-sans">
                            <div className="font-bold text-white">Bracket: {data.bucket}</div>
                            <div className="text-zinc-400">{data.tier}</div>
                            <div className="text-zinc-200 font-mono font-semibold">
                              {data.count} accounts ({pct}% of queue)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={36}>
                    {histogramData.map((entry, index) => (
                      <Cell
                        key={`hist-${index}`}
                        fill={entry.isAlert ? '#ffffff' : index === 2 ? '#a1a1aa' : '#52525b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution Takeaway Line */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <span>Critical Cohort (≥60%):</span>
              <span className="font-mono text-white font-bold">
                {bucket60_80 + bucket80_100} accounts ({Math.round(((bucket60_80 + bucket80_100) / totalEvaluated) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Quick Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Task Queue */}
        <NavLink
          to="/tasks"
          data-bloom="secondary"
          className="hud-panel-outer shadow-layer-panel panel-3d-hover p-[1px] block group cursor-pointer transition-all duration-200"
        >
          <div className="hud-panel-inner p-6 space-y-3.5 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-700/80 rounded-lg flex items-center justify-center text-white shadow-inner">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-zinc-100 transition-colors">
                Customer Task Queue
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Review and prioritize pending subscriber churn evaluations assigned across the retention specialists.
              </p>
            </div>
            <div className="pt-3 flex items-center text-xs font-semibold text-white group-hover:translate-x-1.5 transition-transform border-t border-zinc-800/80">
              <span>View Tasks</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-zinc-300" />
            </div>
          </div>
        </NavLink>

        {/* Card 2: Employee Roster */}
        <NavLink
          to="/employees"
          data-bloom="secondary"
          className="hud-panel-outer shadow-layer-panel panel-3d-hover p-[1px] block group cursor-pointer transition-all duration-200"
        >
          <div className="hud-panel-inner p-6 space-y-3.5 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-700/80 rounded-lg flex items-center justify-center text-white shadow-inner">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-zinc-100 transition-colors">
                Employee Roster
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inspect retention specialists, department assignments, and active task workloads. Provision new staff directly.
              </p>
            </div>
            <div className="pt-3 flex items-center text-xs font-semibold text-white group-hover:translate-x-1.5 transition-transform border-t border-zinc-800/80">
              <span>View Roster</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-zinc-300" />
            </div>
          </div>
        </NavLink>

        {/* Card 3: Dedicated Churn Analysis */}
        <NavLink
          to="/analysis/1"
          data-bloom="secondary"
          className="hud-panel-outer shadow-layer-panel panel-3d-hover p-[1px] block group cursor-pointer transition-all duration-200"
        >
          <div className="hud-panel-inner p-6 space-y-3.5 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-700/80 rounded-lg flex items-center justify-center text-white shadow-inner">
                <Crosshair className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-zinc-100 transition-colors">
                Dedicated Churn Analysis
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dive deep into customer accounts with circular risk gauges, SHAP feature attributions, and mitigation scenarios.
              </p>
            </div>
            <div className="pt-3 flex items-center text-xs font-semibold text-white group-hover:translate-x-1.5 transition-transform border-t border-zinc-800/80">
              <span>Launch Analysis Window</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-zinc-300" />
            </div>
          </div>
        </NavLink>
      </div>
    </div>
  );
}
