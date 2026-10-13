import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Download,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

export const CertificatesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isAdminOrFaculty = hasRole(['SUPER_ADMIN', 'ADMIN', 'FACULTY']);

  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [pendingCertificates, setPendingCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [certType, setCertType] = useState('BONAFIDE');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifyIdInput, setVerifyIdInput] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (isStudent) {
        const res = await apiClient.get('/certificates/my-certificates');
        setMyCertificates(res.data);
      }
      if (isAdminOrFaculty) {
        const res = await apiClient.get('/certificates/pending');
        setPendingCertificates(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      setErrorMsg('Please state a purpose for this certificate.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiClient.post('/certificates/request', {
        type: certType,
        purpose: purpose.trim(),
      });
      setIsModalOpen(false);
      setPurpose('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.put(`/certificates/${id}/review`, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update certificate status.');
    }
  };

  const handleDownload = (id: string) => {
    window.open(`${apiClient.defaults.baseURL}/certificates/${id}/download`, '_blank');
  };

  if (loading) {
    return (
      <PageContainer title="Digital Certificates" subtitle="Loading certificates...">
        <div className="py-12 text-center text-xs text-slate-500">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Loading certificate records...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Digital Certificates & Credentials"
      subtitle="Tamper-evident cryptographically verifiable student certificates with dynamic QR verification"
    >
      <div className="space-y-6">
        {/* Page Actions */}
        <div className="flex justify-end">
          {isStudent && (
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Request Certificate
            </Button>
          )}
        </div>

        {/* Public Verification Shortcut */}
        <Card className="p-4 bg-gradient-to-r from-cyan-950/40 to-slate-900 border-cyan-800/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-cyan-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-white">Public Certificate Verification</h3>
                <p className="text-xs text-slate-400">
                  Verify the authenticity of any CampusX certificate using its cryptographic UUID or QR code.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="e.g. CX-BONA-2026-AB12CD"
                value={verifyIdInput}
                onChange={(e) => setVerifyIdInput(e.target.value)}
                className="px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 w-full md:w-64"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (verifyIdInput.trim()) {
                    window.open(`/verify/${verifyIdInput.trim()}`, '_blank');
                  }
                }}
                className="shrink-0 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                Verify
              </Button>
            </div>
          </div>
        </Card>

        {/* Admin / Faculty Approval Queue */}
        {isAdminOrFaculty && (
          <Card
            title={`Pending Certificate Requests (${pendingCertificates.length})`}
            subtitle="Review, approve and electronically sign student official documents"
          >
            {pendingCertificates.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                All pending certificate requests have been cleared.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0B0F19] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Document Type</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Requested On</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {pendingCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-white">{cert.student_name}</td>
                        <td className="py-3 px-4 font-mono text-cyan-400">{cert.roll_number}</td>
                        <td className="py-3 px-4">
                          <Badge variant="cyan" size="sm">{cert.type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{cert.purpose}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(cert.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleReview(cert.id, 'APPROVED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-medium transition"
                          >
                            Approve & Sign
                          </button>
                          <button
                            onClick={() => handleReview(cert.id, 'REJECTED')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-medium transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Student's Certificate History */}
        {isStudent && (
          <Card
            title="My Issued & Pending Certificates"
            subtitle="Download approved certificates with embedded digital signatures and QR verification"
          >
            {myCertificates.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                You have not requested any digital certificates yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0B0F19] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Certificate UUID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Certificate PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {myCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-cyan-400 font-semibold">
                          {cert.certificate_uuid}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="blue" size="sm">{cert.type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{cert.purpose}</td>
                        <td className="py-3 px-4">
                          {cert.status === 'APPROVED' && (
                            <Badge variant="emerald" size="sm">
                              <CheckCircle2 className="w-3 h-3 mr-1 inline" /> APPROVED
                            </Badge>
                          )}
                          {cert.status === 'PENDING' && (
                            <Badge variant="amber" size="sm">
                              <Clock className="w-3 h-3 mr-1 inline" /> PENDING
                            </Badge>
                          )}
                          {cert.status === 'REJECTED' && (
                            <Badge variant="rose" size="sm">
                              <XCircle className="w-3 h-3 mr-1 inline" /> REJECTED
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(cert.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {cert.status === 'APPROVED' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDownload(cert.id)}
                                className="flex items-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5" /> PDF
                              </Button>
                              <a
                                href={`/verify/${cert.certificate_uuid}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                title="Public QR Verification Link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Processing</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Modal: Request Certificate */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-cyan-400" />
                Request Institutional Certificate
              </h3>
              <p className="text-xs text-slate-400">
                Select certificate category and specify the intended usage. Your application will be sent for Dean's digital signature.
              </p>

              {errorMsg && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Certificate Category
                  </label>
                  <select
                    value={certType}
                    onChange={(e) => setCertType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="BONAFIDE">Bonafide Certificate</option>
                    <option value="INTERNSHIP">Internship NOC / Permission</option>
                    <option value="LEAVE">Official Leave Endorsement</option>
                    <option value="COURSE_COMPLETION">Course Completion Certificate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Purpose / Justification
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Bank education loan application / Embassy visa documentation / Summer research internship"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
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
