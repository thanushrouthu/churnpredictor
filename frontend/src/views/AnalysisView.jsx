import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Crosshair,
  Activity,
  RefreshCw,
  User,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Sliders,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import CountUp from '../components/CountUp.jsx';
import BloomButton from '../components/BloomButton.jsx';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://127.0.0.1:8000';

export default function AnalysisView() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [chartTab, setChartTab] = useState('shap'); // 'shap' | 'benchmark'

  const [formData, setFormData] = useState({
    Contract: 'Month-to-month',
    tenure: 3,
    MonthlyCharges: 85.0,
    TotalCharges: 255.0,
    PaperlessBilling: 'Yes',
    PaymentMethod: 'Electronic check',
    InternetService: 'Fiber optic',
    OnlineSecurity: 'No',
    TechSupport: 'No',
    gender: 'Female',
    SeniorCitizen: 0,
    Partner: 'No',
    Dependents: 'No',
  });

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/detail/${taskId || 1}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data);
        const feat = data.input_features || {};
        const updatedForm = {
          Contract: feat.Contract || data.contract || 'Month-to-month',
          tenure: parseFloat(feat.tenure || data.tenure || 3),
          MonthlyCharges: parseFloat(feat.MonthlyCharges || data.monthly_charges || 85.0),
          TotalCharges: parseFloat(feat.TotalCharges || (data.tenure * data.monthly_charges) || 255.0),
          PaperlessBilling: feat.PaperlessBilling || 'Yes',
          PaymentMethod: feat.PaymentMethod || 'Electronic check',
          InternetService: feat.InternetService || 'Fiber optic',
          OnlineSecurity: feat.OnlineSecurity || 'No',
          TechSupport: feat.TechSupport || 'No',
          gender: feat.gender || 'Female',
          SeniorCitizen: parseInt(feat.SeniorCitizen || 0, 10),
          Partner: feat.Partner || 'No',
          Dependents: feat.Dependents || 'No',
        };
        setFormData(updatedForm);

        if (data.churn_probability !== undefined && data.top_factors?.length > 0) {
          setPrediction({
            churn_probability: data.churn_probability,
            risk_level: data.risk_level,
            top_factors: data.top_factors || [],
          });
        } else {
          executeInference(updatedForm);
        }
      } else {
        // Fallback demo sandbox data
        const fallback = {
          id: taskId || 1,
          customer_name: 'Interactive Inference Sandbox',
          employee_name: 'Unassigned Specialist',
          employee_role: 'Operations Lead',
          employee_department: 'Customer Retention',
          employee_avatar: 'IS',
          contract: 'Month-to-month',
          tenure: 2,
          monthly_charges: 94.5,
          input_features: {
            Contract: 'Month-to-month',
            tenure: 2,
            MonthlyCharges: 94.5,
            TotalCharges: 189.0,
            PaperlessBilling: 'Yes',
            PaymentMethod: 'Electronic check',
            InternetService: 'Fiber optic',
            OnlineSecurity: 'No',
            TechSupport: 'No',
          },
        };
        setTask(fallback);
        executeInference(fallback.input_features);
      }
    } catch (err) {
      console.error('Error fetching task details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'tenure' || field === 'MonthlyCharges') {
        const t = field === 'tenure' ? parseFloat(value) || 0 : prev.tenure;
        const m = field === 'MonthlyCharges' ? parseFloat(value) || 0 : prev.MonthlyCharges;
        updated.TotalCharges = parseFloat((t * m).toFixed(2));
      }
      return updated;
    });
  };

  const executeInference = async (customPayload) => {
    setEvaluating(true);
    const target = customPayload || formData;
    const payload = {
      ...target,
      tenure: parseFloat(target.tenure),
      MonthlyCharges: parseFloat(target.MonthlyCharges),
      TotalCharges: parseFloat(target.TotalCharges || target.tenure * target.MonthlyCharges),
      SeniorCitizen: parseInt(target.SeniorCitizen, 10),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setPrediction(data);
      }
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const churnProb = prediction ? prediction.churn_probability : (task?.churn_probability || 0);
  const churnPercent = Math.round(churnProb * 100);

  const getRiskMeta = (prob) => {
    if (prob >= 0.65) {
      return {
        label: 'HIGH CHURN RISK',
        stroke: '#ffffff',
        badge: 'text-white bg-zinc-900 border-zinc-700 shadow-sm',
        summary: 'Critical churn vulnerability driven by month-to-month agreement and fiber optic service. Immediate outreach advised.',
      };
    }
    if (prob >= 0.30) {
      return {
        label: 'MODERATE RISK',
        stroke: '#a1a1aa',
        badge: 'text-zinc-200 bg-zinc-900/80 border-zinc-800',
        summary: 'Account displays emerging friction points. Proactive check-in recommended prior to contract renewal window.',
      };
    }
    return {
      label: 'LOW CHURN RISK',
      stroke: '#71717a',
      badge: 'text-zinc-300 bg-zinc-900/50 border-zinc-800/80',
      summary: 'Exemplary stability metrics with long tenure and multi-year contract security. Prime candidate for expansion.',
    };
  };

  const riskMeta = getRiskMeta(churnProb);

  // SVG Gauge calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (churnPercent / 100) * circumference;

  // Format Recharts SHAP data cleanly
  const chartData = prediction?.top_factors
    ? prediction.top_factors.map((item) => ({
        name: item.feature
          .replace('Contract_', '')
          .replace('InternetService_', 'Net: ')
          .replace('PaymentMethod_', 'Pay: '),
        fullName: item.feature,
        shap_value: item.shap_value,
        effect: item.effect,
      }))
    : [];

  // Benchmark Comparison Data (Customer vs Portfolio Benchmark Averages)
  const custMonthly = parseFloat(formData.MonthlyCharges) || 0;
  const custTenure = parseFloat(formData.tenure) || 0;
  const benchmarkMonthly = 64.8;
  const benchmarkTenure = 32.4;
  const benchmarkChurn = 26.8;

  const benchmarkChartData = [
    {
      metric: 'Monthly Fee ($)',
      Customer: custMonthly,
      PortfolioAvg: benchmarkMonthly,
    },
    {
      metric: 'Tenure (Mo)',
      Customer: custTenure,
      PortfolioAvg: benchmarkTenure,
    },
    {
      metric: 'Churn Risk (%)',
      Customer: churnPercent,
      PortfolioAvg: benchmarkChurn,
    },
  ];

  const employeeName = task?.employee_name || 'Ashley Walker';
  const employeeRole = task?.employee_role || 'Customer Lifecycle Strategist';
  const employeeDept = task?.employee_department || 'Retention & Growth';
  const employeeAvatar =
    task?.employee_avatar ||
    employeeName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div id="view-churn-analysis-window" className="space-y-6">
      {/* 1. Top Breadcrumb & Assigned Employee Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-xs">
          <NavLink
            id="breadcrumb-back-tasks"
            to="/tasks"
            data-bloom="secondary"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span>Back to Tasks</span>
          </NavLink>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">
            Account Evaluation:{' '}
            <span className="font-semibold text-white">
              {task?.customer_name || `Account #${taskId || 1}`}
            </span>
          </span>
        </div>

        {/* Assigned Specialist Card */}
        <div
          id="card-assigned-specialist"
          className="hud-card-outer p-[1px] shadow-sm self-start sm:self-auto"
        >
          <div className="hud-card-inner p-3 px-4 flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-100 font-semibold text-xs flex items-center justify-center border border-zinc-700/80 flex-shrink-0">
              {employeeAvatar}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
                Assigned Retention Specialist
              </div>
              <div className="font-bold text-white text-xs truncate">
                {employeeName}
              </div>
              <div className="text-xs text-zinc-400 truncate">
                {employeeRole} &bull; <span className="text-zinc-400">{employeeDept}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer Banner Card (Cleaned: duplicate XGBoost tag stripped) */}
      <div className="hud-panel-outer shadow-layer-panel p-[1px]">
        <div className="hud-panel-inner p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-white" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Inference Evaluation &bull; Task #{taskId || 1}
              </span>
            </div>
            <h2 id="customer-analysis-heading" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {task?.customer_name || `Enterprise Account #${taskId || 1}`}
            </h2>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-300">
              <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md">
                Contract: <strong className="text-white font-semibold">{formData.Contract}</strong>
              </span>
              <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md">
                Tenure: <strong className="text-white font-semibold tabular-nums font-mono">{formData.tenure} Months</strong>
              </span>
              <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md">
                Billing: <strong className="text-white font-semibold tabular-nums font-mono">${typeof formData.MonthlyCharges === 'number' ? formData.MonthlyCharges.toFixed(2) : formData.MonthlyCharges}/mo</strong>
              </span>
            </div>
          </div>

          <BloomButton
            id="btn-re-evaluate"
            variant="primary"
            disabled={evaluating}
            onClick={() => executeInference()}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg space-x-2 shadow-md self-stretch sm:self-auto flex items-center justify-center"
          >
            {evaluating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Computing Attributions...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-zinc-950" />
                <span>Re-Evaluate Model</span>
              </>
            )}
          </BloomButton>
        </div>
      </div>

      {/* 3. 2-Column Grid: Left Customer Attributes Form + Right Gauge & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Editable Customer Attributes Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="hud-panel-outer shadow-layer-panel p-[1px]">
            <div className="hud-panel-inner p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-zinc-200" />
                  <h3 className="font-bold text-white text-sm tracking-tight">
                    Customer Profile Attributes
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400">
                  Interactive Features
                </span>
              </div>

              <form
                id="customer-analysis-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  executeInference();
                }}
                className="space-y-4"
              >
                {/* Contract Agreement */}
                <div>
                  <label htmlFor="select-contract" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                    Contract Agreement
                  </label>
                  <div className="select-bloom-wrapper">
                    <select
                      id="select-contract"
                      value={formData.Contract}
                      onChange={(e) => handleInputChange('Contract', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                    >
                      <option value="Month-to-month">Month-to-month (High Risk)</option>
                      <option value="One year">One year</option>
                      <option value="Two year">Two year (High Retention)</option>
                    </select>
                  </div>
                </div>

                {/* Customer Tenure Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <label htmlFor="input-tenure" className="font-semibold text-zinc-200">
                      Customer Tenure
                    </label>
                    <span className="text-white tabular-nums font-mono font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-xs">
                      {formData.tenure} Months
                    </span>
                  </div>
                  <input
                    id="input-tenure"
                    type="range"
                    min="1"
                    max="72"
                    value={formData.tenure}
                    onChange={(e) => handleInputChange('tenure', parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
                    <span>1 mo (New)</span>
                    <span>36 mo (Mid)</span>
                    <span>72 mo (Veteran)</span>
                  </div>
                </div>

                {/* Monthly Charges Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <label htmlFor="input-monthly-charges" className="font-semibold text-zinc-200">
                      Monthly Charges
                    </label>
                    <span className="text-white tabular-nums font-mono font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-xs">
                      ${typeof formData.MonthlyCharges === 'number' ? formData.MonthlyCharges.toFixed(2) : formData.MonthlyCharges}
                    </span>
                  </div>
                  <input
                    id="input-monthly-charges"
                    type="range"
                    min="18"
                    max="120"
                    step="0.5"
                    value={formData.MonthlyCharges}
                    onChange={(e) => handleInputChange('MonthlyCharges', parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                {/* Paperless Billing & Payment Method */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Paperless Billing
                    </label>
                    <button
                      id="toggle-paperless-billing"
                      type="button"
                      role="switch"
                      data-bloom="secondary"
                      aria-checked={formData.PaperlessBilling === 'Yes'}
                      onClick={() =>
                        handleInputChange('PaperlessBilling', formData.PaperlessBilling === 'Yes' ? 'No' : 'Yes')
                      }
                      className={`w-full h-9 px-3 flex items-center justify-between border rounded-lg transition-colors cursor-pointer ${
                        formData.PaperlessBilling === 'Yes'
                          ? 'bg-zinc-900 border-zinc-700 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">
                        {formData.PaperlessBilling === 'Yes' ? 'Active (Yes)' : 'Off (No)'}
                      </span>
                      <div
                        className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                          formData.PaperlessBilling === 'Yes' ? 'bg-white justify-end' : 'bg-zinc-700 justify-start'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full shadow-sm ${formData.PaperlessBilling === 'Yes' ? 'bg-zinc-950' : 'bg-zinc-300'}`} />
                      </div>
                    </button>
                  </div>

                  <div>
                    <label htmlFor="select-payment" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Payment Method
                    </label>
                    <div className="select-bloom-wrapper">
                      <select
                        id="select-payment"
                        value={formData.PaymentMethod}
                        onChange={(e) => handleInputChange('PaymentMethod', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                      >
                        <option value="Electronic check">Electronic check</option>
                        <option value="Mailed check">Mailed check</option>
                        <option value="Bank transfer (automatic)">Bank transfer (auto)</option>
                        <option value="Credit card (automatic)">Credit card (auto)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Internet Service */}
                <div>
                  <label htmlFor="select-internet" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                    Internet Service
                  </label>
                  <div className="select-bloom-wrapper">
                    <select
                      id="select-internet"
                      value={formData.InternetService}
                      onChange={(e) => handleInputChange('InternetService', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                    >
                      <option value="Fiber optic">Fiber optic</option>
                      <option value="DSL">DSL</option>
                      <option value="No">No Internet Service</option>
                    </select>
                  </div>
                </div>

                {/* Submit Predict Button with Bloom */}
                <BloomButton
                  id="submit-predict-btn"
                  type="submit"
                  variant="primary"
                  disabled={evaluating}
                  className="w-full py-3 px-4 font-semibold text-xs rounded-lg space-x-2 shadow-md mt-2 flex items-center justify-center"
                >
                  {evaluating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Computing Model Attributions...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 text-zinc-950" />
                      <span>Compute Churn Probability & SHAP</span>
                    </>
                  )}
                </BloomButton>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: High-Res Circular Gauge & Interactive Visualization Tabs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Circular Gauge Card */}
          <div className="hud-panel-outer shadow-layer-panel p-[1px]">
            <div className="hud-panel-inner p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Gauge Graphic */}
                <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="text-zinc-800"
                      strokeWidth="12"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={riskMeta.stroke}
                      strokeWidth="12"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.45))',
                      }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span id="gauge-percent-val" className="font-mono tabular-nums text-3xl font-extrabold text-white tracking-tight">
                      <CountUp end={churnPercent} duration={900} />%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
                      CHURN RISK
                    </span>
                  </div>
                </div>

                {/* Risk Narrative & Recommendations */}
                <div className="flex-1 space-y-2.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span id="risk-tier-badge" className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskMeta.badge}`}>
                      {riskMeta.label}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight">
                    {churnPercent >= 65
                      ? 'High Churn Probability Alert'
                      : churnPercent >= 30
                      ? 'Elevated Churn Risk Account'
                      : 'Healthy Account – Low Churn Vulnerability'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {riskMeta.summary}
                  </p>
                  <div className="pt-1 flex items-center justify-center sm:justify-start space-x-4 text-xs text-zinc-400">
                    <div>
                      Target Window: <span className="font-semibold text-zinc-200">30–60 Days</span>
                    </div>
                    <div>&bull;</div>
                    <div>
                      Intervention Level: <span className="font-semibold text-zinc-200">{churnPercent >= 65 ? 'Immediate Tier-1' : 'Standard Routine'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization Section: Tab Switcher (Local SHAP vs Portfolio Benchmark) */}
          <div className="hud-panel-outer shadow-layer-panel p-[1px]">
            <div className="hud-panel-inner p-6 space-y-4">
              {/* Header with Switcher Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <button
                    id="tab-shap"
                    type="button"
                    onClick={() => setChartTab('shap')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      chartTab === 'shap'
                        ? 'bg-white text-zinc-950 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Local SHAP Feature Drivers
                  </button>
                  <button
                    id="tab-benchmark"
                    type="button"
                    onClick={() => setChartTab('benchmark')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      chartTab === 'benchmark'
                        ? 'bg-white text-zinc-950 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    Portfolio Benchmark Comparison
                  </button>
                </div>

                {chartTab === 'shap' ? (
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="inline-flex items-center space-x-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 bg-zinc-600 rounded-sm" />
                      <span>Protective</span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 text-white">
                      <span className="w-2.5 h-2.5 bg-white rounded-sm shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                      <span>Risk Driver</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="inline-flex items-center space-x-1.5 text-white">
                      <span className="w-2.5 h-2.5 bg-white rounded-sm" />
                      <span>This Customer</span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 text-zinc-400">
                      <span className="w-2.5 h-2.5 bg-zinc-600 rounded-sm" />
                      <span>Portfolio Average</span>
                    </span>
                  </div>
                )}
              </div>

              {/* View 1: Local SHAP Feature Importances Bar Chart */}
              {chartTab === 'shap' ? (
                <div className="h-80 w-full animate-chart-in">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 110, bottom: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                      <XAxis
                        type="number"
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={{ stroke: '#3f3f46' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#d4d4d8', fontSize: 11, fontWeight: 500 }}
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={false}
                        width={105}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const isRisk = data.shap_value > 0;
                            return (
                              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-2xl text-xs space-y-1 font-sans">
                                <div className="font-bold text-white">{data.fullName}</div>
                                <div className="text-zinc-400">
                                  SHAP Value:{' '}
                                  <span className="font-mono tabular-nums font-bold text-white">
                                    {data.shap_value.toFixed(4)}
                                  </span>
                                </div>
                                <div className={`font-semibold ${isRisk ? 'text-white' : 'text-zinc-400'}`}>
                                  {data.effect}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine x={0} stroke="#52525b" strokeDasharray="3 3" />
                      <Bar dataKey="shap_value" radius={[2, 2, 2, 2]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.shap_value < 0 ? '#52525b' : '#ffffff'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                /* View 2: Customer vs Portfolio Benchmark Comparison Chart */
                <div id="chart-benchmark-comparison" className="space-y-4 animate-chart-in">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={benchmarkChartData}
                        margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis
                          dataKey="metric"
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
                                    {data.metric}
                                  </div>
                                  <div className="flex items-center justify-between space-x-4 text-zinc-200">
                                    <span>This Customer:</span>
                                    <span className="font-mono font-bold text-white">{data.Customer}</span>
                                  </div>
                                  <div className="flex items-center justify-between space-x-4 text-zinc-400">
                                    <span>Portfolio Baseline:</span>
                                    <span className="font-mono font-semibold text-zinc-300">{data.PortfolioAvg}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="Customer" name="This Customer" fill="#ffffff" radius={[3, 3, 0, 0]} maxBarSize={38} />
                        <Bar dataKey="PortfolioAvg" name="Portfolio Average" fill="#52525b" radius={[3, 3, 0, 0]} maxBarSize={38} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Benchmark Delta Summary Strip */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800 text-xs">
                    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1">
                      <div className="text-zinc-400 text-[11px]">Monthly Charges Delta</div>
                      <div className="font-mono text-sm font-bold text-white">
                        ${custMonthly} vs $64.80
                      </div>
                      <div className={`text-[10px] font-semibold ${custMonthly > 64.8 ? 'text-white' : 'text-zinc-400'}`}>
                        {custMonthly > 64.8 ? `+$${(custMonthly - 64.8).toFixed(1)}/mo (+${Math.round(((custMonthly - 64.8)/64.8)*100)}%)` : `-$${(64.8 - custMonthly).toFixed(1)}/mo`}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1">
                      <div className="text-zinc-400 text-[11px]">Tenure Delta</div>
                      <div className="font-mono text-sm font-bold text-white">
                        {custTenure} mo vs 32.4 mo
                      </div>
                      <div className={`text-[10px] font-semibold ${custTenure < 32.4 ? 'text-white' : 'text-zinc-400'}`}>
                        {custTenure < 32.4 ? `-${(32.4 - custTenure).toFixed(1)} mo shorter` : `+${(custTenure - 32.4).toFixed(1)} mo longer`}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-1">
                      <div className="text-zinc-400 text-[11px]">Risk vs Portfolio</div>
                      <div className="font-mono text-sm font-bold text-white">
                        {churnPercent}% vs 26.8%
                      </div>
                      <div className={`text-[10px] font-semibold ${churnPercent > 26.8 ? 'text-white' : 'text-zinc-400'}`}>
                        {churnPercent > 26.8 ? `+${(churnPercent - 26.8).toFixed(1)}% elevated` : `-${(26.8 - churnPercent).toFixed(1)}% safer`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
