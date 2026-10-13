import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import apiClient from '../services/api';
import {
  FileCheck2,
  Download,
  Plus,
  FileText,
  History,
} from 'lucide-react';

interface HistoryItem {
  id: string;
  status: string;
  remarks?: string;
  action_by_name?: string;
  created_at: string;
}

interface Application {
  id: string;
  application_number: string;
  application_type: string;
  reason: string;
  status: string;
  academic_year: string;
  semester_number?: number;
  admin_remarks?: string;
  created_at: string;
  updated_at: string;
  generated_document_url?: string;
  history: HistoryItem[];
}

const APPLICATION_TYPES = [
  { value: 'BONAFIDE_CERTIFICATE', label: 'Bonafide Certificate' },
  { value: 'LEAVING_CERTIFICATE', label: 'Leaving / Transfer Certificate' },
  { value: 'TRANSCRIPT_REQUEST', label: 'Official Academic Transcript' },
  { value: 'CHARACTER_CERTIFICATE', label: 'Character Certificate' },
  { value: 'RAILWAY_CONCESSION', label: 'Railway Travel Concession Pass' },
  { value: 'BUS_CONCESSION', label: 'Bus Pass Concession' },
  { value: 'SCHOLARSHIP_NOC', label: 'Scholarship Endorsement NOC' },
  { value: 'EXAM_HALL_TICKET_DUPLICATE', label: 'Duplicate Exam Hall Ticket' },
  { value: 'GRADE_CARD_DUPLICATE', label: 'Duplicate Grade Card' },
  { value: 'COURSE_COMPLETION', label: 'Course Completion Verification' },
  { value: 'INTERNSHIP_NOC', label: 'Industrial Internship NOC' },
  { value: 'FEE_CONCESSION_REQUEST', label: 'Fee Concession / Installment Request' },
  { value: 'NAME_CORRECTION', label: 'Record / Name Correction Request' },
  { value: 'OTHER', label: 'General Administrative Request' },
];

export const StudentApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Form State
  const [appType, setAppType] = useState('BONAFIDE_CERTIFICATE');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<Application[]>('/applications/my');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      setSubmitting(true);
      await apiClient.post('/applications/', {
        application_type: appType,
        reason: reason.trim(),
        academic_year: '2025-2026',
      });
      setShowModal(false);
      setReason('');
      fetchApplications();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit application.');
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
      alert(err.response?.data?.detail || 'Unable to download document.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'READY_FOR_COLLECTION':
      case 'DISPATCHED':
        return <Badge variant="emerald">APPROVED</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="amber">UNDER REVIEW</Badge>;
      case 'REJECTED':
        return <Badge variant="rose">REJECTED</Badge>;
      case 'CORRECTION_REQUESTED':
        return <Badge variant="amber">CORRECTION NEEDED</Badge>;
      default:
        return <Badge variant="blue">SUBMITTED</Badge>;
    }
  };

  return (
    <PageContainer
      title="Student Application & Request Center"
      subtitle="Request certificates, concessions, official NOCs, duplicate credentials, and track institutional approval status."
      action={
        <Button onClick={() => setShowModal(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> New Application Request
        </Button>
      }
    >
      {/* Applications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : applications.length === 0 ? (
          <Card className="p-12 text-center border-[#1E293B] bg-[#0E1526]/80 space-y-4">
            <FileText className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-200">No applications filed yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Need a bonafide certificate, bus concession pass, or internship endorsement? Submit a request above.
            </p>
            <Button onClick={() => setShowModal(true)} variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Submit First Request
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <Card key={app.id} className="p-6 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400">{app.application_number}</span>
                    {getStatusBadge(app.status)}
                  </div>

                  <h3 className="text-base font-semibold text-slate-100">
                    {app.application_type.replace(/_/g, ' ')}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    <b>Purpose:</b> {app.reason}
                  </p>

                  {app.admin_remarks && (
                    <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-400">Admin Remarks: </span>
                      <span className="text-slate-200">{app.admin_remarks}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    Filed: {new Date(app.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setSelectedApp(app)}
                      variant="secondary"
                      size="sm"
                      className="text-xs py-1"
                    >
                      <History className="w-3.5 h-3.5 mr-1" /> History
                    </Button>

                    {(app.status === 'APPROVED' || app.status === 'READY_FOR_COLLECTION' || app.status === 'DISPATCHED') && (
                      <Button
                        onClick={() => handleDownloadDoc(app.id, app.application_number)}
                        variant="primary"
                        size="sm"
                        className="text-xs py-1 bg-emerald-600 hover:bg-emerald-500"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Official PDF
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-cyan-400" /> New Application Request
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Request Category
                </label>
                <select
                  value={appType}
                  onChange={(e) => setAppType(e.target.value)}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {APPLICATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason & Purpose of Application
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Detail the specific justification, external organization name, or reason for this request..."
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                <Button type="button" onClick={() => setShowModal(false)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Official Application'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Timeline Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" /> Application Timeline
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedApp.application_number} • {selectedApp.application_type.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {selectedApp.history && selectedApp.history.length > 0 ? (
                selectedApp.history.map((h, idx) => (
                  <div key={h.id} className="flex items-start gap-3 relative pb-4">
                    {idx < selectedApp.history.length - 1 && (
                      <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-800" />
                    )}
                    <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200">{h.status}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{h.remarks || 'Status updated.'}</p>
                      {h.action_by_name && (
                        <p className="text-[10px] text-slate-500">Processed by: {h.action_by_name}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No progression events logged.</p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#1E293B]">
              <Button onClick={() => setSelectedApp(null)} variant="secondary" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
export default StudentApplicationsPage;
