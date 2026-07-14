/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Droplets, User, ArrowRight, Shield, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface OwnerSelectorProps {
  onSelect: (username: 'Yuvaraj' | 'Nadeem' | 'Akram', role: 'Owner' | 'Manager') => void;
}

export default function OwnerSelector({ onSelect }: OwnerSelectorProps) {
  const [selectedUser, setSelectedUser] = useState<'Yuvaraj' | 'Nadeem' | 'Akram'>('Nadeem');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const expectedPassword = selectedUser.toLowerCase(); // 'nadeem', 'yuvaraj', 'akram'
    if (password === expectedPassword) {
      const role = selectedUser === 'Akram' ? 'Manager' : 'Owner';
      onSelect(selectedUser, role);
    } else {
      setError('Incorrect password! (தவறான கடவுச்சொல்! Password is same as name in lowercase)');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-100 p-8 border border-slate-100 text-center space-y-6"
        id="owner-selector-card"
      >
        {/* App Logo & Branding */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden mb-4">
            <img
              src="/src/assets/images/tankro_logo_1784013728692.jpg"
              alt="Tankro Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 font-display tracking-tight leading-none">
            Tankro Sathy
          </h1>
          <p className="text-xs text-blue-600 font-bold mt-1.5 uppercase tracking-wider">
            டேங்க்ரோ சத்தி (சத்தியமங்கலம்)
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-normal">
            Secure multi-role payroll, jobs, and customer tracker
          </p>
        </div>

        <div className="h-px bg-slate-100 my-2"></div>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {/* User Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Account (பயனர் கணக்கு)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Nadeem', 'Yuvaraj', 'Akram'] as const).map((user) => {
                const isSelected = selectedUser === user;
                const role = user === 'Akram' ? 'Manager' : 'Owner';
                return (
                  <button
                    key={user}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setPassword('');
                      setError(null);
                    }}
                    className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-100'
                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    id={`login-select-${user.toLowerCase()}`}
                  >
                    <User className={`w-4 h-4 mb-1 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs">{user}</span>
                    <span className={`text-[9px] block mt-0.5 font-medium ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
              <span>Password (கடவுச்சொல்)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Hint: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-semibold">{selectedUser.toLowerCase()}</code>
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-10 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter password for ${selectedUser}`}
                id="login-password-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                id="login-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-2 text-[11px] font-semibold animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-100 transition-all cursor-pointer flex items-center justify-center gap-2"
            id="login-submit-btn"
          >
            <span>Log In securely ({selectedUser === 'Akram' ? 'மேலாளர் உள்நுழைவு' : 'நிர்வாகி உள்நுழைவு'})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="h-px bg-slate-100"></div>

        <div className="text-[10px] text-slate-400 leading-normal">
          Owners (<strong className="text-slate-600">Nadeem & Yuvaraj</strong>) hold full system control. Managers (<strong className="text-slate-600">Akram</strong>) have read-only limits on salaries & transaction deletions.
        </div>
      </motion.div>
    </div>
  );
}
