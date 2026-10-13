import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  FileCheck2,
  Search,
  CheckCircle,
  Download,
  AlertCircle,
  User,
  X,
} from 'lucide-react';
import apiClient from '../services/api';

interface ExamSubject {
  id: string;
  subject_code: string;
  subject_name: string;
}

interface ExamFormItem {
  id: string;
  student_id: string;
  examination_id: string;
  semester_number?: number;
  academic_year?: string;
  roll_number?: string;
  student_name?: string;
  examination_name?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submission_date: string;
  verification_notes?: string;
  payment_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payment_reference?: string;
  amount_paid?: number;
  paid_at?: string;
  subjects: ExamSubject[];
}

export const AdminExamFormsPage: React.FC = () => {
  const [forms, setForms] = useState<ExamFormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ExamFormItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<ExamFormItem[]>('/examinations/forms/all');
      setForms(res.data);
    } catch (err: any) {
      console.error('Failed to load exam forms', err);
      // Fallback to pending forms if all endpoint has issues
      try {
        const fallbackRes = await apiClient.get<ExamFormItem[]>('/examinations/forms/pending');
        setForms(fallbackRes.data);
      } catch (e) {
        setMessage({ text: 'Failed to load examination forms.', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (form: ExamFormItem, defaultStatus: 'APPROVED' | 'REJECTED') => {
    setSelectedForm(form);
    setReviewStatus(defaultStatus);
    setVerificationNotes(
      defaultStatus === 'APPROVED'
        ? 'Verified by Examination Cell. Coursework and fee prerequisites confirmed.'
        : 'Prerequisites not met or discrepancies found in registration details.'
    );
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    try {
      setSubmittingReview(true);
      await apiClient.put(`/examinations/forms/${selectedForm.id}/review`, {
        status: reviewStatus,
        verification_notes: verificationNotes,
      });

      setMessage({
        text: `Exam Form for candidate ${selectedForm.student_name || selectedForm.roll_number} has been ${reviewStatus.toLowerCase()}!`,
        type: 'success',
      });
      setReviewModalOpen(false);
      setSelectedForm(null);
      loadForms();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to update exam form status.',
        type: 'error',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDownloadHallTicket = async (formId: string, rollNumber?: string) => {
    try {
      const res = await apiClient.get(`/examinations/forms/${formId}/hall-ticket-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HallTicket_${rollNumber || formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setMessage({
        text: 'Hall ticket generation locked. Ensure candidate form is APPROVED, fee is PAID, and timetable is active.',
        type: 'error',
      });
    }
  };

  const filteredForms = forms.filter((f) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      !query ||
      (f.student_name && f.student_name.toLowerCase().includes(query)) ||
      (f.roll_number && f.roll_number.toLowerCase().includes(query)) ||
      (f.examination_name && f.examination_name.toLowerCase().includes(query));

    const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchPayment = paymentFilter === 'ALL' || f.payment_status === paymentFilter;

    return matchQuery && matchStatus && matchPayment;
  });

  return (
    <PageContainer
      title="Examination Registration Forms Review"
      subtitle="Examine student exam applications, verify institutional eligibility, review fee payment status, and issue verifiable Hall Tickets"
    >
      <div className="space-y-6">
        {/* Banner Alert Message */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <p className="text-xs text-slate-400">Total Applications</p>
            <p className="text-2xl font-bold text-white mt-1">{forms.length}</p>
          </Card>
          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <p className="text-xs text-slate-400">Pending Review</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {forms.filter((f) => f.status === 'SUBMITTED').length}
            </p>
          </Card>
          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <p className="text-xs text-slate-400">Approved & Verified</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {forms.filter((f) => f.status === 'APPROVED').length}
            </p>
          </Card>
          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <p className="text-xs text-slate-400">Exam Fee Paid</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">
              {forms.filter((f) => f.payment_status === 'SUCCESS').length}
            </p>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#111827]/60 p-4 rounded-xl border border-[#1E293B]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or examination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Form Statuses</option>
              <option value="SUBMITTED">SUBMITTED (Pending)</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="SUCCESS">PAID (Success)</option>
              <option value="PENDING">UNPAID (Pending)</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        {/* Forms Table */}
        <Card title="Submitted Examination Applications" subtitle="Review student candidates and authorize hall tickets">
          {loading ? (
            <div className="py-16 text-center text-slate-400 font-mono text-xs">Loading examination forms...</div>
          ) : filteredForms.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">No examination applications match current criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Student Candidate</th>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Session / Semester</th>
                    <th className="py-3 px-4">Registered Subjects</th>
                    <th className="py-3 px-4">Fee Status</th>
                    <th className="py-3 px-4">Form Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {filteredForms.map((form) => {
                    const isFullyQualified = form.status === 'APPROVED' && form.payment_status === 'SUCCESS';

                    return (
                      <tr key={form.id} className="hover:bg-[#111827]/40 transition">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div>
                              <span>{form.student_name || 'Candidate'}</span>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Submitted {new Date(form.submission_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-400">{form.roll_number || '—'}</td>
                        <td className="py-3 px-4 text-slate-300">
                          <div>{form.examination_name || 'Semester Examination'}</div>
                          <div className="text-[10px] text-slate-400">
                            Sem {form.semester_number || 4} • {form.academic_year || '2025-2026'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B]">
                            {form.subjects?.length || 0} Subjects
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <Badge
                              variant={
                                form.payment_status === 'SUCCESS'
                                  ? 'emerald'
                                  : form.payment_status === 'PENDING'
                                  ? 'amber'
                                  : 'rose'
                              }
                            >
                              {form.payment_status}
                            </Badge>
                            {form.amount_paid ? (
                              <div className="text-[10px] text-slate-400 font-mono">₹{form.amount_paid}</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              form.status === 'APPROVED'
                                ? 'emerald'
                                : form.status === 'SUBMITTED'
                                ? 'cyan'
                                : form.status === 'REJECTED'
                                ? 'rose'
                                : 'slate'
                            }
                          >
                            {form.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {form.status === 'SUBMITTED' && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenReview(form, 'APPROVED')}
                                className="text-xs py-1 px-2.5 text-emerald-400 hover:text-emerald-300 border-emerald-800"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenReview(form, 'REJECTED')}
                                className="text-xs py-1 px-2.5 text-rose-400 hover:text-rose-300 border-rose-800"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {form.status !== 'SUBMITTED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReview(form, form.status === 'APPROVED' ? 'REJECTED' : 'APPROVED')}
                              className="text-xs py-1 px-2"
                            >
                              Change Status
                            </Button>
                          )}

                          {isFullyQualified && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDownloadHallTicket(form.id, form.roll_number)}
                              className="text-xs py-1 px-2.5 text-cyan-300 border-cyan-800 bg-cyan-950/40"
                              title="Download official candidate admit card"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              Hall Ticket
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Review Modal */}
        {reviewModalOpen && selectedForm && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-cyan-400" />
                  Review Candidate Exam Form
                </h3>
                <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Candidate:</span>
                  <span className="text-white font-bold">{selectedForm.student_name} ({selectedForm.roll_number})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Examination:</span>
                  <span className="text-cyan-400">{selectedForm.examination_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fee Status:</span>
                  <span className={selectedForm.payment_status === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {selectedForm.payment_status}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Decision</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-400">
                      <input
                        type="radio"
                        name="reviewStatus"
                        value="APPROVED"
                        checked={reviewStatus === 'APPROVED'}
                        onChange={() => setReviewStatus('APPROVED')}
                      />
                      Approve Form & Authorize Hall Ticket
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-400">
                      <input
                        type="radio"
                        name="reviewStatus"
                        value="REJECTED"
                        checked={reviewStatus === 'REJECTED'}
                        onChange={() => setReviewStatus('REJECTED')}
                      />
                      Reject Registration
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Verification Notes</label>
                  <textarea
                    rows={3}
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    required
                    placeholder="Enter audit remarks or feedback for candidate..."
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
                  <Button type="button" variant="ghost" onClick={() => setReviewModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingReview}>
                    {submittingReview ? 'Submitting...' : 'Save Decision'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default AdminExamFormsPage;
