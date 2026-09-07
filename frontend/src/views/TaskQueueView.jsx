import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  ArrowRight,
  Search,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  ShieldCheck,
  UserCheck,
  Users,
  Plus,
  BarChart3,
  Sliders,
  Layers,
  ArrowRightLeft,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import BloomButton from '../components/BloomButton.jsx';
import { API_BASE_URL } from '../utils/api.js';

export default function TaskQueueView() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [selectedRiskBracket, setSelectedRiskBracket] = useState(null);
  const [search, setSearch] = useState('');

  // Multi-select comparison state
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Add Customer modal & form state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [addCustError, setAddCustError] = useState('');
  const [newCustForm, setNewCustForm] = useState({
    customer_name: '',
    Contract: 'Month-to-month',
    tenure: 6,
    MonthlyCharges: 79.5,
    PaperlessBilling: 'Yes',
    PaymentMethod: 'Electronic check',
    InternetService: 'Fiber optic',
    employee_id: '',
  });

  // Specialist Assignment state
  const [assigningTask, setAssigningTask] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Edit Customer state
  const [editingTask, setEditingTask] = useState(null);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const [editCustError, setEditCustError] = useState('');
  const [editCustForm, setEditCustForm] = useState({
    customer_name: '',
    Contract: 'Month-to-month',
    tenure: 6,
    MonthlyCharges: 79.5,
    PaperlessBilling: 'Yes',
    PaymentMethod: 'Electronic check',
    InternetService: 'Fiber optic',
    employee_id: '',
  });

  // Delete Customer state
  const [deletingTask, setDeletingTask] = useState(null);
  const [deletingCustomerLoading, setDeletingCustomerLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tasksRes, empsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks`),
        fetch(`${API_BASE_URL}/employees`),
      ]);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
      if (empsRes.ok) {
        const empsData = await empsRes.json();
        setEmployees(empsData);
      }
    } catch (err) {
      console.error('Failed to load tasks and employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const handleAssignEmployee = async (taskId, employeeId) => {
    setAssigningLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedTask = data.task;

        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
        );

        const emp = employees.find((e) => e.id === employeeId);
        const empName = emp ? emp.full_name || emp.name : 'Specialist';
        showToast(`Task #${taskId} assigned to ${empName}`);

        setAssigningTask(null);
        setEmployeeSearch('');
      } else {
        alert('Failed to assign employee. Please check server connection.');
      }
    } catch (err) {
      console.error('Error assigning employee:', err);
    } finally {
      setAssigningLoading(false);
    }
  };

  // Multi-select toggle (Limit: 3 accounts)
  const toggleSelectTask = (id) => {
    setSelectedTaskIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 3) {
          showToast('Comparison limit reached (max 3 accounts).');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Add new customer submission
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    setAddCustError('');

    if (!newCustForm.customer_name.trim() || newCustForm.customer_name.trim().length < 2) {
      setAddCustError('Customer name must be at least 2 characters.');
      return;
    }

    setCreatingCustomer(true);
    try {
      const payload = {
        customer_name: newCustForm.customer_name.trim(),
        Contract: newCustForm.Contract,
        tenure: parseFloat(newCustForm.tenure) || 1,
        MonthlyCharges: parseFloat(newCustForm.MonthlyCharges) || 50.0,
        TotalCharges: parseFloat(((parseFloat(newCustForm.tenure) || 1) * (parseFloat(newCustForm.MonthlyCharges) || 50.0)).toFixed(2)),
        PaperlessBilling: newCustForm.PaperlessBilling,
        PaymentMethod: newCustForm.PaymentMethod,
        InternetService: newCustForm.InternetService,
        employee_id: newCustForm.employee_id ? parseInt(newCustForm.employee_id, 10) : null,
      };

      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdTask = await res.json();
        // Immediately add to tasks state without refresh
        setTasks((prev) => [createdTask, ...prev]);

        showToast(
          `Customer ${createdTask.customer_name} added (${createdTask.risk_level} Risk • ${Math.round((createdTask.churn_probability || 0) * 100)}% Churn)`
        );

        setIsAddCustomerOpen(false);
        setNewCustForm({
          customer_name: '',
          Contract: 'Month-to-month',
          tenure: 6,
          MonthlyCharges: 79.5,
          PaperlessBilling: 'Yes',
          PaymentMethod: 'Electronic check',
          InternetService: 'Fiber optic',
          employee_id: '',
        });
      } else {
        const errData = await res.json();
        setAddCustError(errData.detail || 'Failed to create customer record.');
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      setAddCustError('Network error while processing customer prediction.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Open Edit Customer Modal pre-filled with existing task data
  const handleOpenEditModal = (task) => {
    const features = task.input_features || {};
    setEditingTask(task);
    setEditCustError('');
    setEditCustForm({
      customer_name: task.customer_name || features.customer_name || '',
      Contract: task.contract || features.Contract || 'Month-to-month',
      tenure: task.tenure !== undefined ? task.tenure : (features.tenure || 6),
      MonthlyCharges: task.monthly_charges !== undefined ? task.monthly_charges : (features.MonthlyCharges || 79.5),
      PaperlessBilling: features.PaperlessBilling || 'Yes',
      PaymentMethod: features.PaymentMethod || 'Electronic check',
      InternetService: features.InternetService || 'Fiber optic',
      employee_id: task.employee_id || '',
    });
  };

  // Submit Customer Edit & Live Recalculation
  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    setEditCustError('');

    if (!editCustForm.customer_name.trim() || editCustForm.customer_name.trim().length < 2) {
      setEditCustError('Customer name must be at least 2 characters.');
      return;
    }

    setUpdatingCustomer(true);
    try {
      const payload = {
        customer_name: editCustForm.customer_name.trim(),
        Contract: editCustForm.Contract,
        tenure: parseFloat(editCustForm.tenure) || 1,
        MonthlyCharges: parseFloat(editCustForm.MonthlyCharges) || 50.0,
        TotalCharges: parseFloat(((parseFloat(editCustForm.tenure) || 1) * (parseFloat(editCustForm.MonthlyCharges) || 50.0)).toFixed(2)),
        PaperlessBilling: editCustForm.PaperlessBilling,
        PaymentMethod: editCustForm.PaymentMethod,
        InternetService: editCustForm.InternetService,
        employee_id: editCustForm.employee_id ? parseInt(editCustForm.employee_id, 10) : null,
      };

      const res = await fetch(`${API_BASE_URL}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedTask = data.task;
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));

        const probPercent = Math.round((updatedTask.churn_probability || 0) * 100);
        showToast(
          `Customer "${updatedTask.customer_name}" updated (${updatedTask.risk_level} Risk • ${probPercent}% Churn)`
        );
        setEditingTask(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setEditCustError(errData.detail || 'Failed to update customer record.');
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      setEditCustError('Network error while updating customer record.');
    } finally {
      setUpdatingCustomer(false);
    }
  };

  // Confirm and Execute Customer Record Deletion
  const handleDeleteCustomerConfirm = async () => {
    if (!deletingTask) return;
    setDeletingCustomerLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${deletingTask.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const deletedId = deletingTask.id;
        const deletedName = deletingTask.customer_name;
        setTasks((prev) => prev.filter((t) => t.id !== deletedId));
        setSelectedTaskIds((prev) => prev.filter((id) => id !== deletedId));
        showToast(`Customer record "${deletedName}" permanently deleted.`);
        setDeletingTask(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Failed to delete customer record.');
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert('Network error while deleting customer record.');
    } finally {
      setDeletingCustomerLoading(false);
    }
  };

  // Helper to determine calibrated risk tier based on <30%, 30-65%, >=65%
  const getTaskTier = (task) => {
    if (task?.churn_probability != null) {
      const p = Number(task.churn_probability);
      return p >= 0.65 ? 'High' : p >= 0.30 ? 'Moderate' : 'Low';
    }
    return task?.risk_level || 'Low';
  };

  // Filter tasks based on risk tabs, bracket click, and search query
  const filteredTasks = tasks.filter((task) => {
    const prob = task.churn_probability || 0;
    const taskTier = getTaskTier(task);
    const matchesRisk = filterRisk === 'ALL' || taskTier.toUpperCase() === filterRisk;

    let matchesBracket = true;
    if (selectedRiskBracket) {
      if (selectedRiskBracket === '0-20') matchesBracket = prob < 0.2;
      else if (selectedRiskBracket === '20-40') matchesBracket = prob >= 0.2 && prob < 0.4;
      else if (selectedRiskBracket === '40-60') matchesBracket = prob >= 0.4 && prob < 0.6;
      else if (selectedRiskBracket === '60-80') matchesBracket = prob >= 0.6 && prob < 0.8;
      else if (selectedRiskBracket === '80-100') matchesBracket = prob >= 0.8;
    }

    const q = search.toLowerCase();
    const matchesSearch =
      task.customer_name?.toLowerCase().includes(q) ||
      task.contract?.toLowerCase().includes(q) ||
      task.employee_name?.toLowerCase().includes(q);

    return matchesRisk && matchesBracket && matchesSearch;
  });

  // Filter employees inside assignment modal
  const filteredEmployees = employees.filter((emp) => {
    const q = employeeSearch.toLowerCase();
    const name = (emp.full_name || emp.name || '').toLowerCase();
    const title = (emp.job_title || emp.role || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    return name.includes(q) || title.includes(q) || dept.includes(q);
  });

  const highRiskCount = tasks.filter((t) => getTaskTier(t) === 'High').length;
  const modRiskCount = tasks.filter((t) => getTaskTier(t) === 'Moderate').length;
  const lowRiskCount = tasks.filter((t) => getTaskTier(t) === 'Low').length;
  const unassignedCount = tasks.filter((t) => !t.employee_id).length;


  // Selected accounts objects for side-by-side comparison
  const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
  const highestRiskSelected =
    selectedTasks.length > 0
      ? [...selectedTasks].sort((a, b) => (b.churn_probability || 0) - (a.churn_probability || 0))[0]
      : null;

  // Risk bands for interactive mini-chart
  const riskBands = [
    { key: '0-20', label: '<20%', count: tasks.filter((t) => (t.churn_probability || 0) < 0.2).length, alert: false },
    { key: '20-40', label: '20–40%', count: tasks.filter((t) => (t.churn_probability || 0) >= 0.2 && (t.churn_probability || 0) < 0.4).length, alert: false },
    { key: '40-60', label: '40–60%', count: tasks.filter((t) => (t.churn_probability || 0) >= 0.4 && (t.churn_probability || 0) < 0.6).length, alert: false },
    { key: '60-80', label: '60–80%', count: tasks.filter((t) => (t.churn_probability || 0) >= 0.6 && (t.churn_probability || 0) < 0.8).length, alert: true },
    { key: '80-100', label: '80–100%', count: tasks.filter((t) => (t.churn_probability || 0) >= 0.8).length, alert: true },
  ];

  return (
    <div id="view-task-queue" className="space-y-6">
      {/* Toast Notification (Monochrome Glass) */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            id="toast-queue-notification"
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-20 right-8 z-50 flex items-center space-x-3 px-4 py-3 bg-zinc-900 text-white rounded-xl shadow-2xl border border-zinc-700 text-xs font-semibold backdrop-blur-xl"
          >
            <div className="w-5 h-5 bg-white text-zinc-950 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header Banner with Action Buttons */}
      <div className="hud-panel-outer shadow-layer-panel p-[1px]">
        <div className="hud-panel-inner p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Operations Queue
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-xs text-zinc-300 font-medium">Real-Time Routing</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Customer Churn Evaluation Queue
            </h1>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
              Triage critical subscribers, assign dedicated retention specialists, and execute proactive account recovery.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-stretch sm:self-auto">
            {/* + New Customer Button */}
            <button
              id="btn-add-customer"
              type="button"
              data-bloom="primary"
              onClick={() => setIsAddCustomerOpen(true)}
              className="btn-clip-corner px-4 py-2.5 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-950 flex items-center justify-center space-x-2 cursor-pointer shadow-md flex-1 sm:flex-none transition-transform"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              <span>+ New Customer</span>
            </button>

            {/* Specialist Roster Link */}
            <NavLink
              to="/employees"
              data-bloom="secondary"
              className="btn-clip-corner px-4 py-2.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center justify-center space-x-2 cursor-pointer shadow-sm flex-1 sm:flex-none transition-colors"
            >
              <Users className="w-4 h-4 text-zinc-300" />
              <span>Specialist Roster</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Total Queue Tasks</span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-200">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {tasks.length}
              </span>
              <span className="text-xs text-zinc-400">monitored accounts</span>
            </div>
          </div>
        </div>

        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">High Risk Accounts</span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-center text-white">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {highRiskCount}
              </span>
              <span className="text-xs text-zinc-400">&ge; 65% probability</span>
            </div>
          </div>
        </div>

        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Low Risk Stable</span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {lowRiskCount}
              </span>
              <span className="text-xs text-zinc-400">&lt; 30% probability</span>
            </div>
          </div>
        </div>

        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Needs Assignment</span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-300">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {unassignedCount}
              </span>
              <span className="text-xs text-zinc-400">pending staff</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Risk-Distribution Mini-Chart */}
      <div className="hud-panel-outer p-[1px] shadow-sm">
        <div className="hud-panel-inner p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-white" />
              <span className="font-bold text-white tracking-tight">Interactive Churn Risk Distribution</span>
              <span className="text-zinc-500">&bull;</span>
              <span className="text-zinc-400">Click band to isolate cohort</span>
            </div>
            {selectedRiskBracket && (
              <button
                onClick={() => setSelectedRiskBracket(null)}
                className="text-xs text-zinc-300 hover:text-white underline cursor-pointer"
              >
                Reset Bracket Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {riskBands.map((band) => {
              const isSelected = selectedRiskBracket === band.key;
              const maxCount = Math.max(...riskBands.map((b) => b.count), 1);
              const heightPct = Math.max(15, Math.round((band.count / maxCount) * 100));

              return (
                <button
                  key={band.key}
                  type="button"
                  onClick={() =>
                    setSelectedRiskBracket(isSelected ? null : band.key)
                  }
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-800 border-white shadow-md'
                      : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                      {band.label}
                    </span>
                    <span className="font-mono text-zinc-400 font-semibold">{band.count}</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        band.alert ? 'bg-white' : 'bg-zinc-500'
                      }`}
                      style={{ width: `${heightPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Filter Tabs & Search Bar */}
      <div className="hud-panel-outer p-[1px] shadow-sm">
        <div className="hud-panel-inner p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: 'ALL', id: 'filter-tab-all', label: `All Tasks (${tasks.length})` },
              { key: 'HIGH', id: 'filter-tab-high', label: `High Risk (${highRiskCount})` },
              { key: 'MODERATE', id: 'filter-tab-moderate', label: `Moderate (${modRiskCount})` },
              { key: 'LOW', id: 'filter-tab-low', label: `Low Risk (${lowRiskCount})` },
            ].map((pill) => (
              <button
                key={pill.key}
                id={pill.id}
                data-bloom="secondary"
                onClick={() => {
                  setFilterRisk(pill.key);
                  setSelectedRiskBracket(null);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  filterRisk === pill.key && !selectedRiskBracket
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm border border-white'
                    : 'bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            <input
              id="input-search-tasks"
              type="text"
              placeholder="Search account, contract, specialist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Overhauled Task Queue Data Table with Multi-Select Checkboxes */}
      <div className="hud-panel-outer shadow-layer-panel p-[1px] overflow-hidden">
        <div className="hud-panel-inner overflow-x-auto">
          <table id="table-task-queue" className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-zinc-800/90 bg-zinc-900/90 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 pl-6 pr-2 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3.5 px-4">Customer Account</th>
                <th className="py-3.5 px-6">Contract & Tenure</th>
                <th className="py-3.5 px-6">Monthly Charges</th>
                <th className="py-3.5 px-6">Churn Risk</th>
                <th className="py-3.5 px-6">Assigned Specialist</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-xs text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <div className="flex items-center justify-center space-x-2.5">
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span className="font-medium text-xs">Loading enterprise task queue...</span>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div id="queue-empty-state" className="max-w-md mx-auto space-y-4 px-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-300 shadow-inner">
                        <ClipboardList className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-bold text-base text-white">No data yet — add your first customer</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          The evaluation queue is currently clear. Add your first customer account to begin running live XGBoost churn inference and tracking retention workflows.
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          data-bloom="primary"
                          onClick={() => setIsAddCustomerOpen(true)}
                          className="btn-clip-corner px-5 py-2.5 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-950 inline-flex items-center space-x-2 cursor-pointer shadow-md transition-transform"
                        >
                          <Plus className="w-4 h-4 text-zinc-950" />
                          <span>+ Add First Customer</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ClipboardList className="w-8 h-8 mx-auto text-zinc-600" />
                      <p className="font-semibold text-sm text-zinc-300">No tasks match your criteria</p>
                      <p className="text-xs text-zinc-500">
                        Try adjusting the risk filter or clearing search keywords.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const prob = task.churn_probability || 0;
                  const percent = Math.round(prob * 100);
                  const tier = getTaskTier(task);
                  const isHigh = tier === 'High';
                  const isMod = tier === 'Moderate';
                  const isSelected = selectedTaskIds.includes(task.id);

                  return (
                    <tr
                      key={task.id}
                      id={`task-row-${task.id}`}
                      className={`hover:bg-zinc-900/60 transition-all duration-150 group cursor-default ${
                        isSelected ? 'bg-zinc-900/40' : ''
                      }`}
                    >
                      {/* Checkbox for side-by-side comparison */}
                      <td className="py-4 pl-6 pr-2 text-center">
                        <input
                          id={`checkbox-task-${task.id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTask(task.id)}
                          aria-label={`Select ${task.customer_name} for comparison`}
                          className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white"
                        />
                      </td>

                      {/* Customer Account */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white text-sm flex items-center space-x-2">
                          <span>{task.customer_name}</span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          Task #{task.id} &bull; <span className="capitalize">{task.status || 'Pending Review'}</span>
                        </div>
                      </td>

                      {/* Contract & Tenure */}
                      <td className="py-4 px-6">
                        <span className="font-medium text-zinc-200">{task.contract}</span>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {task.tenure} months tenure
                        </div>
                      </td>

                      {/* Monthly Charges */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-white tabular-nums font-mono">
                          ${typeof task.monthly_charges === 'number' ? task.monthly_charges.toFixed(2) : task.monthly_charges}
                        </span>
                        <span className="text-xs text-zinc-400"> /mo</span>
                      </td>

                      {/* Churn Risk Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            isHigh
                              ? 'bg-zinc-900 border-zinc-700 text-white shadow-sm'
                              : isMod
                              ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                              : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHigh
                                ? 'bg-white animate-pulse shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                                : isMod
                                ? 'bg-zinc-400'
                                : 'bg-zinc-600'
                            }`}
                          />
                          <span className="tabular-nums font-mono font-bold">{percent}%</span>
                          <span className="font-semibold">{tier}</span>
                        </span>
                      </td>

                      {/* Assigned Specialist Column */}
                      <td className="py-4 px-6">
                        {task.employee_id && task.employee_name ? (
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-100 font-semibold text-xs flex items-center justify-center border border-zinc-700/80 flex-shrink-0">
                              {task.employee_avatar ||
                                task.employee_name
                                  .split(' ')
                                  .map((p) => p[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-white text-xs truncate">
                                {task.employee_name}
                              </div>
                              <button
                                id={`btn-reassign-${task.id}`}
                                type="button"
                                onClick={() => {
                                  setAssigningTask(task);
                                  setEmployeeSearch('');
                                }}
                                className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer underline-offset-2 hover:underline"
                              >
                                Reassign
                              </button>
                            </div>
                          </div>
                        ) : (
                          <BloomButton
                            id={`btn-assign-task-${task.id}`}
                            variant="secondary"
                            onClick={() => {
                              setAssigningTask(task);
                              setEmployeeSearch('');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg space-x-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign Specialist</span>
                          </BloomButton>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center space-x-2 justify-end">
                          <NavLink
                            to={`/analysis/${task.id}`}
                            id={`btn-analyze-task-${task.id}`}
                            data-bloom="primary"
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg shadow-sm transition-all cursor-pointer border border-white/90"
                            title="Open In-Depth Churn Analysis"
                          >
                            <span>Analyze</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </NavLink>
                          <button
                            id={`btn-edit-task-${task.id}`}
                            type="button"
                            onClick={() => handleOpenEditModal(task)}
                            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Customer Profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="sr-only">Edit</span>
                          </button>
                          <button
                            id={`btn-delete-task-${task.id}`}
                            type="button"
                            onClick={() => setDeletingTask(task)}
                            className="p-1.5 text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-900/50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Customer Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Contextual Floating Action Bar (When 2+ Accounts Selected for Comparison) */}
      <AnimatePresence>
        {selectedTaskIds.length >= 2 && (
          <motion.div
            id="bar-floating-compare"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center space-x-4 px-5 py-3 bg-zinc-950/95 text-white border border-zinc-700/90 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="font-semibold text-white">
                {selectedTaskIds.length} accounts selected
              </span>
              <span className="text-zinc-500">&bull;</span>
              <span className="text-zinc-400">Multi-Account Triangulation</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-compare-selected"
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="px-4 py-2 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-950 rounded-lg flex items-center space-x-1.5 shadow-sm transition-transform cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-950" />
                <span>Compare Selected ({selectedTaskIds.length})</span>
              </button>

              <button
                id="btn-clear-selection"
                type="button"
                onClick={() => setSelectedTaskIds([])}
                className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Side-by-Side Customer Comparison Modal */}
      <AnimatePresence>
        {isCompareModalOpen && selectedTasks.length >= 2 && (
          <div
            id="modal-customer-comparison"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsCompareModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hud-card-outer shadow-layer-panel w-full max-w-5xl p-[1px] my-8 max-h-[90vh] flex flex-col"
            >
              <div className="hud-card-inner p-6 sm:p-7 flex flex-col overflow-hidden max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-zinc-800 pb-4 flex-shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <ArrowRightLeft className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Multi-Account Triangulation
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      Customer Churn Risk Comparison
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Side-by-side alignment of contract terms, risk indicators, assigned staff, and local SHAP attributions.
                    </p>
                  </div>
                  <button
                    id="btn-close-compare-modal"
                    type="button"
                    onClick={() => setIsCompareModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Comparative Grid of Accounts */}
                <div className="flex-1 overflow-y-auto py-4">
                  <div className={`grid gap-4 ${selectedTasks.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                    {selectedTasks.map((t) => {
                      const prob = t.churn_probability || 0;
                      const percent = Math.round(prob * 100);
                      const isWorst = highestRiskSelected && highestRiskSelected.id === t.id && selectedTasks.length > 1;

                      return (
                        <div
                          key={t.id}
                          className={`hud-panel-inner p-5 rounded-xl border flex flex-col justify-between space-y-4 ${
                            isWorst
                              ? 'border-white/80 bg-zinc-900/90 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                              : 'border-zinc-800 bg-zinc-950/70'
                          }`}
                        >
                          {/* Account Card Header */}
                          <div className="space-y-2 border-b border-zinc-800 pb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-zinc-400">Account #{t.id}</span>
                              {isWorst ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-zinc-950 rounded-full shadow-sm animate-pulse">
                                  Highest Churn Risk
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-full">
                                  {t.risk_level} Risk
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-base truncate">{t.customer_name}</h3>
                          </div>

                          {/* Metric Highlights */}
                          <div className="space-y-3 text-xs">
                            {/* Churn Probability */}
                            <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-lg flex items-center justify-between">
                              <span className="text-zinc-400">Churn Probability</span>
                              <div className="text-right">
                                <span className="font-mono text-xl font-bold text-white tabular-nums">{percent}%</span>
                                <div className="text-[10px] text-zinc-400">{t.risk_level} Tier</div>
                              </div>
                            </div>

                            {/* Terms */}
                            <div className="space-y-2 divide-y divide-zinc-900 text-[11px]">
                              <div className="flex items-center justify-between py-1">
                                <span className="text-zinc-400">Contract</span>
                                <span className="font-medium text-white">{t.contract}</span>
                              </div>
                              <div className="flex items-center justify-between py-1">
                                <span className="text-zinc-400">Tenure</span>
                                <span className="font-mono font-semibold text-white">{t.tenure} months</span>
                              </div>
                              <div className="flex items-center justify-between py-1">
                                <span className="text-zinc-400">Monthly Fee</span>
                                <span className="font-mono font-semibold text-white">${t.monthly_charges}/mo</span>
                              </div>
                              <div className="flex items-center justify-between py-1">
                                <span className="text-zinc-400">Assigned Staff</span>
                                <span className="font-medium text-zinc-200 truncate max-w-[150px]">
                                  {t.employee_name || 'Unassigned'}
                                </span>
                              </div>
                            </div>

                            {/* Top SHAP Drivers */}
                            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                              <div className="text-[10px] uppercase font-semibold text-zinc-400">
                                Primary SHAP Drivers
                              </div>
                              <div className="space-y-1">
                                {(t.top_factors || []).slice(0, 3).map((f, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="p-1.5 bg-zinc-900 border border-zinc-800/80 rounded text-[11px] flex items-center justify-between"
                                  >
                                    <span className="text-zinc-300 truncate max-w-[160px]">{f.feature}</span>
                                    <span className={`font-mono text-[10px] font-bold ${f.shap_value > 0 ? 'text-white' : 'text-zinc-400'}`}>
                                      {f.shap_value > 0 ? `+${f.shap_value.toFixed(2)}` : f.shap_value.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                {(!t.top_factors || t.top_factors.length === 0) && (
                                  <span className="text-[11px] text-zinc-500 italic">Month-to-month, Fiber optic</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Deep-Dive Link */}
                          <div className="pt-3 border-t border-zinc-800/80">
                            <NavLink
                              to={`/analysis/${t.id}`}
                              className="w-full py-2 px-3 text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                            >
                              <span>Open Analysis Window</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </NavLink>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between flex-shrink-0">
                  <div className="text-xs text-zinc-400">
                    Showing {selectedTasks.length} accounts for multi-parameter retention triage.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCompareModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg cursor-pointer"
                  >
                    Close Comparison
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Add New Customer Window / Modal */}
      <AnimatePresence>
        {isAddCustomerOpen && (
          <div
            id="modal-add-customer"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddCustomerOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hud-card-outer shadow-layer-panel w-full max-w-xl p-[1px] my-8"
            >
              <div className="hud-card-inner p-6 sm:p-7 space-y-5">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Account Ingestion & Inference
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Provision New Customer Profile
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Submit subscriber metrics to execute live XGBoost classification and seed into the queue.
                    </p>
                  </div>
                  <button
                    id="btn-close-add-customer"
                    type="button"
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Error Banner */}
                {addCustError && (
                  <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{addCustError}</span>
                  </div>
                )}

                {/* Add Customer Form */}
                <form id="form-add-customer" onSubmit={handleAddCustomerSubmit} className="space-y-4">
                  {/* Customer Name */}
                  <div>
                    <label htmlFor="input-new-cust-name" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Account / Customer Name <span className="text-zinc-400">*</span>
                    </label>
                    <input
                      id="input-new-cust-name"
                      type="text"
                      required
                      placeholder="e.g. Apex Global Logistics"
                      value={newCustForm.customer_name}
                      onChange={(e) => setNewCustForm({ ...newCustForm, customer_name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  {/* Contract & Internet Service */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="select-new-cust-contract" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Contract Type
                      </label>
                      <select
                        id="select-new-cust-contract"
                        value={newCustForm.Contract}
                        onChange={(e) => setNewCustForm({ ...newCustForm, Contract: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="Month-to-month">Month-to-month (High Risk)</option>
                        <option value="One year">One year</option>
                        <option value="Two year">Two year (High Retention)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="select-new-cust-internet" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Internet Service
                      </label>
                      <select
                        id="select-new-cust-internet"
                        value={newCustForm.InternetService}
                        onChange={(e) => setNewCustForm({ ...newCustForm, InternetService: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="Fiber optic">Fiber optic</option>
                        <option value="DSL">DSL</option>
                        <option value="No">None</option>
                      </select>
                    </div>
                  </div>

                  {/* Tenure Slider & Monthly Charges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <label htmlFor="input-new-cust-tenure" className="font-semibold text-zinc-200">
                          Tenure (Months)
                        </label>
                        <span className="font-mono text-white font-bold">{newCustForm.tenure} mo</span>
                      </div>
                      <input
                        id="input-new-cust-tenure"
                        type="range"
                        min="1"
                        max="72"
                        value={newCustForm.tenure}
                        onChange={(e) => setNewCustForm({ ...newCustForm, tenure: parseInt(e.target.value, 10) })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="input-new-cust-monthly" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Monthly Charges ($)
                      </label>
                      <input
                        id="input-new-cust-monthly"
                        type="number"
                        step="0.5"
                        min="15"
                        max="180"
                        value={isNaN(newCustForm.MonthlyCharges) || newCustForm.MonthlyCharges === '' ? '' : newCustForm.MonthlyCharges}
                        onChange={(e) => setNewCustForm({ ...newCustForm, MonthlyCharges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Paperless Billing & Payment Method */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="select-new-cust-payment" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Payment Method
                      </label>
                      <select
                        id="select-new-cust-payment"
                        value={newCustForm.PaymentMethod}
                        onChange={(e) => setNewCustForm({ ...newCustForm, PaymentMethod: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="Electronic check">Electronic check</option>
                        <option value="Mailed check">Mailed check</option>
                        <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
                        <option value="Credit card (automatic)">Credit card (automatic)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="select-new-cust-employee" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Assign Specialist (Optional)
                      </label>
                      <select
                        id="select-new-cust-employee"
                        value={newCustForm.employee_id}
                        onChange={(e) => setNewCustForm({ ...newCustForm, employee_id: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="">Unassigned (Queue Pending)</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name || emp.name} ({emp.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsAddCustomerOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-submit-new-customer"
                      type="submit"
                      disabled={creatingCustomer}
                      className="px-5 py-2 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-100 rounded-lg shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-60"
                    >
                      {creatingCustomer ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                          <span>Computing Inference...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-zinc-950" />
                          <span>Create Customer & Evaluate</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. Searchable Specialist Assignment Modal */}
      <AnimatePresence>
        {assigningTask && (
          <div
            id="modal-assign-employee"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAssigningTask(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hud-card-outer shadow-layer-panel w-full max-w-lg p-[1px] my-8 max-h-[85vh] flex flex-col"
            >
              <div className="hud-card-inner p-6 flex flex-col overflow-hidden max-h-[85vh]">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-zinc-800 pb-4 flex-shrink-0">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Workload Routing
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Assign Retention Specialist
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Routing Customer: <span className="font-semibold text-white">{assigningTask.customer_name}</span> (Task #{assigningTask.id})
                    </p>
                  </div>
                  <button
                    id="btn-close-modal"
                    type="button"
                    onClick={() => setAssigningTask(null)}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Input for 50+ Specialists */}
                <div className="py-3 border-b border-zinc-800/80 flex-shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search specialist name, job title, department..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
                    />
                  </div>
                </div>

                {/* Specialists Scroll List */}
                <div className="flex-1 overflow-y-auto py-2 space-y-1.5 divide-y divide-zinc-900">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-8 text-center text-xs text-zinc-500">
                      No specialists match "{employeeSearch}".
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const empName = emp.full_name || emp.name;
                      const empRole = emp.job_title || emp.role;
                      const initials =
                        emp.avatar_initials ||
                        empName
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                      const isCurrentlyAssigned = assigningTask.employee_id === emp.id;

                      return (
                        <div
                          key={emp.id}
                          className="pt-2 pb-2 px-2 flex items-center justify-between hover:bg-zinc-900/60 rounded-lg transition-colors"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-100 font-bold text-xs flex items-center justify-center border border-zinc-700/80 flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-xs truncate">
                                {empName}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate">
                                {empRole} &bull; <span className="text-zinc-500">{emp.department}</span>
                              </div>
                            </div>
                          </div>

                          <BloomButton
                            variant={isCurrentlyAssigned ? 'outline' : 'primary'}
                            disabled={assigningLoading || isCurrentlyAssigned}
                            onClick={() => handleAssignEmployee(assigningTask.id, emp.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg flex-shrink-0"
                          >
                            {isCurrentlyAssigned ? 'Assigned' : 'Select'}
                          </BloomButton>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-zinc-800/80 flex justify-end flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setAssigningTask(null)}
                    className="px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. Edit Customer Profile Modal */}
      <AnimatePresence>
        {editingTask && (
          <div
            id="modal-edit-customer"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingTask(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hud-card-outer shadow-layer-panel w-full max-w-xl p-[1px] my-8"
            >
              <div className="hud-card-inner p-6 sm:p-7 space-y-5">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Pencil className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Profile Modification & Inference
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Edit Customer Profile
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Modifying contract or service parameters automatically recalculates real-time XGBoost churn risk.
                    </p>
                  </div>
                  <button
                    id="btn-close-edit-customer"
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Error Banner */}
                {editCustError && (
                  <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{editCustError}</span>
                  </div>
                )}

                {/* Edit Form */}
                <form id="form-edit-customer" onSubmit={handleEditCustomerSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="input-edit-cust-name" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Account / Customer Name <span className="text-zinc-400">*</span>
                    </label>
                    <input
                      id="input-edit-cust-name"
                      type="text"
                      required
                      value={editCustForm.customer_name}
                      onChange={(e) => setEditCustForm({ ...editCustForm, customer_name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="select-edit-cust-contract" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Contract Type
                      </label>
                      <select
                        id="select-edit-cust-contract"
                        value={editCustForm.Contract}
                        onChange={(e) => setEditCustForm({ ...editCustForm, Contract: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="Month-to-month">Month-to-month (High Risk)</option>
                        <option value="One year">One year</option>
                        <option value="Two year">Two year (High Retention)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="select-edit-cust-internet" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Internet Service
                      </label>
                      <select
                        id="select-edit-cust-internet"
                        value={editCustForm.InternetService}
                        onChange={(e) => setEditCustForm({ ...editCustForm, InternetService: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="Fiber optic">Fiber optic</option>
                        <option value="DSL">DSL</option>
                        <option value="No">None</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <label htmlFor="input-edit-cust-tenure" className="font-semibold text-zinc-200">
                          Tenure (Months)
                        </label>
                        <span className="font-mono text-white font-bold">{editCustForm.tenure} mo</span>
                      </div>
                      <input
                        id="input-edit-cust-tenure"
                        type="range"
                        min="1"
                        max="72"
                        value={editCustForm.tenure}
                        onChange={(e) => setEditCustForm({ ...editCustForm, tenure: parseInt(e.target.value, 10) })}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="input-edit-cust-monthly" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Monthly Charges ($)
                      </label>
                      <input
                        id="input-edit-cust-monthly"
                        type="number"
                        step="0.5"
                        min="15"
                        max="180"
                        value={isNaN(editCustForm.MonthlyCharges) || editCustForm.MonthlyCharges === '' ? '' : editCustForm.MonthlyCharges}
                        onChange={(e) => setEditCustForm({ ...editCustForm, MonthlyCharges: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="select-edit-cust-payment" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Payment Method
                      </label>
                      <select
                        id="select-edit-cust-payment"
                        value={editCustForm.PaymentMethod}
                        onChange={(e) => setEditCustForm({ ...editCustForm, PaymentMethod: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="Electronic check">Electronic check</option>
                        <option value="Mailed check">Mailed check</option>
                        <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
                        <option value="Credit card (automatic)">Credit card (automatic)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="select-edit-cust-employee" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Assign Specialist
                      </label>
                      <select
                        id="select-edit-cust-employee"
                        value={editCustForm.employee_id}
                        onChange={(e) => setEditCustForm({ ...editCustForm, employee_id: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name || emp.name} ({emp.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditingTask(null)}
                      className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-submit-edit-customer"
                      type="submit"
                      disabled={updatingCustomer}
                      className="px-5 py-2 text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-100 rounded-lg shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-60"
                    >
                      {updatingCustomer ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                          <span>Updating & Recalculating...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                          <span>Save & Re-evaluate Risk</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. Delete Customer Confirmation Dialog */}
      <AnimatePresence>
        {deletingTask && (
          <div
            id="modal-delete-customer"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeletingTask(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hud-card-outer shadow-layer-panel w-full max-w-md p-[1px]"
            >
              <div className="hud-card-inner p-6 space-y-4">
                <div className="flex items-center space-x-3 text-red-400">
                  <div className="w-9 h-9 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Delete Customer Record
                    </h3>
                    <span className="text-[11px] text-zinc-400">Permanent Record Removal</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Are you sure you want to delete customer{' '}
                  <span className="font-semibold text-white">"{deletingTask.customer_name}"</span> (Task #{deletingTask.id})?
                  This will remove all associated churn inference predictions and historical logs. This action cannot be undone.
                </p>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Current Risk Tier:</span>
                    <span className="font-semibold text-white">{deletingTask.risk_level} Risk</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Monthly Charges:</span>
                    <span className="font-mono text-white">${typeof deletingTask.monthly_charges === 'number' ? deletingTask.monthly_charges.toFixed(2) : deletingTask.monthly_charges}/mo</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
                  <button
                    id="btn-cancel-delete-customer"
                    type="button"
                    onClick={() => setDeletingTask(null)}
                    className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <BloomButton
                    id="btn-confirm-delete-customer"
                    variant="danger"
                    disabled={deletingCustomerLoading}
                    onClick={handleDeleteCustomerConfirm}
                    className="px-4 py-2 text-xs font-bold text-white bg-red-900/80 hover:bg-red-800 border border-red-700/80 rounded-lg flex items-center space-x-1.5"
                  >
                    {deletingCustomerLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Delete</span>
                      </>
                    )}
                  </BloomButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
