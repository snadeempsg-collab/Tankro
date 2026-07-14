/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Job {
  id: string;
  date: string; // YYYY-MM-DD
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  area: string; // Sathyamangalam, Gobichettipalayam, Punjai Puliambatti, Other
  otherAreaText?: string;
  tankCapacity: number; // in Liters
  numTanks: number; // default 1
  individualTanks?: number[];
  distance: number; // in KM
  staffAssigned: string[]; // Althaf, Nafees, Akram
  jobType: 'One-Time' | 'Subscription';
  subscriptionInterval?: '3 months' | '6 months' | 'Custom';
  customIntervalMonths?: number;
  gstApplicable: boolean;
  paymentStatus: 'Paid' | 'Pending';
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer';
  notes?: string;
  isSlabOverridden?: boolean;
  manualSlabRate?: number;
  individualTanksManualRates?: number[];
  isDistanceOverridden?: boolean;
  manualDistanceCharge?: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  nextServiceDueDate?: string; // YYYY-MM-DD
}

export type ExpenseCategory =
  | 'Petrol/Fuel'
  | 'Gloves'
  | 'Masks'
  | 'Chlorine Tablets'
  | 'Cleaning Supplies'
  | 'Vehicle Maintenance'
  | 'Food/Refreshments'
  | 'Staff Salary'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  paidBy: 'Yuvaraj' | 'Nadeem';
  notes?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day' | 'Leave';

export interface DailyAttendance {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // staffName -> AttendanceStatus
  wages: Record<string, number>; // staffName -> wage amount paid/payable for this day
}

export interface CustomerNotes {
  id: string;
  text: string;
  date: string;
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
  area: string;
  notes: string;
}

export interface AppSettings {
  dailyWages: Record<string, number>; // Althaf, Nafees, Akram -> standard wage
  currentOwner: 'Yuvaraj' | 'Nadeem' | 'Akram' | null;
  currentUserRole?: 'Owner' | 'Manager' | null;
}
