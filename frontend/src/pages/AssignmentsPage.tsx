import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import {
  FileText,
  Upload,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Calendar,
  Award,
  BookOpen,
  X,
} from 'lucide-react';
import apiClient from '../services/api';
import { Assignment, AssignmentSubmission, FacultyAssignmentOverview } from '../types';

export const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Data states
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [facultyOverview, setFacultyOverview] = useState<FacultyAssignmentOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Submit Modal (Student)
  const [submitModalOpen, setSubmitModalOpen] = useState<boolean>(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Create Assignment Modal (Faculty)
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newInstructions, setNewInstructions] = useState<string>('');
  const [newMaxMarks, setNewMaxMarks] = useState<number>(25);
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [newSemester, setNewSemester] = useState<number>(4);
  const [newSection, setNewSection] = useState<string>('A');
  const [allowLate, setAllowLate] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  // Grade Submissions Modal (Faculty)
  const [gradeModalOpen, setGradeModalOpen] = useState<boolean>(false);
  const [activeAssignmentForGrading, setActiveAssignmentForGrading] = useState<Assignment | null>(null);
  const [submissionsList, setSubmissionsList] = useState<AssignmentSubmission[]>([]);
  const [evaluatingSubId, setEvaluatingSubId] = useState<string | null>(null);
  const [evalMarks, setEvalMarks] = useState<number>(0);
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [evalSaving, setEvalSaving] = useState<boolean>(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, [isStudent]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isStudent) {
        const res = await apiClient.get<Assignment[]>('/assignments/student/my');
        setAssignments(res.data);
      } else {
        const [assRes, overRes] = await Promise.all([
          apiClient.get<Assignment[]>('/assignments/faculty/my'),
          apiClient.get<FacultyAssignmentOverview>('/assignments/faculty-overview').catch(() => ({ data: null })),
        ]);
        setAssignments(assRes.data);
        if (overRes.data) setFacultyOverview(overRes.data);
      }
    } catch (err: any) {
      console.error('Error loading assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Student: handle upload solution
  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !selectedFile) {
      setMessage({ text: 'Please select a solution file to upload.', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      await apiClient.post(`/assignments/${selectedAssignment.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage({ text: `Assignment "${selectedAssignment.title}" submitted successfully!`, type: 'success' });
      setSubmitModalOpen(false);
      setSelectedFile(null);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to submit assignment.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Faculty: open grading modal
  const handleOpenGrading = async (assignment: Assignment) => {
    try {
      setActiveAssignmentForGrading(assignment);
      setGradeModalOpen(true);
      const res = await apiClient.get<AssignmentSubmission[]>(`/assignments/${assignment.id}/submissions`);
      setSubmissionsList(res.data);
    } catch (err: any) {
      setMessage({ text: 'Failed to fetch student submissions.', type: 'error' });
    }
  };

  // Faculty: save grade
  const handleSaveGrade = async (submissionId: string) => {
    try {
      setEvalSaving(true);
      await apiClient.post(`/assignments/submissions/${submissionId}/grade`, {
        marks_awarded: Number(evalMarks),
        feedback: evalFeedback,
      });

      setMessage({ text: 'Evaluation & feedback saved successfully.', type: 'success' });
      setEvaluatingSubId(null);
      if (activeAssignmentForGrading) {
        const res = await apiClient.get<AssignmentSubmission[]>(`/assignments/${activeAssignmentForGrading.id}/submissions`);
        setSubmissionsList(res.data);
      }
      loadData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to grade submission.', type: 'error' });
    } finally {
      setEvalSaving(false);
    }
  };

  // Download submission file
  const handleDownloadSubmission = async (subId: string, filename: string) => {
    try {
      const res = await apiClient.get(`/assignments/submissions/${subId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setMessage({ text: 'Could not download submission file.', type: 'error' });
    }
  };

  // Download assignment problem attachment
  const handleDownloadAssignmentAttachment = async (assId: string, filename?: string) => {
    try {
      const res = await apiClient.get(`/assignments/${assId}/attachment/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'assignment_specification.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setMessage({ text: 'Could not download assignment specification file.', type: 'error' });
    }
  };

  // Faculty: create new assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      // Fetch default subject/dept
      let subId = '';
      let deptId = '';
      const subRes = await apiClient.get('/academics/subjects').catch(() => ({ data: [] }));
      if (subRes.data.length > 0) {
        subId = subRes.data[0].id;
        deptId = subRes.data[0].department_id;
      }

      await apiClient.post('/assignments/', {
        subject_id: subId,
        department_id: deptId,
        semester_number: Number(newSemester),
        section: newSection,
        title: newTitle,
        description: newDescription,
        instructions: newInstructions,
        max_marks: Number(newMaxMarks),
        due_date: newDueDate ? new Date(newDueDate).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        allow_late_submission: allowLate,
      });

      setMessage({ text: `Assignment "${newTitle}" created and published!`, type: 'success' });
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewInstructions('');
      loadData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to create assignment.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Filtered assignments
  const filteredAssignments = assignments.filter((a) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING') {
      return !a.my_submission || a.my_submission.status === 'NOT_SUBMITTED';
    }
    if (filterStatus === 'SUBMITTED') {
      return a.my_submission && a.my_submission.status !== 'NOT_SUBMITTED';
    }
    if (filterStatus === 'GRADED') {
      return a.my_submission && a.my_submission.status === 'GRADED';
    }
    return true;
  });

  return (
    <PageContainer>
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

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Course Assignments</h1>
              <Badge variant="cyan">LMS Hub</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {isStudent
                ? 'Manage, submit, and review grades for all enrolled subject coursework.'
                : 'Publish course assignments, review submissions, and submit evaluative feedback.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFaculty && (
              <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            )}
          </div>
        </div>

        {/* Top KPIs */}
        {isStudent ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Total Enrolled</p>
                  <p className="text-xl font-bold text-white">{assignments.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Pending Action</p>
                  <p className="text-xl font-bold text-amber-400">
                    {assignments.filter((a) => !a.my_submission || a.my_submission.status === 'NOT_SUBMITTED').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Submitted</p>
                  <p className="text-xl font-bold text-blue-400">
                    {assignments.filter((a) => a.my_submission && a.my_submission.status !== 'NOT_SUBMITTED').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Graded Work</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {assignments.filter((a) => a.my_submission?.status === 'GRADED').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Created Assignments</p>
                  <p className="text-xl font-bold text-white">
                    {facultyOverview?.total_assignments ?? assignments.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Pending Evaluation</p>
                  <p className="text-xl font-bold text-amber-400">
                    {facultyOverview?.pending_evaluation_count ??
                      assignments.reduce((acc, a) => acc + (a.pending_evaluation_count || 0), 0)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Published Active</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {facultyOverview?.published_assignments ?? assignments.filter((a) => a.status === 'PUBLISHED').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Submissions Logged</p>
                  <p className="text-xl font-bold text-purple-400">
                    {assignments.reduce((acc, a) => acc + (a.submissions_count || 0), 0)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filter Navigation */}
        {isStudent && (
          <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3">
            {[
              { id: 'ALL', label: 'All Assignments' },
              { id: 'PENDING', label: 'Pending Submission' },
              { id: 'SUBMITTED', label: 'Submitted' },
              { id: 'GRADED', label: 'Graded with Feedback' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                  filterStatus === tab.id
                    ? 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Assignments List */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-cyan-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <Card className="p-12 text-center bg-[#111827]/60 border-[#1E293B]">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-300">No coursework assignments found</p>
            <p className="text-xs text-slate-500 mt-1">There are no assignments matching the current criteria.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignments.map((ass) => {
              const mySub = ass.my_submission;
              const isOverdue = new Date(ass.due_date) < new Date();

              return (
                <Card
                  key={ass.id}
                  className="p-5 bg-[#111827]/90 border-[#1E293B] hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-950/80 border border-cyan-800/80 text-cyan-300">
                            {ass.subject_code || 'CS301'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{ass.subject_name}</span>
                        </div>
                        <h3 className="text-base font-semibold text-white mt-1.5">{ass.title}</h3>
                      </div>

                      {isStudent ? (
                        mySub?.status === 'GRADED' ? (
                          <Badge variant="emerald">
                            Score: {mySub.marks_awarded} / {ass.max_marks}
                          </Badge>
                        ) : mySub?.status === 'SUBMITTED' || mySub?.status === 'LATE' ? (
                          <Badge variant={mySub.status === 'LATE' ? 'rose' : 'cyan'}>
                            {mySub.status === 'LATE' ? 'Submitted Late' : 'Submitted'}
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="rose">Overdue</Badge>
                        ) : (
                          <Badge variant="amber">Action Required</Badge>
                        )
                      ) : (
                        <Badge variant={ass.status === 'PUBLISHED' ? 'emerald' : 'slate'}>{ass.status}</Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{ass.description}</p>

                    {ass.instructions && (
                      <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#1E293B]/70 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Instructions: </span>
                        {ass.instructions}
                      </div>
                    )}

                    {/* Problem Specification Attachment Download */}
                    {ass.attachment_name && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadAssignmentAttachment(ass.id, ass.attachment_name)}
                          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1 px-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Problem Sheet: {ass.attachment_name}</span>
                          <Download className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-[#1E293B]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Due: {new Date(ass.due_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Max Marks: {ass.max_marks}</span>
                      </div>
                    </div>

                    {/* Feedback if Graded */}
                    {isStudent && mySub?.status === 'GRADED' && mySub.feedback && (
                      <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs">
                        <p className="text-emerald-400 font-semibold mb-0.5">Faculty Evaluation Feedback:</p>
                        <p className="text-slate-300 italic">"{mySub.feedback}"</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      {isStudent
                        ? `Instructor: ${ass.faculty_name || 'Faculty'}`
                        : `${ass.submissions_count || 0} Submissions (${ass.pending_evaluation_count || 0} Pending)`}
                    </span>

                    {isStudent ? (
                      mySub ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => handleDownloadSubmission(mySub.id, mySub.original_filename)}
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            My File
                          </Button>
                          {ass.allow_late_submission && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedAssignment(ass);
                                setSubmitModalOpen(true);
                              }}
                            >
                              Re-upload
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => {
                            setSelectedAssignment(ass);
                            setSubmitModalOpen(true);
                          }}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Submit Solution
                        </Button>
                      )
                    ) : (
                      <Button variant="primary" onClick={() => handleOpenGrading(ass)}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Grade Submissions
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* MODAL: Submit Solution (Student) */}
        {submitModalOpen && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Submit Assignment Solution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedAssignment.title}</p>
                </div>
                <button
                  onClick={() => setSubmitModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSolution} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-1 text-xs">
                  <p className="text-slate-300 font-medium">Assignment Details:</p>
                  <p className="text-slate-400">
                    Subject: <span className="text-white">{selectedAssignment.subject_name}</span>
                  </p>
                  <p className="text-slate-400">
                    Max Marks: <span className="text-white">{selectedAssignment.max_marks}</span>
                  </p>
                  <p className="text-slate-400">
                    Due Date: <span className="text-white">{new Date(selectedAssignment.due_date).toLocaleString()}</span>
                  </p>
                  <p className="text-slate-400">
                    Supported Formats: <span className="text-cyan-400 font-mono">PDF, ZIP, DOCX, PY, IPYNB, TXT</span> (Max 10MB)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Solution File to Upload *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer bg-[#0B0F19] border border-[#1E293B] rounded-xl p-2"
                  />
                  {selectedFile && (
                    <p className="text-[11px] text-emerald-400 mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                  <Button variant="secondary" type="button" onClick={() => setSubmitModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting || !selectedFile}>
                    {submitting ? 'Uploading...' : 'Confirm Submission'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Create Assignment (Faculty) */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <h3 className="text-lg font-bold text-white">Create Course Assignment</h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <Input
                  label="Assignment Title *"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Assignment 2: Graph Algorithms & Minimum Spanning Trees"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                    <select
                      value={newSemester}
                      onChange={(e) => setNewSemester(Number(e.target.value))}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Section</label>
                    <select
                      value={newSection}
                      onChange={(e) => setNewSection(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {['A', 'B', 'C'].map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Maximum Marks *"
                    type="number"
                    value={newMaxMarks}
                    onChange={(e) => setNewMaxMarks(Number(e.target.value))}
                    required
                  />
                  <Input
                    label="Due Date & Time *"
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Problem Statement *</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    required
                    placeholder="Provide overview of the assignment tasks..."
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Submission Instructions</label>
                  <textarea
                    rows={2}
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    placeholder="e.g. Upload a single ZIP file containing solution code and PDF report."
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowLate"
                    checked={allowLate}
                    onChange={(e) => setAllowLate(e.target.checked)}
                    className="rounded border-[#1E293B] text-cyan-500 focus:ring-0 bg-[#0B0F19]"
                  />
                  <label htmlFor="allowLate" className="text-xs text-slate-300">
                    Allow late submissions with penalty tag
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
                  <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={creating || !newTitle || !newDescription}>
                    {creating ? 'Publishing...' : 'Publish Assignment'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Faculty Grade Submissions Drawer/Modal */}
        {gradeModalOpen && activeAssignmentForGrading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-4xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Evaluate Student Submissions</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeAssignmentForGrading.title} • Max Marks: {activeAssignmentForGrading.max_marks}
                  </p>
                </div>
                <button
                  onClick={() => setGradeModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submissionsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No submissions uploaded by students for this assignment yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {submissionsList.map((sub) => {
                    const isEvaluating = evaluatingSubId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{sub.student_name || 'Student'}</span>
                              <span className="font-mono text-xs text-cyan-400">({sub.roll_number})</span>
                              <Badge variant={sub.status === 'GRADED' ? 'emerald' : sub.status === 'LATE' ? 'rose' : 'cyan'}>
                                {sub.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Submitted: {new Date(sub.submitted_at).toLocaleString()} • File:{' '}
                              <span className="text-slate-300 font-mono">{sub.original_filename}</span> (
                              {(sub.file_size / 1024).toFixed(1)} KB)
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => handleDownloadSubmission(sub.id, sub.original_filename)}
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              Download File
                            </Button>
                            <Button
                              variant={isEvaluating ? 'outline' : 'primary'}
                              onClick={() => {
                                if (isEvaluating) {
                                  setEvaluatingSubId(null);
                                } else {
                                  setEvaluatingSubId(sub.id);
                                  setEvalMarks(sub.marks_awarded ?? activeAssignmentForGrading.max_marks);
                                  setEvalFeedback(sub.feedback ?? '');
                                }
                              }}
                            >
                              {sub.status === 'GRADED' ? 'Revise Grade' : 'Grade Submission'}
                            </Button>
                          </div>
                        </div>

                        {/* Existing Grade & Feedback display */}
                        {sub.status === 'GRADED' && !isEvaluating && (
                          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-emerald-400 font-semibold">Marks Awarded: </span>
                              <span className="text-white font-bold">
                                {sub.marks_awarded} / {activeAssignmentForGrading.max_marks}
                              </span>
                              {sub.feedback && (
                                <p className="text-slate-300 mt-1 italic">Feedback: "{sub.feedback}"</p>
                              )}
                            </div>
                            {sub.graded_at && (
                              <span className="text-slate-500 text-[10px]">
                                Graded on {new Date(sub.graded_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Evaluation Input Form */}
                        {isEvaluating && (
                          <div className="p-4 rounded-xl bg-[#111827] border border-cyan-800/60 space-y-3 mt-2">
                            <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                              Enter Evaluation & Score
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-slate-300 mb-1">
                                  Marks Awarded (Max {activeAssignmentForGrading.max_marks}) *
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={activeAssignmentForGrading.max_marks}
                                  value={evalMarks}
                                  onChange={(e) => setEvalMarks(Number(e.target.value))}
                                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs text-slate-300 mb-1">Feedback / Remarks</label>
                                <input
                                  type="text"
                                  value={evalFeedback}
                                  onChange={(e) => setEvalFeedback(e.target.value)}
                                  placeholder="e.g. Well written analysis, optimal time complexity demonstrated."
                                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <Button variant="secondary" onClick={() => setEvaluatingSubId(null)}>
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                disabled={evalSaving}
                                onClick={() => handleSaveGrade(sub.id)}
                              >
                                {evalSaving ? 'Saving...' : 'Submit Grade'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};
