/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, CreditCard, Settings, ShieldAlert, Award, Info } from 'lucide-react';
import { DailyAttendance, AttendanceStatus, AppSettings } from '../types';
import { getTodayDateString, formatInRupees } from '../utils';

interface AttendanceModuleProps {
  attendanceRecords: DailyAttendance[];
  settings: AppSettings;
  onSaveAttendance: (attendance: DailyAttendance) => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export default function AttendanceModule({
  attendanceRecords,
  settings,
  onSaveAttendance,
  onUpdateSettings,
}: AttendanceModuleProps) {
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');

  // Mark Attendance State
  const [date, setDate] = useState(getTodayDateString());
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({
    Althaf: 'Present',
    Nafees: 'Present',
    Akram: 'Present',
  });
  const [wages, setWages] = useState<Record<string, number | ''>>({
    Althaf: settings.dailyWages.Althaf || 300,
    Nafees: settings.dailyWages.Nafees || 400,
    Akram: settings.dailyWages.Akram || 500,
  });

  // Settings state in terms of Monthly Salaries (computed as dailyWage * 30)
  const [althafMonthly, setAlthafMonthly] = useState<number | ''>((settings.dailyWages.Althaf || 300) * 30);
  const [nafeesMonthly, setNafeesMonthly] = useState<number | ''>((settings.dailyWages.Nafees || 400) * 30);
  const [akramMonthly, setAkramMonthly] = useState<number | ''>((settings.dailyWages.Akram || 500) * 30);
  const [showSettings, setShowSettings] = useState(false);

  // History / Filter State
  const [historyMonth, setHistoryMonth] = useState<string>(getTodayDateString().slice(0, 7)); // YYYY-MM

  // Load attendance record if it already exists for the selected date
  useEffect(() => {
    const existing = attendanceRecords.find((r) => r.date === date);
    if (existing) {
      setRecords(existing.records);
      setWages(existing.wages);
    } else {
      // Default behavior from settings
      const defaultRecords: Record<string, AttendanceStatus> = {
        Althaf: 'Present',
        Nafees: 'Present',
        Akram: 'Present',
      };
      const defaultWages: Record<string, number> = {
        Althaf: settings.dailyWages.Althaf || 300,
        Nafees: settings.dailyWages.Nafees || 400,
        Akram: settings.dailyWages.Akram || 500,
      };
      setRecords(defaultRecords);
      setWages(defaultWages);
    }
  }, [date, attendanceRecords, settings]);

  // Keep state in sync when settings prop updates
  useEffect(() => {
    setAlthafMonthly((settings.dailyWages.Althaf || 300) * 30);
    setNafeesMonthly((settings.dailyWages.Nafees || 400) * 30);
    setAkramMonthly((settings.dailyWages.Akram || 500) * 30);
  }, [settings]);

  // Handle setting updates (Monthly Salary system)
  const saveSalarySettings = () => {
    if (settings.currentUserRole === 'Manager') {
      alert('Access Denied: Managers cannot edit salary settings!');
      return;
    }

    const updatedSettings: AppSettings = {
      ...settings,
      dailyWages: {
        Althaf: Math.round(Number(althafMonthly) / 30),
        Nafees: Math.round(Number(nafeesMonthly) / 30),
        Akram: Math.round(Number(akramMonthly) / 30),
      },
    };

    onUpdateSettings(updatedSettings);
    setShowSettings(false);
    alert('Monthly salaries updated successfully!');

    setWages({
      Althaf: Math.round(Number(althafMonthly) / 30),
      Nafees: Math.round(Number(nafeesMonthly) / 30),
      Akram: Math.round(Number(akramMonthly) / 30),
    });
  };

  const handleStatusChange = (staff: string, status: AttendanceStatus) => {
    const newRecords = { ...records, [staff]: status };
    setRecords(newRecords);

    // Auto calculate wage based on status and standard daily wage (monthly salary / 30)
    const standardWage = settings.dailyWages[staff] || (staff === 'Akram' ? 500 : staff === 'Nafees' ? 400 : 300);
    let calculatedWage = standardWage;
    if (status === 'Absent' || status === 'Leave') {
      calculatedWage = 0;
    } else if (status === 'Half-Day') {
      calculatedWage = Math.round(standardWage / 2);
    }

    setWages({
      ...wages,
      [staff]: calculatedWage,
    });
  };

  const handleCustomWageChange = (staff: string, amount: number | '') => {
    if (settings.currentUserRole === 'Manager') {
      alert('Access Denied: Managers are not authorized to modify computed daily wages manually.');
      return;
    }
    setWages({
      ...wages,
      [staff]: amount,
    });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedWages: Record<string, number> = {};
    Object.entries(wages).forEach(([key, val]) => {
      sanitizedWages[key] = Number(val) || 0;
    });

    const attendanceData: DailyAttendance = {
      id: date,
      date,
      records,
      wages: sanitizedWages,
    };
    onSaveAttendance(attendanceData);
    alert(`Attendance saved for ${date}!`);
  };

  const handleSettingsClick = () => {
    if (settings.currentUserRole === 'Manager') {
      alert('Access Denied: Only Owners (Nadeem & Yuvaraj) can configure monthly salary settings.');
      return;
    }
    setShowSettings(!showSettings);
  };

  // Compile stats for selected month
  const staffStats = ['Althaf', 'Nafees', 'Akram'].map((staff) => {
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let totalEarned = 0;

    attendanceRecords.forEach((r) => {
      if (r.date.startsWith(historyMonth)) {
        const status = r.records[staff];
        const earned = r.wages[staff] || 0;

        if (status === 'Present') presentCount++;
        else if (status === 'Absent') absentCount++;
        else if (status === 'Half-Day') halfDayCount++;
        else if (status === 'Leave') leaveCount++;

        totalEarned += earned;
      }
    });

    const standardMonthly = staff === 'Akram' ? 15000 : staff === 'Nafees' ? 12000 : 9000;
    const currentRateMonthly = (settings.dailyWages[staff] || (staff === 'Akram' ? 500 : staff === 'Nafees' ? 400 : 300)) * 30;

    return {
      name: staff,
      present: presentCount,
      absent: absentCount,
      halfDay: halfDayCount,
      leave: leaveCount,
      wagesPayable: totalEarned,
      configuredMonthly: currentRateMonthly,
      standardMonthly,
    };
  });

  // Filtered attendance history logs
  const filteredLogs = attendanceRecords
    .filter((r) => r.date.startsWith(historyMonth))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden" id="attendance-wrapper">
      {/* Top Banner Navigation */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 pb-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Staff Attendance & Salaries
            </h2>
            <p className="text-xs text-blue-100">
              Monthly Wage System
            </p>
          </div>
          <button
            onClick={handleSettingsClick}
            className={`p-2 rounded-xl transition-colors text-white cursor-pointer ${
              settings.currentUserRole === 'Manager' ? 'opacity-50 cursor-not-allowed bg-black/10' : 'bg-white/10 hover:bg-white/20'
            }`}
            id="toggle-wage-settings"
            title={settings.currentUserRole === 'Manager' ? "Locked for Managers" : "Configure Monthly Salaries"}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/20 text-xs">
          <button
            onClick={() => setActiveTab('mark')}
            className={`flex-1 text-center py-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'mark' ? 'border-white text-white' : 'border-transparent text-blue-100 hover:text-white'
            }`}
            id="tab-mark-attendance"
          >
            Mark Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 text-center py-3 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history' ? 'border-white text-white' : 'border-transparent text-blue-100 hover:text-white'
            }`}
            id="tab-attendance-summary"
          >
            Payroll Summary
          </button>
        </div>
      </div>

      {/* Settings Panel (Configure Monthly Salaries - Owner Only) */}
      {showSettings && settings.currentUserRole !== 'Manager' && (
        <div className="p-5 bg-blue-50 border-b border-blue-100 text-xs text-slate-700 space-y-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-1">
            <Settings className="w-4 h-4 text-blue-600" />
            Set Monthly Salaries
          </h3>
          <p className="text-[10px] text-slate-500 leading-normal">
            Enter the monthly wage contract value for each staff member.
          </p>
          <div className="space-y-3">
            {[
              { name: 'Althaf', state: althafMonthly, setter: setAlthafMonthly, standard: 9000 },
              { name: 'Nafees', state: nafeesMonthly, setter: setNafeesMonthly, standard: 12000 },
              { name: 'Akram', state: akramMonthly, setter: setAkramMonthly, standard: 15000 },
            ].map((staff) => (
              <div key={staff.name} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">{staff.name}</span>
                  <span className="text-[10px] text-slate-400">Standard: {formatInRupees(staff.standard)}/month</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">₹</span>
                  <input
                    type="number"
                    value={staff.state}
                    onChange={(e) => {
                      const val = e.target.value;
                      staff.setter(val === '' ? '' : Math.max(0, parseInt(val) || 0));
                    }}
                    className="w-24 bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-center text-slate-800"
                    id={`wage-settings-${staff.name.toLowerCase()}`}
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold transition-colors cursor-pointer text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSalarySettings}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
                id="save-salary-settings-btn"
              >
                Save Salaries
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <div className="p-5 text-xs text-slate-700">
        {activeTab === 'mark' ? (
          /* Tab 1: MARK ATTENDANCE */
          <form onSubmit={handleSaveSubmit} className="space-y-4">
            <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-2xl flex gap-2.5 items-start">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sky-800">Monthly Contract Salaries:</p>
                <p className="text-[10px] text-sky-700 leading-relaxed mt-0.5">
                  • <strong>Akram</strong>: {formatInRupees((settings.dailyWages.Akram || 500) * 30)}/month<br />
                  • <strong>Nafees</strong>: {formatInRupees((settings.dailyWages.Nafees || 400) * 30)}/month<br />
                  • <strong>Althaf</strong>: {formatInRupees((settings.dailyWages.Althaf || 300) * 30)}/month
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">
                Select Date for Attendance:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                id="attendance-date"
                required
              />
            </div>

            <div className="space-y-4 pt-2">
              {['Althaf', 'Nafees', 'Akram'].map((staff) => {
                const currentStatus = records[staff] || 'Present';
                const currentWage = wages[staff] !== undefined ? wages[staff] : 0;
                const dailyRate = settings.dailyWages[staff] || (staff === 'Akram' ? 500 : staff === 'Nafees' ? 400 : 300);

                return (
                  <div
                    key={staff}
                    className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-3 hover:shadow-xs transition-shadow"
                    id={`attendance-row-${staff.toLowerCase()}`}
                  >
                    {/* Staff Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold font-display">
                          {staff[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{staff}</p>
                          <p className="text-[10px] text-slate-400">
                            Contract Rate: {formatInRupees(dailyRate * 30)}/month
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Select Grid */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['Present', 'Half-Day', 'Absent', 'Leave'] as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(staff, status)}
                          className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                            currentStatus === status
                              ? status === 'Present'
                                ? 'bg-green-500 border-green-500 text-white shadow-xs'
                                : status === 'Half-Day'
                                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                                : status === 'Absent'
                                ? 'bg-red-500 border-red-500 text-white shadow-xs'
                                : 'bg-slate-500 border-slate-500 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          id={`btn-status-${staff.toLowerCase()}-${status.toLowerCase().replace('-', '')}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 transition-all cursor-pointer mt-4"
              id="save-attendance-btn"
            >
              Save Attendance
            </button>
          </form>
        ) : (
          /* Tab 2: PAYROLL SUMMARY & LOGS */
          <div className="space-y-6">
            {/* Filter controls */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-600">Select Month:</span>
              <input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800 text-center cursor-pointer"
                id="attendance-month-filter"
              />
            </div>

            {/* Compiled Wages Overview */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-1">
                <CreditCard className="w-4 h-4 text-blue-500" />
                Monthly Payroll Accumulation
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {staffStats.map((stat) => (
                  <div key={stat.name} className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors shadow-xs">
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{stat.name}</span>
                        <span className="text-[10px] text-slate-400">
                          Base Monthly Wage Contract: <strong className="text-slate-600">{formatInRupees(stat.configuredMonthly)}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">Earned this Month</span>
                        <span className="font-extrabold text-blue-600 text-base">
                          {formatInRupees(stat.wagesPayable)}
                        </span>
                      </div>
                    </div>
                    {/* Matrix of counts */}
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1.5 border-t border-slate-100">
                      <div className="bg-green-50/70 p-1.5 rounded-lg border border-green-100 text-green-700">
                        <span className="block font-bold text-xs">{stat.present}</span>
                        Present
                      </div>
                      <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-100 text-amber-700">
                        <span className="block font-bold text-xs">{stat.halfDay}</span>
                        Half-Day
                      </div>
                      <div className="bg-red-50/70 p-1.5 rounded-lg border border-red-100 text-red-700">
                        <span className="block font-bold text-xs">{stat.absent}</span>
                        Absent
                      </div>
                      <div className="bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-slate-600">
                        <span className="block font-bold text-xs">{stat.leave}</span>
                        Leave
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-2 text-right">
                      Salary calculated based on {stat.present + stat.halfDay * 0.5} effective days out of 30
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date-wise logs log */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-500" />
                Date-wise Logs ({historyMonth})
              </h3>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                  No attendance records found for this month.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredLogs.map((log) => (
                    <div key={log.date} className="p-3 hover:bg-slate-50/50 transition-colors flex justify-between items-center text-[11px]">
                      <div className="font-semibold text-slate-700">{log.date}</div>
                      <div className="flex gap-2">
                        {Object.entries(log.records).map(([name, status]) => (
                          <span
                              key={name}
                              className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${
                                  status === 'Present'
                                      ? 'bg-green-50 text-green-700'
                                      : status === 'Half-Day'
                                      ? 'bg-amber-50 text-amber-700'
                                      : status === 'Absent'
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            {name[0]}: {status === 'Present' ? 'P' : status === 'Half-Day' ? 'H' : status === 'Absent' ? 'A' : 'L'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
