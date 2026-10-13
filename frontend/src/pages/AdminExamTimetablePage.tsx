import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import apiClient from '../services/api';
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  GraduationCap,
  X,
} from 'lucide-react';

interface ExamSchedule {
  id: string;
  examination_id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_no: string;
  max_marks: number;
}

interface Examination {
  id: string;
  name: string;
  exam_type: string;
  academic_year: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  exam_fee: number;
  status: string;
  schedules: ExamSchedule[];
}

interface Subject {
  id: string;
  code: string;
  name: string;
  semester_number: number;
}

export const AdminExamTimetablePage: React.FC = () => {
  const [exams, setExams] = useState<Examination[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Conflict Checking State
  const [conflictWarning, setConflictWarning] = useState<string[]>([]);
  const [conflictChecked, setConflictChecked] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);

  // New Examination Form
  const [examForm, setExamForm] = useState({
    name: 'Spring 2026 Regular End-Semester Examinations',
    exam_type: 'END_SEMESTER',
    academic_year: '2025-2026',
    semester_number: 4,
    start_date: '2026-05-04',
    end_date: '2026-05-22',
    exam_fee: 1500.0,
    form_opening_date: '2026-04-01',
    form_closing_date: '2026-04-25',
    instructions: 'Candidates must carry admit card and university identity card.',
  });

  // New Slot Form
  const [slotForm, setSlotForm] = useState({
    subject_id: '',
    exam_date: '2026-05-05',
    start_time: '10:00 AM',
    end_time: '01:00 PM',
    room_no: 'Exam Hall 1',
    max_marks: 100.0,
  });

  useEffect(() => {
    fetchExams();
    fetchSubjects();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<Examination[]>('/examinations/');
      setExams(res.data);
      if (res.data.length > 0 && !selectedExamId) {
        setSelectedExamId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get<Subject[]>('/academics/subjects');
      setSubjects(res.data);
      if (res.data.length > 0) {
        setSlotForm((prev) => ({ ...prev, subject_id: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/examinations/', examForm);
      setShowExamModal(false);
      fetchExams();
      setSelectedExamId(res.data.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create examination.');
    }
  };

  const handleConflictCheck = async () => {
    if (!slotForm.subject_id || !slotForm.exam_date) return;
    try {
      setCheckingConflict(true);
      const res = await apiClient.post('/examinations/check-conflict', {
        examination_id: selectedExamId,
        exam_date: slotForm.exam_date,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        room_no: slotForm.room_no,
        subject_id: slotForm.subject_id,
      });
      setConflictChecked(true);
      if (res.data.has_conflict) {
        setConflictWarning(res.data.conflicts);
      } else {
        setConflictWarning([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !slotForm.subject_id) return;
    try {
      await apiClient.post(`/examinations/${selectedExamId}/schedules`, slotForm);
      setShowSlotModal(false);
      setConflictChecked(false);
      setConflictWarning([]);
      fetchExams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add timetable slot.');
    }
  };

  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  if (loading) {
    return (
      <PageContainer
        title="Examination Timetable & Matrix Scheduling"
        subtitle="Publish academic exam sessions, coordinate venue halls, and verify room/subject conflicts."
      >
        <div className="py-16 text-center text-slate-400 font-mono text-xs">
          Loading examination matrix schedules...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Examination Timetable & Matrix Scheduling"
      subtitle="Publish academic exam sessions, coordinate venue halls, and verify room/subject conflicts."
      action={
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowExamModal(true)} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> New Exam Session
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Exam Selector */}
        {exams.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {exams.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExamId(ex.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition border flex items-center gap-2 ${
                  activeExam?.id === ex.id
                    ? 'bg-cyan-950 border-cyan-600 text-cyan-300 shadow-sm shadow-cyan-950'
                    : 'bg-[#111C35] border-[#1E2E4F] text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{ex.name}</span>
                <span className="font-mono text-[10px] text-slate-500">Sem {ex.semester_number}</span>
              </button>
            ))}
          </div>
        )}

        {/* Active Exam Overview & Schedules */}
        {activeExam ? (
          <div className="space-y-6">
            <Card className="p-6 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {activeExam.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Academic Year {activeExam.academic_year} • Semester {activeExam.semester_number} • Fee: ₹
                    {activeExam.exam_fee.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="cyan">{activeExam.status}</Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    Window: {activeExam.start_date} to {activeExam.end_date}
                  </span>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Published Timetable Slots ({activeExam.schedules?.length || 0})
                  </h4>
                  <Button size="sm" variant="secondary" onClick={() => setShowSlotModal(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Timetable Slot
                  </Button>
                </div>

                {!activeExam.schedules || activeExam.schedules.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No exam slots scheduled yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#1E293B] text-slate-400 font-mono">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Timing</th>
                          <th className="py-2.5 px-3">Subject Code & Name</th>
                          <th className="py-2.5 px-3">Exam Hall</th>
                          <th className="py-2.5 px-3 text-right">Max Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]/60">
                        {activeExam.schedules.map((s) => (
                          <tr key={s.id} className="hover:bg-[#111C35]/50 transition">
                            <td className="py-3 px-3 font-mono text-cyan-400">{s.exam_date}</td>
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {s.start_time} - {s.end_time}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-slate-200">{s.subject_code}</span>
                              <span className="text-slate-400 ml-2">{s.subject_name}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">
                                {s.room_no}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                              {s.max_marks} pts
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-12">No examination sessions configured.</p>
        )}
      </div>

      {/* New Exam Modal */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400" /> Create Examination Session
              </h3>
              <button onClick={() => setShowExamModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={examForm.academic_year}
                    onChange={(e) => setExamForm({ ...examForm, academic_year: e.target.value })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={examForm.semester_number}
                    onChange={(e) => setExamForm({ ...examForm, semester_number: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={examForm.start_date}
                    onChange={(e) => setExamForm({ ...examForm, start_date: e.target.value })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={examForm.end_date}
                    onChange={(e) => setExamForm({ ...examForm, end_date: e.target.value })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Standard Examination Fee (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={examForm.exam_fee}
                  onChange={(e) => setExamForm({ ...examForm, exam_fee: parseFloat(e.target.value) || 1500.0 })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1E293B]">
                <Button type="button" onClick={() => setShowExamModal(false)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Session
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Slot Modal with Real-time Conflict Detection */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400" /> Add Timetable Slot
              </h3>
              <button onClick={() => setShowSlotModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                <select
                  value={slotForm.subject_id}
                  onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })}
                  className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name} (Sem {s.semester_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={slotForm.exam_date}
                    onChange={(e) => setSlotForm({ ...slotForm, exam_date: e.target.value })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Room / Venue</label>
                  <input
                    type="text"
                    required
                    value={slotForm.room_no}
                    onChange={(e) => setSlotForm({ ...slotForm, room_no: e.target.value })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM"
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    placeholder="01:00 PM"
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    className="w-full bg-[#111C35] border border-[#1E2E4F] rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Conflict Detection Trigger & Display */}
              <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Venue & Timetable Collision Audit</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleConflictCheck}
                    disabled={checkingConflict}
                    className="text-[11px] py-1 px-2.5"
                  >
                    {checkingConflict ? 'Auditing...' : 'Check Venue Conflicts'}
                  </Button>
                </div>

                {conflictChecked && (
                  <div>
                    {conflictWarning.length > 0 ? (
                      <div className="p-2 rounded bg-rose-950/40 border border-rose-800 text-[11px] text-rose-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Scheduling Conflict Detected:</p>
                          <ul className="list-disc list-inside">
                            {conflictWarning.map((c, idx) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800 text-[11px] text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Venue and subject slot verified. No collisions found!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1E293B]">
                <Button type="button" onClick={() => setShowSlotModal(false)} variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Exam Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
export default AdminExamTimetablePage;
