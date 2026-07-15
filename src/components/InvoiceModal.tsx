/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Share2, ClipboardCheck, Phone, CheckCircle } from 'lucide-react';
import { Job } from '../types';
import { formatInRupees, calculateJobPrice } from '../utils';

interface InvoiceModalProps {
  job: Job | null;
  onClose: () => void;
}

export default function InvoiceModal({ job, onClose }: InvoiceModalProps) {
  const [gstin, setGstin] = useState('33ABCDE1234F1Z5'); // Default dummy TN GSTIN
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  // Re-calculate or use stored values
  const breakdown = calculateJobPrice(
    job.tankCapacity,
    job.numTanks,
    job.distance,
    job.gstApplicable,
    job.isSlabOverridden,
    job.manualSlabRate,
    job.individualTanks,
    job.isDistanceOverridden,
    job.manualDistanceCharge,
    job.individualTanksManualRates
  );

  const invoiceNo = `TS-${job.date.replace(/-/g, '')}-${job.id.slice(-4).toUpperCase()}`;

  // Pre-filled WhatsApp message
  const handleWhatsAppShare = () => {
    const message = `*TANKRO SATHYAMANGALAM*
Water Tank Cleaning Service Invoice

*Invoice No:* ${invoiceNo}
*Date:* ${job.date}
*Customer Name:* ${job.customerName}
*Phone:* ${job.customerPhone}
*Address:* ${job.customerAddress}, ${job.area}${job.otherAreaText ? ` (${job.otherAreaText})` : ''}

*Service Breakdown:*
- Tank Cleaning: ${job.numTanks} tank(s) x ${formatInRupees(breakdown.slabRate)} (${job.tankCapacity} L) = ${formatInRupees(breakdown.baseCharge)}
${breakdown.distanceSurcharge > 0 ? `- Distance Surcharge: ${formatInRupees(breakdown.distanceSurcharge)} (${job.distance} km)\n` : ''}- Subtotal: ${formatInRupees(breakdown.subtotal)}
${job.gstApplicable ? `- GST (18%): ${formatInRupees(breakdown.gstAmount)} (GSTIN: ${gstin})\n` : ''}*Grand Total:* *${formatInRupees(breakdown.grandTotal)}*

*Payment Status:* ${job.paymentStatus} (${job.paymentMode})
*Cleaned By:* ${job.staffAssigned.join(', ')}

Thank you for choosing Tankro Sathyamangalam!
For bookings & support, contact Yuvaraj / Nadeem.`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${job.customerPhone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyText = () => {
    const text = `TANKRO SATHYAMANGALAM
Water Tank Cleaning Service

Invoice No: ${invoiceNo}
Date: ${job.date}
Customer: ${job.customerName}
Phone: ${job.customerPhone}
Address: ${job.customerAddress}

Tanks: ${job.numTanks} x ${job.tankCapacity}L
Base Cost: ${formatInRupees(breakdown.baseCharge)}
Surcharge: ${formatInRupees(breakdown.distanceSurcharge)}
Subtotal: ${formatInRupees(breakdown.subtotal)}
GST: ${job.gstApplicable ? formatInRupees(breakdown.gstAmount) : 'N/A'}
Grand Total: ${formatInRupees(breakdown.grandTotal)}
Payment Status: ${job.paymentStatus}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          id="invoice-modal-container"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-500 text-white print:hidden">
            <div>
              <h3 className="font-semibold text-lg">Job Invoice</h3>
              <p className="text-xs text-blue-100">{invoiceNo}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              id="close-invoice-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Printable Content */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 print:p-0 print:overflow-visible" id="printable-invoice">
            {/* Invoice Design */}
            <div className="text-center mb-6">
              <span className="text-blue-500 font-bold tracking-widest text-xs uppercase block">Professional Water Tank Cleaners</span>
              <h1 className="text-2xl font-bold text-slate-800 font-display">Tankro Sathyamangalam</h1>
              <p className="text-xs text-slate-500">Sathyamangalam, Gobichettipalayam, Punjai Puliambatti and surrounding areas</p>
              <p className="text-xs text-slate-400 mt-1">Mobile: 98425 12345, 97864 32101</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-6 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Billed To:</h4>
                <p className="font-bold text-slate-800 text-sm">{job.customerName}</p>
                <p className="text-slate-600 mt-0.5">{job.customerPhone}</p>
                <p className="text-slate-600 leading-relaxed mt-0.5">{job.customerAddress}, {job.area}{job.otherAreaText ? ` (${job.otherAreaText})` : ''}</p>
              </div>
              <div className="text-right">
                <h4 className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-1">Invoice Details:</h4>
                <p className="font-semibold text-slate-700">No: <span className="font-mono">{invoiceNo}</span></p>
                <p className="text-slate-600">Date: {job.date}</p>
                <p className="text-slate-600">Type: {job.jobType}</p>
                <p className="mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    job.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {job.paymentStatus} ({job.paymentMode})
                  </span>
                </p>
              </div>
            </div>

            {/* GST Field on Invoice (Editable if applicable) */}
            {job.gstApplicable && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl flex flex-col gap-1 text-xs border border-slate-100 print:bg-white print:border-none print:p-0">
                <label className="font-semibold text-slate-600 print:hidden">Business GSTIN:</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg p-1.5 font-mono text-slate-700 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500 print:border-none print:p-0 print:font-bold"
                  placeholder="Enter GSTIN"
                  id="invoice-gstin-input"
                />
              </div>
            )}

            {/* Service Items Table */}
            <div className="mb-6">
              <h4 className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-2">Service Summary:</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden print:border-slate-300">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 print:bg-white">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Tanks</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="p-3">
                        <p className="font-semibold">Water Tank Cleaning</p>
                        <p className="text-[10px] text-slate-400">{job.tankCapacity} Liters Capacity</p>
                      </td>
                      <td className="p-3 text-center font-semibold">{job.numTanks}</td>
                      <td className="p-3 text-right">{formatInRupees(breakdown.slabRate)}</td>
                      <td className="p-3 text-right font-semibold">{formatInRupees(breakdown.baseCharge)}</td>
                    </tr>
                    {breakdown.distanceSurcharge > 0 && (
                      <tr>
                        <td className="p-3" colSpan={2}>
                          <p className="font-semibold">Distance Surcharge</p>
                          <p className="text-[10px] text-slate-400">{job.distance} KM from base (&gt;8 KM)</p>
                        </td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right font-semibold">{formatInRupees(breakdown.distanceSurcharge)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Totals */}
            <div className="w-full max-w-[240px] ml-auto mb-6 text-xs text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatInRupees(breakdown.subtotal)}</span>
              </div>
              {job.gstApplicable && (
                <div className="flex justify-between text-slate-600">
                  <span>GST 18%:</span>
                  <span className="font-semibold">{formatInRupees(breakdown.gstAmount)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100 my-1"></div>
              <div className="flex justify-between text-sm font-bold text-slate-950">
                <span>Total Amount:</span>
                <span className="text-blue-600">{formatInRupees(breakdown.grandTotal)}</span>
              </div>
            </div>

            {/* Footer Notes */}
            <div className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4 space-y-1">
              <p><span className="font-semibold text-slate-500">Service Staff:</span> {job.staffAssigned.join(', ')}</p>
              {job.notes && <p><span className="font-semibold text-slate-500">Notes:</span> {job.notes}</p>}
              <p className="text-center mt-6 text-slate-400 font-medium">Thank you for your business! Clean water, healthy life!</p>
              <p className="text-center text-[8px] text-slate-300">Generated via Tankro Sathyamangalam Tracker App</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end print:hidden">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              id="copy-invoice-btn"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <ClipboardCheck className="w-4 h-4 text-slate-500" />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              id="whatsapp-invoice-btn"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              id="print-invoice-btn"
            >
              <Printer className="w-4 h-4" />
              Print Invoice
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
