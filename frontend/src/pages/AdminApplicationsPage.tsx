import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import apiClient from '../services/api';
import {
  FileCheck2,
  Download,
  Search,
} from 'lucide-react';

interface Application {
  id: string;
  application_number: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  enrollment_number: string;
  department_name: string;
  course_name: string;
  application_type: string;
  reason: string;
  status: string;
  academic_year: string;
  semester_number?: number;
  admin_remarks?: string;
  created_at: string;
  updated_at: string;
}

export const AdminApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Review Modal State
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const url = statusFilter
        ? `/applications/?status_filter=${statusFilter}`
        : '/applications/';
      const res = await apiClient.get<Application[]>(url);
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    try {
      setSubmitting(true);
      await apiClient.put(`/applications/${selectedApp.id}/review`, {
        status: reviewStatus,
        remarks: reviewRemarks.trim(),
      });
      setSelectedApp(null);
      setReviewRemarks('');
      fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update review status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadDoc = async (appId: string, appNum: string) => {
    try {
      const response = await apiClient.get(`/applications/${appId}/document`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Official_Document_${appNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Document cannot be generated in current status.');
    }
  };

  const filteredApps = applications.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.application_number.toLowerCase().includes(q) ||
      a.student_name?.toLowerCase().includes(q) ||
      a.roll_number?.toLowerCase().includes(q) ||
      a.application_type.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer
      title="Student Application Review Queue"
      subtitle="Administrative clearance, verification of student requests, and official certificate dispatch."
    >
      <Card className="p-6 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by student, roll no, or app #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {['', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  statusFilter === st
                    ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                    : 'bg-[#111C35] border-[#1E2E4F] text-slate-400 hover:text-white'
                }`}
              >
                {st || 'All Statuses'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : filteredApps.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No student applications matching filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1E293B] text-slate-400">
                  <th className="py-3 px-3">App #</th>
                  <th className="py-3 px-3">Student Details</th>
                  <th className="py-3 px-3">Application Type</th>
                  <th className="py-3 px-3">Purpose</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {filteredApps.map((a) => (
                  <tr key={a.id} className="hover:bg-[#111C35]/50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">{a.application_number}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-200">{a.student_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{a.roll_number} • {a.department_name}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-300">{a.application_type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-400" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          a.status === 'APPROVED' ? 'emerald' :
                          a.status === 'REJECTED' ? 'rose' :
                          a.status === 'UNDER_REVIEW' ? 'amber' : 'blue'
                        }
                      >
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <Button
                        onClick={() => {
                          setSelectedApp(a);
                          setReviewStatus(a.status === 'SUBMITTED' ? 'APPROVED' : a.status);
                          setReviewRemarks(a.admin_remarks || '');
                        }}
                        variant="secondary"
                        size="sm"
                        className="text-xs py-1"
                      >
                        Review / Action
                      </Button>

                      {a.status === 'APPROVED' && (
                        <Button
                          onClick={() => handleDownloadDoc(a.id, a.application_number)}
                          variant="primary"
                          size="sm"
                          className="text-xs py-1 bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-cyan-400" /> Review Student Application
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedApp.application_number} • {selectedApp.student_name} ({selectedApp.roll_number})
                </p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-[#111C35] rounded-xl border border-[#1E2E4F] space-y-1.5 text-xs">
              <p className="text-slate-400"><b>Category:</b> <span className="text-cyan-400">{selectedApp.application_type.replace(/_/g, ' ')}</span></p>
              <p className="text-slate-400"><b>Stated Reason:</b> <span className="text-slate-200">{selectedApp.reason}</span></p>
              <p className="text-slate-400"><b>Academic Year:</b> <span className="text-slate-200">{selectedApp.academic_year}</span></p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Update Clearance Decision
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="APPROVED">APPROVE & ISSUE OFFICIAL DOCUMENT</option>
                  <option value="UNDER_REVIEW">PLACE UNDER FURTHER REVIEW</option>
                  <option value="CORRECTION_REQUESTED">REQUEST CORRECTION FROM STUDENT</option>
                  <option value="REJECTED">REJECT APPLICATION</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Administrative Endorsement / Remarks
                </label>
                <textarea
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  rows={3}
                  placeholder="Reason for decision, instructions for student, or verification confirmation..."
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <Button type="button" onClick={() => setSelectedApp(null)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Commit Clearance Decision'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
export default AdminApplicationsPage;
