import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Download,
  CreditCard,
  X,
} from 'lucide-react';
import apiClient from '../services/api';
import { StudentFeeLedger, AdminFeeOverview } from '../types';

export const FeesPage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  // Student State
  const [ledger, setLedger] = useState<StudentFeeLedger | null>(null);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [selectedFeeId, setSelectedFeeId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>('UPI');
  const [payLoading, setPayLoading] = useState<boolean>(false);

  // Admin State
  const [adminOverview, setAdminOverview] = useState<AdminFeeOverview | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, [isStudent]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isStudent) {
        const res = await apiClient.get<StudentFeeLedger>('/fees/student/me');
        setLedger(res.data);
        if (res.data.fees.length > 0) {
          const pendingFee = res.data.fees.find((f) => f.pending_amount > 0) || res.data.fees[0];
          setSelectedFeeId(pendingFee.id);
          setPayAmount(pendingFee.pending_amount || 10000);
        }
      } else {
        const overviewRes = await apiClient.get<AdminFeeOverview>('/fees/admin-overview');
        setAdminOverview(overviewRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load fees data', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPayLoading(true);
      const res = await apiClient.post('/fees/pay', {
        student_fee_id: selectedFeeId,
        amount: Number(payAmount),
        payment_mode: payMode,
        remarks: 'Online Payment Simulation',
      });
      setMessage({ text: `Payment of ₹${payAmount.toLocaleString()} completed! Receipt ${res.data.receipt_number} issued.`, type: 'success' });
      setShowPayModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Payment transaction failed.', type: 'error' });
    } finally {
      setPayLoading(false);
    }
  };

  const handleDownloadReceipt = async (receiptId: string, receiptNo: string) => {
    try {
      const res = await apiClient.get(`/fees/receipts/${receiptId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${receiptNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download receipt PDF', err);
    }
  };

  return (
    <PageContainer
      title="Fees & Student Financial Ledger"
      subtitle={isStudent ? 'Track semester fee liabilities, payments, and official receipts' : 'University-wide fee administration and collection reporting'}
      action={
        isStudent && ledger && ledger.total_pending > 0 ? (
          <Button onClick={() => setShowPayModal(true)}>
            <CreditCard className="w-4 h-4 mr-2" /> Pay Outstanding Fee
          </Button>
        ) : undefined
      }
    >
      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' : 'bg-red-950/40 text-red-300 border border-red-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 font-mono text-xs">Loading ledger statements...</div>
      ) : isStudent && ledger ? (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Total Program Fee</p>
              <h3 className="text-2xl font-bold text-white mt-1">₹ {ledger.total_fees.toLocaleString()}</h3>
              <p className="text-xs text-slate-400 mt-1">Roll No: <span className="font-mono text-cyan-400">{ledger.roll_number}</span></p>
            </div>

            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Total Amount Paid</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹ {ledger.total_paid.toLocaleString()}</h3>
              <p className="text-xs text-slate-400 mt-1">Verified via institutional treasury</p>
            </div>

            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Pending Balance</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">₹ {ledger.total_pending.toLocaleString()}</h3>
              <p className="text-xs text-slate-400 mt-1">Next Due: {ledger.next_due_date || 'N/A'}</p>
            </div>

            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Account Standing</p>
              <div className="mt-2">
                <Badge variant={ledger.status === 'PAID' ? 'emerald' : ledger.status === 'PARTIAL' ? 'cyan' : 'amber'}>
                  {ledger.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-2">Exam Eligibility Active</p>
            </div>
          </div>

          {/* Semester-wise Fee Obligation Table */}
          <Card title="Semester Fee Obligations" subtitle="Academic term ledger breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Academic Year</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Total Obligation</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Pending</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {ledger.fees.map((f) => (
                    <tr key={f.id} className="hover:bg-[#111827]/50 transition">
                      <td className="py-3 px-4 font-mono text-slate-300">{f.academic_year}</td>
                      <td className="py-3 px-4 font-semibold text-white">Semester {f.semester_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">₹ {f.total_amount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">₹ {f.paid_amount.toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-amber-400">₹ {f.pending_amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-400">{f.due_date}</td>
                      <td className="py-3 px-4">
                        <Badge variant={f.status === 'PAID' ? 'emerald' : f.status === 'PARTIAL' ? 'cyan' : 'amber'}>
                          {f.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payment Transaction History */}
          <Card title="Payment Transaction History & Receipts" subtitle="Audit-tracked transactions with official downloadable receipts">
            {ledger.recent_transactions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">No transactions recorded on this account.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4">Txn Reference</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Official Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {ledger.recent_transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-[#111827]/50 transition">
                        <td className="py-3 px-4 text-slate-300">{new Date(t.transaction_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-mono text-cyan-400 font-medium">{t.receipt_number || 'RCP-PENDING'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white">₹ {t.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-300">{t.payment_mode.replace('_', ' ')}</td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{t.transaction_ref}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            onClick={() => handleDownloadReceipt(t.id, t.receipt_number || 'receipt')}
                            className="text-xs py-1 px-2.5"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> PDF Receipt
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : adminOverview ? (
        /* ADMIN VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Total Receivables</p>
              <h3 className="text-2xl font-bold text-white mt-1">₹ {adminOverview.total_expected.toLocaleString()}</h3>
              <p className="text-xs text-slate-400 mt-1">Current Academic Session</p>
            </div>
            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Total Realized</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹ {adminOverview.total_collected.toLocaleString()}</h3>
              <p className="text-xs text-emerald-300 mt-1">{adminOverview.collection_rate_pct}% Collected</p>
            </div>
            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Outstanding Pending</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">₹ {adminOverview.total_pending.toLocaleString()}</h3>
              <p className="text-xs text-slate-400 mt-1">Active student balances</p>
            </div>
            <div className="p-5 rounded-2xl border border-[#1E293B] bg-[#111827]">
              <p className="text-[11px] font-mono uppercase text-slate-400">Overdue Dues</p>
              <h3 className="text-2xl font-bold text-red-400 mt-1">₹ {adminOverview.total_overdue.toLocaleString()}</h3>
              <p className="text-xs text-red-300 mt-1">Deadline passed</p>
            </div>
          </div>

          <Card title="Campus Recent Transactions" subtitle="Live stream of payments processed">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Receipt</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Txn Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {adminOverview.recent_transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-[#111827]/50 transition">
                      <td className="py-3 px-4 font-mono text-cyan-400">{t.receipt_number || 'RCP-TXN'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">₹ {t.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-300">{t.payment_mode.replace('_', ' ')}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{t.transaction_ref}</td>
                      <td className="py-3 px-4 text-slate-400">{new Date(t.transaction_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Pay Fee Modal */}
      {showPayModal && ledger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="font-semibold text-white text-base">Make Fee Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayFee} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="text-slate-300 font-medium">Select Semester Fee</label>
                <select
                  value={selectedFeeId}
                  onChange={(e) => setSelectedFeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {ledger.fees.map((f) => (
                    <option key={f.id} value={f.id}>
                      Semester {f.semester_number} (Pending: ₹{f.pending_amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-slate-300 font-medium">Payment Amount (INR)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-slate-300 font-medium">Payment Channel</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / BHIM)</option>
                  <option value="ONLINE_NETBANKING">Online Netbanking</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
                Notice: Instant transaction settlement. An official digitally signed fee receipt PDF will be generated.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowPayModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={payLoading}>
                  {payLoading ? 'Processing...' : `Confirm & Pay ₹${payAmount.toLocaleString()}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default FeesPage;
