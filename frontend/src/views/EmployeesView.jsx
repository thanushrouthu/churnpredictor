import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ClipboardList,
  Search,
  RefreshCw,
  UserCheck,
  Building2,
  Activity,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Briefcase,
  Mail,
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import BloomButton from '../components/BloomButton.jsx';
import { API_BASE_URL } from '../utils/api.js';

const STANDARD_DEPARTMENTS = [
  'Strategic Customer Growth',
  'Executive Leadership',
  'Client Support',
  'Retention & Growth',
  'Customer Success',
  'Risk & Operations',
  'Enterprise Accounts',
];

export default function EmployeesView() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [expandedEmpId, setExpandedEmpId] = useState(null);

  // Add Employee Modal & Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    jobTitle: '',
    department: 'Strategic Customer Growth',
    assignedTasks: 0,
  });

  // Edit Employee Modal & Form State
  const [editingEmp, setEditingEmp] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    jobTitle: '',
    department: 'Strategic Customer Growth',
  });

  // Delete Employee Confirmation State
  const [deletingEmp, setDeletingEmp] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employees`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute departments list from standard + existing
  const departments = [
    'ALL',
    ...Array.from(new Set([...STANDARD_DEPARTMENTS, ...employees.map((e) => e.department).filter(Boolean)])),
  ];

  // Client-side form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid corporate email format.';
    }

    if (!formData.jobTitle.trim() || formData.jobTitle.trim().length < 2) {
      errors.jobTitle = 'Job title is required.';
    }

    if (!formData.department.trim()) {
      errors.department = 'Please select a department.';
    }

    const tasksNum = parseInt(formData.assignedTasks, 10);
    if (isNaN(tasksNum) || tasksNum < 0) {
      errors.assignedTasks = 'Assigned tasks must be 0 or greater.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.fullName.trim(),
        full_name: formData.fullName.trim(),
        role: formData.jobTitle.trim(),
        job_title: formData.jobTitle.trim(),
        department: formData.department.trim(),
        email: formData.email.trim().toLowerCase(),
        initial_tasks: parseInt(formData.assignedTasks, 10) || 0,
      };

      const res = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        // Immediately prepend to state
        setEmployees((prev) => [created, ...prev]);

        // Success toast
        setToastMessage(`Specialist "${created.full_name || created.name}" successfully added to roster.`);
        setTimeout(() => setToastMessage(null), 4500);

        // Reset & Close
        setFormData({
          fullName: '',
          email: '',
          jobTitle: '',
          department: 'Strategic Customer Growth',
          assignedTasks: 0,
        });
        setFieldErrors({});
        setIsAddModalOpen(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFormError(errData.detail || 'Failed to create employee. Please try again.');
      }
    } catch (err) {
      console.error('Add employee error:', err);
      setFormError('Network connection error while communicating with backend.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmp(emp);
    setEditFormError('');
    setEditFieldErrors({});
    setEditFormData({
      fullName: emp.full_name || emp.name || '',
      email: emp.email || '',
      jobTitle: emp.job_title || emp.role || '',
      department: emp.department || 'Strategic Customer Growth',
    });
  };

  const handleEditEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!editingEmp) return;
    setEditFormError('');

    const errors = {};
    if (!editFormData.fullName.trim() || editFormData.fullName.trim().length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editFormData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(editFormData.email.trim())) {
      errors.email = 'Please enter a valid corporate email format.';
    }
    if (!editFormData.jobTitle.trim() || editFormData.jobTitle.trim().length < 2) {
      errors.jobTitle = 'Job title is required.';
    }
    setEditFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditSubmitting(true);
    try {
      const payload = {
        name: editFormData.fullName.trim(),
        full_name: editFormData.fullName.trim(),
        role: editFormData.jobTitle.trim(),
        job_title: editFormData.jobTitle.trim(),
        department: editFormData.department.trim(),
        email: editFormData.email.trim().toLowerCase(),
      };

      const res = await fetch(`${API_BASE_URL}/employees/${editingEmp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.employee;
        setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setToastMessage(`Specialist "${updated.full_name || updated.name}" updated successfully.`);
        setTimeout(() => setToastMessage(null), 4500);
        setEditingEmp(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setEditFormError(errData.detail || 'Failed to update specialist.');
      }
    } catch (err) {
      console.error('Update employee error:', err);
      setEditFormError('Network connection error while communicating with backend.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteEmployeeConfirm = async () => {
    if (!deletingEmp) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${deletingEmp.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const deletedId = deletingEmp.id;
        const deletedName = deletingEmp.full_name || deletingEmp.name;
        const unassigned = data.unassigned_tasks || 0;

        setEmployees((prev) => prev.filter((e) => e.id !== deletedId));
        setToastMessage(
          `Specialist "${deletedName}" removed from roster.${unassigned > 0 ? ` ${unassigned} active task(s) unassigned.` : ''}`
        );
        setTimeout(() => setToastMessage(null), 4500);
        setDeletingEmp(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || 'Failed to delete specialist.');
      }
    } catch (err) {
      console.error('Delete employee error:', err);
      alert('Network connection error while communicating with backend.');
    } finally {
      setDeletingLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    const name = (emp.full_name || emp.name || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const role = (emp.job_title || emp.role || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();

    const matchesSearch =
      name.includes(q) ||
      email.includes(q) ||
      role.includes(q) ||
      dept.includes(q);

    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const totalAssignedTasks = employees.reduce((acc, curr) => acc + (curr.task_count || curr.tasks?.length || 0), 0);
  const avgTasksPerEmp = employees.length > 0 ? (totalAssignedTasks / employees.length).toFixed(1) : '0.0';
  const activeUnitsCount = employees.length === 0 ? 0 : new Set(employees.map((e) => e.department).filter(Boolean)).size;

  return (
    <div id="view-employees-roster" className="space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="hud-panel-outer shadow-layer-panel p-[1px]">
        <div className="hud-panel-inner p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Staff Intelligence
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-xs text-zinc-300 font-medium">Enterprise Coverage</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Enterprise Retention Roster
            </h1>
            <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
              Real-time directory of retention specialists, departmental alignment, and active workload distributions.
            </p>
          </div>

          {/* Prominent Add Employee Button */}
          <div className="flex items-center space-x-3 self-stretch sm:self-auto">
            <BloomButton
              id="btn-open-add-employee"
              variant="primary"
              onClick={() => {
                setFormError('');
                setFieldErrors({});
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 shadow-md w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 text-zinc-950" />
              <span>Add Employee</span>
            </BloomButton>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Monochrome Chamfered Glass) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Specialists */}
        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Total Specialists
              </span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-200">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span id="stat-total-employees" className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {employees.length}
              </span>
              <span className="text-xs text-zinc-400">active staff</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Assigned Tasks */}
        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Assigned Evaluations
              </span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-200">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span id="stat-total-tasks" className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {totalAssignedTasks}
              </span>
              <span className="text-xs text-zinc-400">live tasks</span>
            </div>
          </div>
        </div>

        {/* Card 3: Departments */}
        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Operating Units
              </span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-200">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {activeUnitsCount}
              </span>
              <span className="text-xs text-zinc-400">business units</span>
            </div>
          </div>
        </div>

        {/* Card 4: Avg Workload */}
        <div className="hud-card-outer shadow-layer-kpi p-[1px]">
          <div className="hud-card-inner p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Avg Load / Person
              </span>
              <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-200">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums font-mono">
                {avgTasksPerEmp}
              </span>
              <span className="text-xs text-zinc-400">tasks / specialist</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Department Filters & Search Controls */}
      <div className="hud-panel-outer p-[1px] shadow-sm">
        <div className="hud-panel-inner p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Department Filter Tabs */}
          <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {departments.slice(0, 7).map((dept) => (
              <button
                key={dept}
                data-bloom="secondary"
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  selectedDept === dept
                    ? 'bg-white text-zinc-950 font-semibold shadow-sm border border-white'
                    : 'bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
                }`}
              >
                {dept === 'ALL' ? `All Departments (${employees.length})` : dept}
              </button>
            ))}
          </div>

          {/* Search Bar with Input Focus Glow */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            <input
              id="input-search-employees"
              type="text"
              placeholder="Search specialists, roles, units..."
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

      {/* 4. Overhauled Employee Roster Table */}
      <div className="hud-panel-outer shadow-layer-panel p-[1px] overflow-hidden">
        <div className="hud-panel-inner overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-zinc-800/90 bg-zinc-900/90 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-6">Specialist Details</th>
                <th className="py-3.5 px-6">Job Title</th>
                <th className="py-3.5 px-6">Department</th>
                <th className="py-3.5 px-6 text-center">Assigned Tasks</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-xs text-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-400">
                    <div className="flex items-center justify-center space-x-2.5">
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span className="font-medium text-xs">Loading enterprise roster...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div id="roster-empty-state" className="max-w-md mx-auto space-y-4 px-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-300 shadow-inner">
                        <Users className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-bold text-base text-white">No data yet — add your first employee</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Your enterprise retention roster is currently empty. Add retention specialists, customer success managers, or account leads to distribute churn evaluation tasks.
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          data-bloom="primary"
                          onClick={() => {
                            setFormError('');
                            setFieldErrors({});
                            setIsAddModalOpen(true);
                          }}
                          className="btn-clip-corner px-5 py-2.5 text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-950 inline-flex items-center space-x-2 cursor-pointer shadow-md transition-transform"
                        >
                          <Plus className="w-4 h-4 text-zinc-950" />
                          <span>+ Add First Specialist</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Users className="w-8 h-8 mx-auto text-zinc-600" />
                      <p className="font-semibold text-sm text-zinc-300">No specialists match your filter</p>
                      <p className="text-xs text-zinc-500">
                        Try clearing search terms or selecting "All Departments".
                      </p>
                    </div>
                  </td>
                </tr>
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

                  const taskCount = emp.task_count || emp.tasks?.length || 0;
                  const isExpanded = expandedEmpId === emp.id;

                  return (
                    <React.Fragment key={emp.id}>
                      <tr
                        id={`employee-row-${emp.id}`}
                        className="hover:bg-zinc-900/60 transition-all duration-150 group cursor-default"
                      >
                        {/* Name and Avatar */}
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3.5">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-100 font-semibold text-xs flex items-center justify-center border border-zinc-700/80 flex-shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-sm employee-name">
                                {empName}
                              </div>
                              <div className="text-xs text-zinc-400 truncate mt-0.5">
                                {emp.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Job Title */}
                        <td className="py-4 px-6 font-medium text-zinc-200">
                          {empRole}
                        </td>

                        {/* Department Badge */}
                        <td className="py-4 px-6">
                          <span className="inline-block px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 rounded-md">
                            {emp.department}
                          </span>
                        </td>

                        {/* Assigned Tasks count */}
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tabular-nums font-mono border ${
                              taskCount > 3
                                ? 'bg-zinc-900 text-white border-zinc-600 shadow-sm'
                                : taskCount > 0
                                ? 'bg-zinc-900 text-zinc-300 border-zinc-800'
                                : 'bg-zinc-950 text-zinc-500 border-zinc-800/80'
                            }`}
                          >
                            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {taskCount > 0 && (
                              <BloomButton
                                id={`btn-expand-emp-${emp.id}`}
                                variant="outline"
                                onClick={() => setExpandedEmpId(isExpanded ? null : emp.id)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg space-x-1"
                                title="Toggle Tasks Preview"
                              >
                                <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </BloomButton>
                            )}
                            <NavLink
                              to="/tasks"
                              data-bloom="secondary"
                              className="px-2.5 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg inline-flex items-center space-x-1"
                              title="View in Global Task Queue"
                            >
                              <span>Queue</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </NavLink>
                            <button
                              id={`btn-edit-emp-${emp.id}`}
                              type="button"
                              onClick={() => handleOpenEditModal(emp)}
                              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                              title="Edit Specialist"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              id={`btn-delete-emp-${emp.id}`}
                              type="button"
                              onClick={() => setDeletingEmp(emp)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-900/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Specialist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Task List View */}
                      {isExpanded && (
                        <tr className="bg-zinc-950/90 border-b border-zinc-800">
                          <td colSpan={5} className="p-6">
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-white">
                                  Assigned Churn Evaluations ({emp.tasks?.length || 0})
                                </span>
                                <NavLink to="/tasks" className="text-zinc-400 hover:text-white flex items-center space-x-1">
                                  <span>View in Global Queue</span>
                                  <ArrowRight className="w-3 h-3" />
                                </NavLink>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(emp.tasks || []).map((t) => (
                                  <div
                                    key={t.id}
                                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <div className="font-semibold text-white">{t.customer_name}</div>
                                      <div className="text-[11px] text-zinc-400">
                                        Tenure: {t.tenure} mo &bull; ${t.monthly_charges}/mo
                                      </div>
                                    </div>
                                    <NavLink
                                      to={`/analysis/${t.id}`}
                                      data-bloom="primary"
                                      className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold rounded text-xs"
                                    >
                                      Analyze
                                    </NavLink>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Add Employee Slide-in Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div
            id="modal-add-employee-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddModalOpen(false);
            }}
          >
            <motion.div
              id="modal-add-employee-container"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hud-card-outer shadow-layer-panel w-full max-w-lg p-[1px] my-8"
            >
              <div className="hud-card-inner p-6 sm:p-7 space-y-6">
                {/* Modal Header */}
                <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <UserPlus className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Personnel Provisioning
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Add Enterprise Specialist
                    </h2>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Register a retention strategist to receive automated churn evaluation assignments.
                    </p>
                  </div>
                  <button
                    id="btn-close-add-modal"
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Error Banner */}
                {formError && (
                  <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Form Fields */}
                <form id="form-add-employee" onSubmit={handleAddEmployeeSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="input-employee-name" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Full Name <span className="text-zinc-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-employee-name"
                        type="text"
                        placeholder="e.g. Sarah Jenkins"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({ ...formData, fullName: e.target.value });
                          if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: null });
                        }}
                        className={`w-full bg-zinc-900/90 border ${
                          fieldErrors.fullName ? 'border-red-500' : 'border-zinc-800'
                        } rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition-colors`}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-[11px] text-red-400 mt-1">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label htmlFor="input-employee-email" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Corporate Email <span className="text-zinc-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                      <input
                        id="input-employee-email"
                        type="email"
                        placeholder="s.jenkins@enterprise.internal"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null });
                        }}
                        className={`w-full bg-zinc-900/90 border ${
                          fieldErrors.email ? 'border-red-500' : 'border-zinc-800'
                        } rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition-colors`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-[11px] text-red-400 mt-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Job Title & Department Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Job Title */}
                    <div>
                      <label htmlFor="input-employee-role" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Job Title <span className="text-zinc-400">*</span>
                      </label>
                      <input
                        id="input-employee-role"
                        type="text"
                        placeholder="e.g. Senior Retention Specialist"
                        value={formData.jobTitle}
                        onChange={(e) => {
                          setFormData({ ...formData, jobTitle: e.target.value });
                          if (fieldErrors.jobTitle) setFieldErrors({ ...fieldErrors, jobTitle: null });
                        }}
                        className={`w-full bg-zinc-900/90 border ${
                          fieldErrors.jobTitle ? 'border-red-500' : 'border-zinc-800'
                        } rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition-colors`}
                      />
                      {fieldErrors.jobTitle && (
                        <p className="text-[11px] text-red-400 mt-1">{fieldErrors.jobTitle}</p>
                      )}
                    </div>

                    {/* Department Dropdown */}
                    <div>
                      <label htmlFor="select-employee-dept" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Department <span className="text-zinc-400">*</span>
                      </label>
                      <div className="select-bloom-wrapper">
                        <select
                          id="select-employee-dept"
                          value={formData.department}
                          onChange={(e) => {
                            setFormData({ ...formData, department: e.target.value });
                            if (fieldErrors.department) setFieldErrors({ ...fieldErrors, department: null });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                        >
                          {STANDARD_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      {fieldErrors.department && (
                        <p className="text-[11px] text-red-400 mt-1">{fieldErrors.department}</p>
                      )}
                    </div>
                  </div>

                  {/* Starting Assigned Tasks (Optional) */}
                  <div>
                    <label htmlFor="input-employee-tasks" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Starting Assigned Tasks <span className="text-zinc-500 font-normal">(Default 0)</span>
                    </label>
                    <input
                      id="input-employee-tasks"
                      type="number"
                      min="0"
                      max="25"
                      value={formData.assignedTasks}
                      onChange={(e) => setFormData({ ...formData, assignedTasks: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 transition-colors tabular-nums font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Optionally provisions initial unassigned queue tasks to this specialist immediately.
                    </p>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-4 flex items-center justify-end space-x-3 border-t border-zinc-800/80">
                    <button
                      id="btn-cancel-add-employee"
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <BloomButton
                      id="btn-submit-add-employee"
                      type="submit"
                      variant="primary"
                      disabled={submitting}
                      className="px-5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                          <span>Provisioning...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-zinc-950" />
                          <span>Confirm & Save</span>
                        </>
                      )}
                    </BloomButton>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Success Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            id="toast-success-employee"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 max-w-md backdrop-blur-xl"
          >
            <div className="w-6 h-6 bg-white text-zinc-950 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white leading-tight">Employee Added</div>
              <div className="text-[11px] text-zinc-300 leading-tight mt-0.5 truncate">
                {toastMessage}
              </div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Edit Specialist Modal */}
      <AnimatePresence>
        {editingEmp && (
          <div
            id="modal-edit-employee-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingEmp(null);
            }}
          >
            <motion.div
              id="modal-edit-employee-container"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hud-card-outer shadow-layer-panel w-full max-w-lg p-[1px] my-8"
            >
              <div className="hud-card-inner p-6 sm:p-7 space-y-6">
                <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Pencil className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Personnel Management
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      Edit Specialist Profile
                    </h2>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Update corporate identity, job responsibilities, and department assignment.
                    </p>
                  </div>
                  <button
                    id="btn-close-edit-modal"
                    onClick={() => setEditingEmp(null)}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {editFormError && (
                  <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{editFormError}</span>
                  </div>
                )}

                <form id="form-edit-employee" onSubmit={handleEditEmployeeSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="input-edit-employee-name" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Full Name <span className="text-zinc-400">*</span>
                    </label>
                    <input
                      id="input-edit-employee-name"
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />
                    {editFieldErrors.fullName && (
                      <p className="text-[11px] text-red-400 mt-1">{editFieldErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="input-edit-employee-email" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                      Corporate Email <span className="text-zinc-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                      <input
                        id="input-edit-employee-email"
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    {editFieldErrors.email && (
                      <p className="text-[11px] text-red-400 mt-1">{editFieldErrors.email}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="input-edit-employee-role" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Job Title <span className="text-zinc-400">*</span>
                      </label>
                      <input
                        id="input-edit-employee-role"
                        type="text"
                        value={editFormData.jobTitle}
                        onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                        className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                      {editFieldErrors.jobTitle && (
                        <p className="text-[11px] text-red-400 mt-1">{editFieldErrors.jobTitle}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="select-edit-employee-dept" className="block text-xs font-semibold text-zinc-200 mb-1.5">
                        Department <span className="text-zinc-400">*</span>
                      </label>
                      <select
                        id="select-edit-employee-dept"
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        {STANDARD_DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end space-x-3 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setEditingEmp(null)}
                      className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <BloomButton
                      id="btn-submit-edit-employee"
                      type="submit"
                      variant="primary"
                      disabled={editSubmitting}
                      className="px-5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2"
                    >
                      {editSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </BloomButton>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Delete Specialist Confirmation Dialog */}
      <AnimatePresence>
        {deletingEmp && (
          <div
            id="modal-delete-employee"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeletingEmp(null);
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
                      Delete Retention Specialist
                    </h3>
                    <span className="text-[11px] text-zinc-400">Personnel Removal</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Are you sure you want to remove specialist{' '}
                  <span className="font-semibold text-white">"{deletingEmp.full_name || deletingEmp.name}"</span> from the roster?
                </p>

                {/* Explicit Active Task Warning */}
                {(deletingEmp.task_count > 0 || (deletingEmp.tasks && deletingEmp.tasks.length > 0)) ? (
                  <div id="notice-active-tasks" className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs space-y-1.5 text-amber-200">
                    <div className="flex items-center space-x-2 font-semibold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>Active Task Assignment Notice</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      This specialist has <span className="font-bold underline">{deletingEmp.task_count || deletingEmp.tasks?.length} active task(s)</span> assigned.
                      Deleting will safely unassign these tasks and return them to the global unassigned queue rather than orphaning them.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Department:</span>
                      <span className="font-semibold text-white">{deletingEmp.department}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Active Workload:</span>
                      <span className="text-zinc-400">0 tasks assigned</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-3">
                  <button
                    id="btn-cancel-delete-employee"
                    type="button"
                    onClick={() => setDeletingEmp(null)}
                    className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <BloomButton
                    id="btn-confirm-delete-employee"
                    variant="danger"
                    disabled={deletingLoading}
                    onClick={handleDeleteEmployeeConfirm}
                    className="px-4 py-2 text-xs font-bold text-white bg-red-900/80 hover:bg-red-800 border border-red-700/80 rounded-lg flex items-center space-x-1.5"
                  >
                    {deletingLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Removing...</span>
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
