import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Building2,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  PlusCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

export const PlacementsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isOfficerOrAdmin = hasRole(['PLACEMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN', 'MANAGEMENT']);

  const [activeTab, setActiveTab] = useState<'drives' | 'my-apps' | 'pipeline' | 'companies'>(
    isStudent ? 'drives' : 'pipeline'
  );

  const [jobs, setJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [pipelineApps, setPipelineApps] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Job Form
  const [jobForm, setJobForm] = useState({
    company_id: '',
    title: '',
    description: '',
    package_ctc: 12.0,
    min_cgpa: 7.0,
    eligible_departments: 'CSE,ECE',
  });

  // Company Form
  const [compForm, setCompForm] = useState({
    name: '',
    website: '',
    industry: '',
    contact_email: '',
    location: '',
    headquarters: '',
    contact_person: '',
    phone: '',
    description: '',
  });

  // Apply Form
  const [applyForm, setApplyForm] = useState({
    resume_url: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsRes, companiesRes] = await Promise.all([
        apiClient.get('/placements/jobs'),
        apiClient.get('/placements/companies'),
      ]);
      setJobs(jobsRes.data);
      setCompanies(companiesRes.data);

      if (isStudent) {
        const myAppsRes = await apiClient.get('/placements/my-applications');
        setMyApplications(myAppsRes.data);
      }

      if (isOfficerOrAdmin) {
        const [pipelineRes, statsRes] = await Promise.all([
          apiClient.get('/placements/applications'),
          apiClient.get('/placements/stats'),
        ]);
        setPipelineApps(pipelineRes.data);
        setStats(statsRes.data);
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

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/placements/companies', compForm);
      setIsCompanyModalOpen(false);
      setCompForm({
        name: '',
        website: '',
        industry: '',
        contact_email: '',
        location: '',
        headquarters: '',
        contact_person: '',
        phone: '',
        description: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create company.');
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/placements/jobs', jobForm);
      setIsJobModalOpen(false);
      setJobForm({
        company_id: '',
        title: '',
        description: '',
        package_ctc: 12.0,
        min_cgpa: 7.0,
        eligible_departments: 'CSE,ECE',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to post job role.');
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      await apiClient.post('/placements/apply', {
        job_role_id: selectedJob.id,
        resume_url: applyForm.resume_url || undefined,
        notes: applyForm.notes || undefined,
      });
      setIsApplyModalOpen(false);
      setSelectedJob(null);
      setApplyForm({ resume_url: '', notes: '' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to apply for drive.');
    }
  };

  const handleStatusUpdate = async (appId: string, newStatus: string) => {
    let ctc: number | undefined = undefined;
    if (newStatus === 'OFFERED') {
      const input = prompt('Enter offered CTC (LPA):', '12.0');
      if (!input) return;
      ctc = parseFloat(input);
    }
    try {
      await apiClient.put(`/placements/applications/${appId}/status`, {
        status: newStatus,
        ctc_offered: ctc,
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update application status.');
    }
  };

  const funnelChartData = stats?.funnel
    ? Object.entries(stats.funnel).map(([key, val]) => ({ name: key, count: val }))
    : [];

  const funnelColors = ['#06B6D4', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E'];

  if (loading) {
    return (
      <PageContainer title="Placement & Career Intelligence" subtitle="Loading recruitment pipeline...">
        <div className="py-12 text-center text-xs text-slate-500">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Loading placement intelligence...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Placement & Career Intelligence"
      subtitle="Comprehensive campus recruitment drives, student eligibility matching, and hiring pipeline analytics."
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        {isOfficerOrAdmin && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 border-cyan-800/30">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
                <Building2 className="w-4 h-4" /> Partner Companies
              </div>
              <div className="text-2xl font-bold text-white">{stats.total_companies}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">{stats.active_drives} active recruitment drives</p>
            </Card>

            <Card className="p-4 border-blue-800/30">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-1">
                <Users className="w-4 h-4" /> Total Applications
              </div>
              <div className="text-2xl font-bold text-white">{stats.total_applications}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Across all current drives</p>
            </Card>

            <Card className="p-4 border-emerald-800/30">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" /> Offers Extended
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.total_offers}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">{stats.placement_rate}% overall placement rate</p>
            </Card>

            <Card className="p-4 border-amber-800/30">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <TrendingUp className="w-4 h-4" /> Average CTC
              </div>
              <div className="text-2xl font-bold text-white">₹{stats.average_ctc} LPA</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Mean compensation</p>
            </Card>

            <Card className="p-4 border-purple-800/30">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
                <Award className="w-4 h-4" /> Highest Package
              </div>
              <div className="text-2xl font-bold text-purple-300">₹{stats.highest_ctc} LPA</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Campus highest offer</p>
            </Card>
          </div>
        )}

        {/* Recruitment Funnel Visualizer */}
        {isOfficerOrAdmin && funnelChartData.length > 0 && (
          <Card
            title="Recruitment Funnel & Pipeline Velocity"
            subtitle="Real-time conversion of registered student applicants to institutional offers"
          >
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {funnelChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={funnelColors[index % funnelColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Navigation Tabs and Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('drives')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'drives'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Recruitment Drives ({jobs.length})
            </button>

            {isStudent && (
              <button
                onClick={() => setActiveTab('my-apps')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  activeTab === 'my-apps'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Applications ({myApplications.length})
              </button>
            )}

            {isOfficerOrAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('pipeline')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    activeTab === 'pipeline'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Candidate Pipeline ({pipelineApps.length})
                </button>

                <button
                  onClick={() => setActiveTab('companies')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    activeTab === 'companies'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Partner Companies ({companies.length})
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOfficerOrAdmin && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Company
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsJobModalOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Post Job Drive
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Recruitment Drives */}
        {activeTab === 'drives' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-xs text-slate-500">
                No active recruitment drives at this time.
              </div>
            ) : (
              jobs.map((job) => (
                <Card key={job.id} className="p-5 border-slate-800/80 hover:border-slate-700 transition space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-cyan-400 font-semibold">{job.company_name}</span>
                      <h3 className="text-base font-bold text-white mt-0.5">{job.title}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-emerald-400">₹{job.package_ctc} LPA</span>
                      <div className="text-[10px] text-slate-400 font-mono">Full-time CTC</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{job.description}</p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">
                      Min CGPA: <strong className="text-slate-200">{job.min_cgpa}</strong>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      Eligible: <strong className="text-slate-200">{job.eligible_departments}</strong>
                    </span>
                  </div>

                  {isStudent && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      {job.has_applied ? (
                        <Badge variant="blue" size="sm">
                          Applied ({job.application_status})
                        </Badge>
                      ) : job.is_eligible ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="emerald" size="sm">Eligible</Badge>
                          <span className="text-[11px] text-slate-400">{job.eligibility_reason}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="rose" size="sm">Ineligible</Badge>
                          <span className="text-[11px] text-slate-500">{job.eligibility_reason}</span>
                        </div>
                      )}

                      {!job.has_applied && job.is_eligible && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            setIsApplyModalOpen(true);
                          }}
                          className="flex items-center gap-1.5"
                        >
                          Apply Now <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Student My Applications */}
        {activeTab === 'my-apps' && isStudent && (
          <Card title="My Placement Applications & Drive Progress">
            {myApplications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                You haven't submitted any job applications yet. Browse the Recruitment Drives tab to apply!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0B0F19] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Role Title</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Applied Date</th>
                      <th className="py-3 px-4">Notes / Feedback</th>
                      <th className="py-3 px-4 text-right">Offer Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {myApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-white">{app.company_name}</td>
                        <td className="py-3 px-4 text-slate-300">{app.job_title}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              app.status === 'OFFERED'
                                ? 'emerald'
                                : app.status === 'REJECTED'
                                ? 'rose'
                                : app.status === 'SHORTLISTED'
                                ? 'cyan'
                                : 'blue'
                            }
                            size="sm"
                          >
                            {app.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(app.applied_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{app.notes || '—'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {app.offer ? `₹${app.offer.ctc_offered} LPA` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 3: Officer Candidate Pipeline */}
        {activeTab === 'pipeline' && isOfficerOrAdmin && (
          <Card
            title={`Candidate Review Pipeline (${pipelineApps.length})`}
            subtitle="Manage candidate progression across recruitment funnel stages"
          >
            {pipelineApps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No candidate applications in the pipeline.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0B0F19] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Dept / CGPA</th>
                      <th className="py-3 px-4">Applied Drive</th>
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4 text-right">Advance Funnel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {pipelineApps.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-white">{a.student_name}</td>
                        <td className="py-3 px-4 font-mono text-cyan-400">{a.roll_number}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {a.department_name} • <strong className="text-slate-200">{a.cgpa}</strong>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-200">{a.company_name}</span>
                          <div className="text-[11px] text-slate-400">{a.job_title}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              a.status === 'OFFERED'
                                ? 'emerald'
                                : a.status === 'REJECTED'
                                ? 'rose'
                                : a.status === 'SHORTLISTED'
                                ? 'cyan'
                                : 'blue'
                            }
                            size="sm"
                          >
                            {a.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <select
                            value={a.status}
                            onChange={(e) => handleStatusUpdate(a.id, e.target.value)}
                            className="px-2 py-1 bg-[#0B0F19] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="APPLIED">Applied</option>
                            <option value="SHORTLISTED">Shortlisted</option>
                            <option value="INTERVIEW_SCHEDULED">Interview</option>
                            <option value="OFFERED">Extend Offer</option>
                            <option value="REJECTED">Reject</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 4: Partner Companies */}
        {activeTab === 'companies' && isOfficerOrAdmin && (
          <Card
            title="Recruiting Corporate Partners"
            subtitle="Registered institutional hiring partners and drive hosts"
            action={
              <Button size="sm" onClick={() => setIsCompanyModalOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Partner Company
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {companies.map((c) => (
                <div key={c.id} className="p-4 rounded-xl border border-slate-800 bg-[#0B0F19] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      {c.name}
                    </h4>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-cyan-300"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Industry: <span className="text-slate-200">{c.industry || 'Technology'}</span>
                  </div>
                  {c.location && (
                    <div className="text-xs text-slate-400">
                      Location: <span className="text-slate-200">{c.location}</span>
                    </div>
                  )}
                  {c.contact_person && (
                    <div className="text-xs text-slate-400">
                      Recruiter: <span className="text-slate-200">{c.contact_person}</span> {c.phone && `(${c.phone})`}
                    </div>
                  )}
                  <div className="text-xs text-slate-400">
                    Contact: <span className="font-mono text-cyan-400">{c.contact_email || '—'}</span>
                  </div>
                  {c.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 pt-1 border-t border-slate-800/80">{c.description}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Modal: Create Job */}
        {isJobModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" /> Post Campus Recruitment Drive
              </h3>

              <form onSubmit={handleCreateJob} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company</label>
                  <select
                    value={jobForm.company_id}
                    onChange={(e) => setJobForm({ ...jobForm, company_id: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer / Data Scientist"
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Package CTC (LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={jobForm.package_ctc}
                      onChange={(e) => setJobForm({ ...jobForm, package_ctc: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Min CGPA</label>
                    <input
                      type="number"
                      step="0.1"
                      value={jobForm.min_cgpa}
                      onChange={(e) => setJobForm({ ...jobForm, min_cgpa: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Eligible Departments (Comma separated or ALL)
                  </label>
                  <input
                    type="text"
                    value={jobForm.eligible_departments}
                    onChange={(e) => setJobForm({ ...jobForm, eligible_departments: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Job Description</label>
                  <textarea
                    rows={3}
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsJobModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Publish Drive
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Company */}
        {isCompanyModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" /> Register Partner Company
              </h3>

              <form onSubmit={handleCreateCompany} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={compForm.name}
                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Fintech / Cloud Computing / AI"
                    value={compForm.industry}
                    onChange={(e) => setCompForm({ ...compForm, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website URL</label>
                  <input
                    type="url"
                    placeholder="https://company.com"
                    value={compForm.website}
                    onChange={(e) => setCompForm({ ...compForm, website: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recruiter Contact Email</label>
                  <input
                    type="email"
                    placeholder="recruiter@company.com"
                    value={compForm.contact_email}
                    onChange={(e) => setCompForm({ ...compForm, contact_email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Drive Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore / On-Campus"
                      value={compForm.location}
                      onChange={(e) => setCompForm({ ...compForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Global Headquarters</label>
                    <input
                      type="text"
                      placeholder="e.g. Seattle, WA / Mumbai"
                      value={compForm.headquarters}
                      onChange={(e) => setCompForm({ ...compForm, headquarters: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Recruiter Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah Connor"
                      value={compForm.contact_person}
                      onChange={(e) => setCompForm({ ...compForm, contact_person: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={compForm.phone}
                      onChange={(e) => setCompForm({ ...compForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the organization and technology focus..."
                    value={compForm.description}
                    onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsCompanyModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Register
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Student Apply */}
        {isApplyModalOpen && selectedJob && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" /> Apply to {selectedJob.company_name}
              </h3>
              <p className="text-xs text-slate-400">
                Submitting application for <strong>{selectedJob.title}</strong> (Package: ₹{selectedJob.package_ctc} LPA).
              </p>

              <form onSubmit={handleApply} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Portfolio / Resume URL</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/your-resume.pdf"
                    value={applyForm.resume_url}
                    onChange={(e) => setApplyForm({ ...applyForm, resume_url: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Candidate Statement / Pitch</label>
                  <textarea
                    rows={3}
                    placeholder="Highlight your relevant coursework, projects, or competitive programming achievements..."
                    value={applyForm.notes}
                    onChange={(e) => setApplyForm({ ...applyForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsApplyModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Confirm Application
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
