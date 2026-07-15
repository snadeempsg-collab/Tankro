/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Calendar,
  User,
  LogOut,
  TrendingUp,
  PlusCircle,
  Database,
  Users,
  UserCheck,
  Download,
  AlertCircle,
  Clock,
  ArrowRight,
  Wallet,
  Settings,
  HelpCircle,
  CheckCircle2,
  ListFilter,
  Info
} from 'lucide-react';

import { Job, Expense, DailyAttendance, AppSettings } from './types';
import {
  SAMPLE_JOBS,
  SAMPLE_EXPENSES,
  SAMPLE_ATTENDANCE,
  DEFAULT_SETTINGS,
  formatInRupees,
  getTodayDateString,
  getDaysRemaining,
  addMonths
} from './utils';

import { db } from './lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

// Import Child Components
import OwnerSelector from './components/OwnerSelector';
import JobForm from './components/JobForm';
import ExpenseForm from './components/ExpenseForm';
import AttendanceModule from './components/AttendanceModule';
import CustomerHistory from './components/CustomerHistory';
import SubscriptionList from './components/SubscriptionList';
import RecordsPage from './components/RecordsPage';
import ReportsPage from './components/ReportsPage';
import InvoiceModal from './components/InvoiceModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'records' | 'crm' | 'attendance'>('dashboard');
  const [logSubTab, setLogSubTab] = useState<'job' | 'expense'>('job');
  const [crmSubTab, setCrmSubTab] = useState<'customers' | 'subscriptions'>('customers');
  const [recordsSubTab, setRecordsSubTab] = useState<'jobs' | 'expenses'>('jobs');

  // Core App Data States
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>([]);
  const [customerNotes, setCustomerNotes] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Active Interactive/Modals State
  const [selectedInvoiceJob, setSelectedInvoiceJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Toast notifications & custom confirm state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: 'success' | 'error' | 'info' }>;
      if (customEvent.detail) {
        const msg = customEvent.detail.message || '';
        let type: 'success' | 'error' | 'info' = 'success';
        if (
          msg.toLowerCase().includes('denied') ||
          msg.toLowerCase().includes('authorized') ||
          msg.toLowerCase().includes('please enter') ||
          msg.toLowerCase().includes('invalid') ||
          msg.toLowerCase().includes('error')
        ) {
          type = 'error';
        }
        setToast({ message: msg, type });
      }
    };

    window.addEventListener('show-toast', handleToastEvent);
    return () => {
      window.removeEventListener('show-toast', handleToastEvent);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load from local storage or initialize with sample data & Firebase subscriptions
  useEffect(() => {
    // 1. Initialize Settings synchronously from local storage (to avoid splash/flicker)
    const savedSettings = localStorage.getItem('tankro_settings');
    let initialSettings = DEFAULT_SETTINGS;
    if (savedSettings) {
      try {
        initialSettings = JSON.parse(savedSettings);
        setSettings(initialSettings);
      } catch (e) {
        console.error(e);
      }
    }

    // Load other states from local storage as offline fallback first
    const savedJobs = localStorage.getItem('tankro_jobs');
    const savedExpenses = localStorage.getItem('tankro_expenses');
    const savedAttendance = localStorage.getItem('tankro_attendance');
    const savedNotes = localStorage.getItem('tankro_customer_notes');

    if (savedJobs) setJobs(JSON.parse(savedJobs));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    if (savedAttendance) setAttendanceRecords(JSON.parse(savedAttendance));
    if (savedNotes) setCustomerNotes(JSON.parse(savedNotes));

    // 2. Setup real-time Firebase subscriptions
    const unsubscribeJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      const items: Job[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Job);
      });
      // Sort: newest first
      items.sort((a, b) => b.id.localeCompare(a.id));

      if (snapshot.empty) {
        // Seed Firestore if empty
        const initialJobs = savedJobs ? JSON.parse(savedJobs) : SAMPLE_JOBS;
        initialJobs.forEach((j: Job) => {
          setDoc(doc(db, 'jobs', j.id), j).catch(err => console.error(err));
        });
        setJobs(initialJobs);
        localStorage.setItem('tankro_jobs', JSON.stringify(initialJobs));
      } else {
        setJobs(items);
        localStorage.setItem('tankro_jobs', JSON.stringify(items));
      }
    }, (error) => {
      console.error("Error listening to jobs:", error);
    });

    const unsubscribeExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const items: Expense[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Expense);
      });
      items.sort((a, b) => b.id.localeCompare(a.id));

      if (snapshot.empty) {
        // Seed Firestore if empty
        const initialExpenses = savedExpenses ? JSON.parse(savedExpenses) : SAMPLE_EXPENSES;
        initialExpenses.forEach((e: Expense) => {
          setDoc(doc(db, 'expenses', e.id), e).catch(err => console.error(err));
        });
        setExpenses(initialExpenses);
        localStorage.setItem('tankro_expenses', JSON.stringify(initialExpenses));
      } else {
        setExpenses(items);
        localStorage.setItem('tankro_expenses', JSON.stringify(items));
      }
    }, (error) => {
      console.error("Error listening to expenses:", error);
    });

    const unsubscribeAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const items: DailyAttendance[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as DailyAttendance);
      });
      items.sort((a, b) => b.date.localeCompare(a.date));

      if (snapshot.empty) {
        // Seed Firestore if empty
        const initialAttendance = savedAttendance ? JSON.parse(savedAttendance) : SAMPLE_ATTENDANCE;
        initialAttendance.forEach((a: DailyAttendance) => {
          setDoc(doc(db, 'attendance', a.id), a).catch(err => console.error(err));
        });
        setAttendanceRecords(initialAttendance);
        localStorage.setItem('tankro_attendance', JSON.stringify(initialAttendance));
      } else {
        setAttendanceRecords(items);
        localStorage.setItem('tankro_attendance', JSON.stringify(items));
      }
    }, (error) => {
      console.error("Error listening to attendance:", error);
    });

    const unsubscribeCustomerNotes = onSnapshot(collection(db, 'customerNotes'), (snapshot) => {
      const notesDict: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        notesDict[doc.id] = data.text || '';
      });

      if (snapshot.empty) {
        // Seed Firestore if empty
        const startingNotes: Record<string, string> = savedNotes ? JSON.parse(savedNotes) : {
          'Karthik Raja||9842512345': 'sump is near back gate, prefers morning service',
          'Senthil Kumar||9786432101': 'has 2 tanks on rooftop, ladder needed',
          'Anitha Srinivasan||9443212345': 'very friendly customer, has active borewell',
        };
        Object.entries(startingNotes).forEach(([key, val]) => {
          setDoc(doc(db, 'customerNotes', key), { id: key, text: val }).catch(err => console.error(err));
        });
        setCustomerNotes(startingNotes);
        localStorage.setItem('tankro_customer_notes', JSON.stringify(startingNotes));
      } else {
        setCustomerNotes(notesDict);
        localStorage.setItem('tankro_customer_notes', JSON.stringify(notesDict));
      }
    }, (error) => {
      console.error("Error listening to customer notes:", error);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'wages'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.dailyWages) {
          setSettings((prev) => {
            const merged = {
              ...prev,
              dailyWages: data.dailyWages
            };
            localStorage.setItem('tankro_settings', JSON.stringify(merged));
            return merged;
          });
        }
      } else {
        const defaultWages = initialSettings.dailyWages || DEFAULT_SETTINGS.dailyWages;
        setDoc(doc(db, 'settings', 'wages'), { dailyWages: defaultWages }).catch(err => console.error(err));
      }
    }, (error) => {
      console.error("Error listening to settings:", error);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeExpenses();
      unsubscribeAttendance();
      unsubscribeCustomerNotes();
      unsubscribeSettings();
    };
  }, []);

  // Sync state helpers (with local cache + remote firestore updates)
  const saveJobsToStore = (updatedJobs: Job[]) => {
    setJobs(updatedJobs);
    localStorage.setItem('tankro_jobs', JSON.stringify(updatedJobs));
  };

  const saveExpensesToStore = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
    localStorage.setItem('tankro_expenses', JSON.stringify(updatedExpenses));
  };

  const saveAttendanceToStore = (updatedAttendance: DailyAttendance[]) => {
    setAttendanceRecords(updatedAttendance);
    localStorage.setItem('tankro_attendance', JSON.stringify(updatedAttendance));
  };

  const saveCustomerNotesToStore = (key: string, notes: string) => {
    const updatedNotes = { ...customerNotes, [key]: notes };
    setCustomerNotes(updatedNotes);
    localStorage.setItem('tankro_customer_notes', JSON.stringify(updatedNotes));
    setDoc(doc(db, 'customerNotes', key), { id: key, text: notes }).catch(err => console.error(err));
  };

  const saveSettingsToStore = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('tankro_settings', JSON.stringify(newSettings));
    setDoc(doc(db, 'settings', 'wages'), { dailyWages: newSettings.dailyWages }).catch(err => console.error(err));
  };

  // Owner Selection handler
  const handleSelectUser = (owner: 'Yuvaraj' | 'Nadeem' | 'Akram', role: 'Owner' | 'Manager') => {
    const updated = { ...settings, currentOwner: owner, currentUserRole: role };
    saveSettingsToStore(updated);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    const updated = { ...settings, currentOwner: null as any, currentUserRole: null as any };
    saveSettingsToStore(updated);
    setShowLogoutConfirm(false);
  };

  // JOB MANAGEMENT CRUD
  const handleAddJob = (job: Job) => {
    const updated = [job, ...jobs];
    saveJobsToStore(updated);
    setDoc(doc(db, 'jobs', job.id), job).catch(err => console.error(err));
    // Show invoice instantly for convenience!
    setSelectedInvoiceJob(job);
    setRecordsSubTab('jobs');
    // Notify success
    alert('Job successfully registered!');
  };

  const handleEditJobComplete = (updatedJob: Job) => {
    const updated = jobs.map((j) => (j.id === updatedJob.id ? updatedJob : j));
    saveJobsToStore(updated);
    setDoc(doc(db, 'jobs', updatedJob.id), updatedJob).catch(err => console.error(err));
    setEditingJob(null);
    alert('Job updated successfully!');
    setRecordsSubTab('jobs');
    setActiveTab('records');
  };

  const handleDeleteJob = (jobId: string) => {
    const updated = jobs.filter((j) => j.id !== jobId);
    saveJobsToStore(updated);
    deleteDoc(doc(db, 'jobs', jobId)).catch(err => console.error(err));
    alert('Job record successfully deleted!');
  };

  const handleMarkJobAsPaid = (jobId: string) => {
    const updated = jobs.map((j) => (j.id === jobId ? { ...j, paymentStatus: 'Paid' as const } : j));
    saveJobsToStore(updated);
    const targetJob = jobs.find((j) => j.id === jobId);
    if (targetJob) {
      setDoc(doc(db, 'jobs', jobId), { ...targetJob, paymentStatus: 'Paid' as const }).catch(err => console.error(err));
    }
    alert('Payment marked as Paid!');
  };

  // EXPENSE MANAGEMENT CRUD
  const handleAddExpense = (expense: Expense) => {
    const updated = [expense, ...expenses];
    saveExpensesToStore(updated);
    setDoc(doc(db, 'expenses', expense.id), expense).catch(err => console.error(err));
    alert('Expense successfully logged!');
    setRecordsSubTab('expenses');
    setActiveTab('records');
  };

  const handleEditExpenseComplete = (updatedExpense: Expense) => {
    const updated = expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
    saveExpensesToStore(updated);
    setDoc(doc(db, 'expenses', updatedExpense.id), updatedExpense).catch(err => console.error(err));
    setEditingExpense(null);
    alert('Expense updated successfully!');
    setRecordsSubTab('expenses');
    setActiveTab('records');
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updated = expenses.filter((e) => e.id !== expenseId);
    saveExpensesToStore(updated);
    deleteDoc(doc(db, 'expenses', expenseId)).catch(err => console.error(err));
    alert('Expense successfully deleted!');
  };

  // ATTENDANCE SAVER
  const handleSaveAttendance = (dailyRecord: DailyAttendance) => {
    const existingIdx = attendanceRecords.findIndex((r) => r.date === dailyRecord.date);
    let updated: DailyAttendance[] = [];
    if (existingIdx >= 0) {
      updated = [...attendanceRecords];
      updated[existingIdx] = dailyRecord;
    } else {
      updated = [dailyRecord, ...attendanceRecords];
    }
    saveAttendanceToStore(updated);
    setDoc(doc(db, 'attendance', dailyRecord.id), dailyRecord).catch(err => console.error(err));
  };

  // TRACE ACTIVE SUBSCRIPTIONS & OVERDUES (Alert Card logic)
  const todayStr = getTodayDateString();
  const getSubscriptionAlerts = () => {
    const subMap: Record<string, Job> = {};
    jobs.forEach((j) => {
      if (j.jobType === 'Subscription' && j.nextServiceDueDate) {
        const key = `${j.customerName.trim()}||${j.customerPhone.trim()}`;
        const existing = subMap[key];
        if (!existing || new Date(j.date) > new Date(existing.date)) {
          subMap[key] = j;
        }
      }
    });

    const activeSubs = Object.values(subMap);
    const overdueCount = activeSubs.filter((s) => getDaysRemaining(s.nextServiceDueDate!) < 0).length;
    const dueSoonCount = activeSubs.filter((s) => {
      const rem = getDaysRemaining(s.nextServiceDueDate!);
      return rem >= 0 && rem <= 7;
    }).length;

    return {
      overdueCount,
      dueSoonCount,
      totalAlerts: overdueCount + dueSoonCount,
    };
  };

  const subAlerts = getSubscriptionAlerts();

  // DASHBOARD MATH COMPUTATIONS
  const getDashboardStats = () => {
    const todayStr = getTodayDateString();

    // Today's numbers
    const todayJobs = jobs.filter((j) => j.date === todayStr);
    const todayExpenses = expenses.filter((e) => e.date === todayStr);

    const todayRev = todayJobs.reduce((sum, curr) => sum + curr.grandTotal, 0);
    const todayExp = todayExpenses.reduce((sum, curr) => sum + curr.amount, 0);
    const todayProfit = todayRev - todayExp;
    const todayJobsCompleted = todayJobs.length;

    // Weekly numbers (Current ISO week starting Monday)
    const today = new Date();
    const day = today.getDay();
    const mondayDiff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(mondayDiff));
    startOfWeek.setHours(0, 0, 0, 0);

    const weekJobs = jobs.filter((j) => {
      const jd = new Date(j.date);
      jd.setHours(0, 0, 0, 0);
      return jd >= startOfWeek && jd <= new Date();
    });
    const weekExpenses = expenses.filter((e) => {
      const ed = new Date(e.date);
      ed.setHours(0, 0, 0, 0);
      return ed >= startOfWeek && ed <= new Date();
    });

    const weekRev = weekJobs.reduce((sum, curr) => sum + curr.grandTotal, 0);
    const weekExp = weekExpenses.reduce((sum, curr) => sum + curr.amount, 0);
    const weekProfit = weekRev - weekExp;

    // Monthly numbers
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const monthJobs = jobs.filter((j) => {
      const jd = new Date(j.date);
      return jd >= startOfMonth && jd <= new Date();
    });
    const monthExpenses = expenses.filter((e) => {
      const ed = new Date(e.date);
      return ed >= startOfMonth && ed <= new Date();
    });

    const monthRev = monthJobs.reduce((sum, curr) => sum + curr.grandTotal, 0);
    const monthExp = monthExpenses.reduce((sum, curr) => sum + curr.amount, 0);
    const monthProfit = monthRev - monthExp;

    // Pending counts
    const pendingCount = jobs.filter((j) => j.paymentStatus === 'Pending').length;

    return {
      todayRev,
      todayExp,
      todayProfit,
      todayJobsCompleted,
      weekRev,
      weekExp,
      weekProfit,
      monthRev,
      monthExp,
      monthProfit,
      pendingCount,
    };
  };

  const stats = getDashboardStats();

  // EXPORT UTILITIES (CSV DOWNLOADERS)
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJobsCSV = () => {
    const headers = [
      'Job ID',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Customer Address',
      'Area',
      'Capacity (L)',
      'Tanks Count',
      'Distance (KM)',
      'Staff Assigned',
      'Service Type',
      'Billing Subtotal',
      'GST (18%) Amount',
      'Grand Total Amount',
      'Payment Status',
      'Payment Mode',
      'Next Due Date',
      'Notes'
    ];
    const rows = jobs.map((j) => [
      j.id,
      j.date,
      `"${j.customerName.replace(/"/g, '""')}"`,
      j.customerPhone,
      `"${j.customerAddress.replace(/"/g, '""')}"`,
      j.area === 'Other' ? (j.otherAreaText || 'Other') : j.area,
      j.tankCapacity,
      j.numTanks,
      j.distance,
      j.staffAssigned.join(';'),
      j.jobType,
      j.subtotal,
      j.gstAmount,
      j.grandTotal,
      j.paymentStatus,
      j.paymentMode,
      j.nextServiceDueDate || 'N/A',
      j.notes ? `"${j.notes.replace(/"/g, '""')}"` : ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(`Tankro_Sathy_Jobs_${getTodayDateString()}.csv`, csvContent);
  };

  const exportExpensesCSV = () => {
    const headers = ['Expense ID', 'Date', 'Category', 'Amount (₹)', 'Paid By', 'Notes'];
    const rows = expenses.map((e) => [
      e.id,
      e.date,
      e.category,
      e.amount,
      e.paidBy,
      e.notes ? `"${e.notes.replace(/"/g, '""')}"` : ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(`Tankro_Sathy_Expenses_${getTodayDateString()}.csv`, csvContent);
  };

  const exportAttendanceCSV = () => {
    const headers = ['Date', 'Althaf Status', 'Althaf Wage', 'Nafees Status', 'Nafees Wage', 'Akram Status', 'Akram Wage'];
    const rows = attendanceRecords.map((a) => [
      a.date,
      a.records.Althaf || 'Absent',
      a.wages.Althaf || 0,
      a.records.Nafees || 'Absent',
      a.wages.Nafees || 0,
      a.records.Akram || 'Absent',
      a.wages.Akram || 0
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(`Tankro_Sathy_Attendance_${getTodayDateString()}.csv`, csvContent);
  };

  // TRIGGER EDITING UTILITIES
  const triggerEditJob = (job: Job) => {
    setEditingJob(job);
    setLogSubTab('job');
    setActiveTab('log');
  };

  const triggerEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setLogSubTab('expense');
    setActiveTab('log');
  };

  const handleQuickLogSubscriptionJob = (completedJob: Job) => {
    // Inject and save this job in state
    const updated = [completedJob, ...jobs];
    saveJobsToStore(updated);
    setDoc(doc(db, 'jobs', completedJob.id), completedJob).catch(err => console.error(err));
  };

  // If no owner is logged in yet, prompt selection
  if (!settings.currentOwner) {
    return <OwnerSelector onSelect={handleSelectUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans select-none pb-[calc(100px+env(safe-area-inset-bottom,0px))] md:pb-0" id="app-root-container">
      {/* Desktop Left Sidebar (Sleek Theme Layout Pattern) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 sticky top-0 h-screen z-40 print:hidden" id="desktop-sidebar">
        {/* Logo block */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden shrink-0 shadow-md">
            <img
              src="/src/assets/images/tankro_logo_new_1784019299723.jpg"
              alt="Tankro Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-blue-900 font-display block leading-none">Tankro Sathy</span>
            <span className="text-[10px] text-blue-600 font-bold mt-1 block">Tankro Sathy</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 px-4 space-y-1" id="desktop-nav-menu">
          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('dashboard');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-home"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setLogSubTab('job');
              setActiveTab('log');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'log' && logSubTab === 'job'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-add-job"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Add New Job</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setLogSubTab('expense');
              setActiveTab('log');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'log' && logSubTab === 'expense'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-add-expense"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('attendance');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-attendance"
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Staff Attendance</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('records');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'records'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-records"
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Records Database</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setEditingExpense(null);
              setActiveTab('crm');
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              activeTab === 'crm'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="desktop-nav-crm"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Client Profiles</span>
          </button>
        </nav>

        {/* Owner status at bottom of sidebar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2" id="desktop-sidebar-footer">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-800 text-xs font-bold shrink-0">
              {settings.currentOwner ? settings.currentOwner.charAt(0).toUpperCase() : 'Y'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{settings.currentOwner}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                {settings.currentUserRole || 'Owner'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
            id="desktop-logout-btn"
            title="Change Owner / Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Right Side Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0" id="main-scroll-container">
        {/* Mobile Header (Sticky top, only shown on mobile) */}
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 p-4 shadow-xs flex items-center justify-between" id="app-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 overflow-hidden shrink-0 shadow-sm">
              <img
                src="/src/assets/images/tankro_logo_new_1784019299723.jpg"
                alt="Tankro Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-xs tracking-tight font-display leading-tight">
                Tankro Sathy
              </h1>
              <p className="text-[8px] text-blue-600 font-bold leading-none mt-0.5">
                Sathy • Gobi • Punjai Puliampatti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleLogout}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-slate-200/60"
              id="logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold">{settings.currentOwner}</span>
            </button>
          </div>
        </header>

        {/* Desktop Top Header (Sticky top, only shown on desktop) */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between sticky top-0 z-30 print:hidden" id="desktop-app-header">
          <h1 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <span className="bg-slate-100/80 px-2.5 py-1 rounded-lg text-slate-600 font-medium font-mono text-[10px] tracking-wider uppercase">Today's Date</span>
            <span className="text-slate-500 font-semibold font-display text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
              {todayStr}
            </span>
          </h1>
          <div className="flex gap-2.5">
            <button
              onClick={() => {
                setEditingJob(null);
                setLogSubTab('job');
                setActiveTab('log');
              }}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer"
              id="desktop-header-add-job"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Job
            </button>
            <button
              onClick={() => {
                setEditingExpense(null);
                setLogSubTab('expense');
                setActiveTab('log');
              }}
              className="px-3.5 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              id="desktop-header-add-expense"
            >
              Add Expense
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full overflow-y-auto" id="main-content">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              /* TAB 1: DASHBOARD */
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* Welcome Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Hello, {settings.currentOwner}!
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ready for today's tank cleanings? Keep tracking daily jobs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Today: {todayStr}</span>
                  </div>
                </div>

                {/* Subscription Alerts Card */}
                {subAlerts.totalAlerts > 0 && (
                  <div
                    onClick={() => {
                      setActiveTab('crm');
                      setCrmSubTab('subscriptions');
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-3xl shadow-lg shadow-amber-100 flex items-center justify-between cursor-pointer transition-all"
                    id="upcoming-subscriptions-alert-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Recurring Services Due Soon!</h4>
                        <p className="text-xs text-amber-100 mt-0.5">
                          {subAlerts.overdueCount > 0 && `${subAlerts.overdueCount} OVERDUE. `}
                          {subAlerts.dueSoonCount > 0 && `${subAlerts.dueSoonCount} due within 7 days.`} Tap to view and schedule.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/80" />
                  </div>
                )}

                {/* Core Summaries Grids */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center sm:text-left">
                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Today's Revenue</p>
                    <p className="text-lg font-extrabold text-blue-600 mt-1">{formatInRupees(stats.todayRev)}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{stats.todayJobsCompleted} jobs done</p>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center sm:text-left">
                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Today's Expenses</p>
                    <p className="text-lg font-extrabold text-red-500 mt-1">{formatInRupees(stats.todayExp)}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">supplies & fuel</p>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center sm:text-left">
                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Today's Profit</p>
                    <p className={`text-lg font-extrabold mt-1 ${stats.todayProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatInRupees(stats.todayProfit)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">daily net margin</p>
                  </div>

                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm text-center sm:text-left">
                    <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">Pending Payments</p>
                    <p className="text-lg font-extrabold text-amber-600 mt-1">{stats.pendingCount}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">awaiting collection</p>
                  </div>
                </div>

                {/* Quick Actions Buttons Row */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-800 text-xs">Quick Actions</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setEditingJob(null);
                        setLogSubTab('job');
                        setActiveTab('log');
                      }}
                      className="flex flex-col items-center justify-center p-4 bg-blue-50/60 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 rounded-2xl text-center font-bold text-blue-700 transition-all cursor-pointer"
                      id="qa-add-job"
                    >
                      <PlusCircle className="w-5 h-5 mb-2" />
                      <span className="text-[10px]">Add New Job</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingExpense(null);
                        setLogSubTab('expense');
                        setActiveTab('log');
                      }}
                      className="flex flex-col items-center justify-center p-4 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-2xl text-center font-bold text-red-700 transition-all cursor-pointer"
                      id="qa-add-expense"
                    >
                      <Wallet className="w-5 h-5 mb-2" />
                      <span className="text-[10px]">Add Expense</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('attendance');
                      }}
                      className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-center font-bold text-slate-700 transition-all cursor-pointer"
                      id="qa-attendance"
                    >
                      <UserCheck className="w-5 h-5 mb-2 text-slate-600" />
                      <span className="text-[10px]">Attendance</span>
                    </button>
                  </div>
                </div>

                {/* Monthly Cumulative Financial Cards */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm">Monthly & Weekly Payroll / Business Balances</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">Weekly Net Profit</p>
                      <p className="text-base font-black text-blue-700 mt-1">{formatInRupees(stats.weekProfit)}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Rev: {formatInRupees(stats.weekRev)} | Exp: {formatInRupees(stats.weekExp)}</p>
                    </div>
                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">Monthly Net Profit</p>
                      <p className="text-base font-black text-emerald-700 mt-1">{formatInRupees(stats.monthProfit)}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Rev: {formatInRupees(stats.monthRev)} | Exp: {formatInRupees(stats.monthExp)}</p>
                    </div>
                  </div>
                </div>

                {/* Embedded Interactive Reports page (under Dashboard tab) */}
                <div className="pt-2">
                  <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Analytics Report Dashboard
                  </h2>
                  <ReportsPage
                    jobs={jobs}
                    expenses={expenses}
                    onMarkJobAsPaid={handleMarkJobAsPaid}
                    onViewInvoice={(job) => setSelectedInvoiceJob(job)}
                  />
                </div>

                {/* Data Export Center Panel */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setShowExportPanel(!showExportPanel)}
                    className="w-full flex items-center justify-between font-bold text-slate-700 text-xs cursor-pointer"
                    id="toggle-export-btn"
                  >
                    <span className="flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-blue-500" />
                      Excel/CSV Data Export Center
                    </span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500">
                      {showExportPanel ? 'Collapse' : 'Expand'}
                    </span>
                  </button>

                  {showExportPanel && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 animate-fade-in">
                      <button
                        onClick={exportJobsCSV}
                        className="flex items-center justify-center gap-1.5 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-100 text-xs cursor-pointer"
                        id="export-jobs-csv"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export Jobs CSV
                      </button>
                      <button
                        onClick={exportExpensesCSV}
                        className="flex items-center justify-center gap-1.5 p-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-100 text-xs cursor-pointer"
                        id="export-expenses-csv"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export Expenses CSV
                      </button>
                      <button
                        onClick={exportAttendanceCSV}
                        className="flex items-center justify-center gap-1.5 p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs cursor-pointer"
                        id="export-attendance-csv"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export Payroll CSV
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'log' && (
              /* TAB 2: LOG NEW ENTRIES (JOBS & EXPENSES) */
              <motion.div
                key="log-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Form Toggles */}
                <div className="flex bg-slate-100 p-1 rounded-2xl max-w-xs mx-auto text-xs">
                  <button
                    onClick={() => {
                      setEditingJob(null);
                      setLogSubTab('job');
                    }}
                    className={`flex-1 text-center py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      logSubTab === 'job' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    id="subtab-job-form"
                  >
                    Jobs Form
                  </button>
                  <button
                    onClick={() => {
                      setEditingExpense(null);
                      setLogSubTab('expense');
                    }}
                    className={`flex-1 text-center py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      logSubTab === 'expense' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    id="subtab-expense-form"
                  >
                    Expenses Form
                  </button>
                </div>

                {logSubTab === 'job' ? (
                  <JobForm
                    onAddJob={handleAddJob}
                    existingJobs={jobs}
                    initialJobToEdit={editingJob}
                    onEditComplete={handleEditJobComplete}
                    onCancelEdit={() => {
                      setEditingJob(null);
                      setActiveTab('records');
                    }}
                  />
                ) : (
                  <ExpenseForm
                    onAddExpense={handleAddExpense}
                    initialExpenseToEdit={editingExpense}
                    onEditComplete={handleEditExpenseComplete}
                    onCancelEdit={() => {
                      setEditingExpense(null);
                      setActiveTab('records');
                    }}
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'records' && (
              /* TAB 3: RECORDS TABLE DATABASE */
              <motion.div
                key="records-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Database className="w-5 h-5 text-blue-500" />
                    Database Browser (Jobs / Expenses Records)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Edit, delete or view invoices of logged entries
                  </p>
                </div>

                <RecordsPage
                  jobs={jobs}
                  expenses={expenses}
                  onDeleteJob={handleDeleteJob}
                  onDeleteExpense={handleDeleteExpense}
                  onTriggerEditJob={triggerEditJob}
                  onTriggerEditExpense={triggerEditExpense}
                  onViewInvoice={(job) => setSelectedInvoiceJob(job)}
                  defaultSubTab={recordsSubTab}
                  settings={settings}
                />
              </motion.div>
            )}

            {activeTab === 'crm' && (
              /* TAB 4: CRM (CUSTOMERS & SUBSCRIPTIONS) */
              <motion.div
                key="crm-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Form Toggles */}
                <div className="flex bg-slate-100 p-1 rounded-2xl max-w-xs mx-auto text-xs">
                  <button
                    onClick={() => setCrmSubTab('customers')}
                    className={`flex-1 text-center py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      crmSubTab === 'customers' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    id="subtab-crm-customers"
                  >
                    Customer Profiles
                  </button>
                  <button
                    onClick={() => setCrmSubTab('subscriptions')}
                    className={`flex-1 text-center py-2 rounded-xl font-bold transition-all cursor-pointer ${
                      crmSubTab === 'subscriptions' ? 'bg-blue-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    id="subtab-crm-subscriptions"
                  >
                    Subscriptions ({subAlerts.totalAlerts > 0 ? `${subAlerts.totalAlerts} Alert` : 'Active'})
                  </button>
                </div>

                {crmSubTab === 'customers' ? (
                  <CustomerHistory
                    jobs={jobs}
                    customerNotes={customerNotes}
                    onSaveCustomerNotes={saveCustomerNotesToStore}
                    onMarkJobAsPaid={handleMarkJobAsPaid}
                  />
                ) : (
                  <SubscriptionList
                    jobs={jobs}
                    onQuickLogJob={handleQuickLogSubscriptionJob}
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'attendance' && (
              /* TAB 5: STAFF ATTENDANCE */
              <motion.div
                key="attendance-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <AttendanceModule
                  attendanceRecords={attendanceRecords}
                  settings={settings}
                  onSaveAttendance={handleSaveAttendance}
                  onUpdateSettings={saveSettingsToStore}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Persistent Bottom Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-150 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] shadow-2xl flex justify-around items-center md:hidden print:hidden" id="bottom-navigation-bar">
        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('dashboard');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'dashboard' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="nav-btn-home"
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Home</span>
        </button>

        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('log');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'log' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="nav-btn-log"
        >
          <PlusCircle className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Log Work</span>
        </button>

        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('records');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'records' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="nav-btn-records"
        >
          <Database className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Database</span>
        </button>

        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('crm');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'crm' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="nav-btn-crm"
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Clients</span>
        </button>

        <button
          onClick={() => {
            setEditingJob(null);
            setEditingExpense(null);
            setActiveTab('attendance');
          }}
          className={`flex flex-col items-center justify-center p-1 font-bold transition-all cursor-pointer w-16 ${
            activeTab === 'attendance' ? 'text-blue-500 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="nav-btn-attendance"
        >
          <UserCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[8px]">Attendance</span>
        </button>
      </nav>

      {/* Invoice Modal Overlay */}
      {selectedInvoiceJob && (
        <InvoiceModal
          job={selectedInvoiceJob}
          onClose={() => setSelectedInvoiceJob(null)}
        />
      )}

      {/* Beautiful Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-sm px-4"
            id="toast-notification-banner"
          >
            <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl border text-xs font-bold leading-relaxed pointer-events-auto ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toast.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
              <span className="flex-1">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beautiful Custom Logout Confirm Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="logout-confirm-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl text-center space-y-4"
              id="logout-confirm-box"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">Logout / Switch User?</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Are you sure you want to exit your session? You can easily log back in as any Owner or Manager anytime.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-200 transition-all cursor-pointer"
                  id="logout-cancel-btn"
                >
                  No, Keep Session
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold shadow-md shadow-red-100 transition-all cursor-pointer"
                  id="logout-confirm-btn"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
