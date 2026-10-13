import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import {
  Award,
  Sparkles,
  Sliders,
  Calculator,
  Plus,
  CheckCircle,
  AlertCircle,
  X,
  User,
} from 'lucide-react';
import apiClient from '../services/api';

interface GradeRule {
  id: string;
  grade: string;
  grade_point: number;
  min_marks: number;
  max_marks: number;
  description?: string;
  is_passing: boolean;
}

interface AcademicConfig {
  id: string;
  institution_name: string;
  grading_system: string;
  passing_percentage: number;
  grade_point_scale: number;
  include_extracurricular_in_cgpa: boolean;
  max_extracurricular_credits: number;
}

interface StudentItem {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  prn?: string;
}

interface ActivityItem {
  id: string;
  student_id: string;
  category: string;
  title: string;
  description?: string;
  academic_year: string;
  semester_number: number;
  credits: number;
  grade?: string;
  verified_by?: string;
}

export const AdminActivitiesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'config' | 'activities' | 'recalculate'>('rules');
  const [gradeRules, setGradeRules] = useState<GradeRule[]>([]);
  const [config, setConfig] = useState<AcademicConfig | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentActivities, setStudentActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Activity Modal
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [actCategory, setActCategory] = useState('TECHNICAL_CLUB');
  const [actTitle, setActTitle] = useState('');
  const [actDescription, setActDescription] = useState('');
  const [actYear, setActYear] = useState('2025-2026');
  const [actSem, setActSem] = useState(4);
  const [actCredits, setActCredits] = useState(2);
  const [actGrade, setActGrade] = useState('A+');
  const [savingAct, setSavingAct] = useState(false);

  // Recalculate State
  const [recalcResult, setRecalcResult] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);

  // Config Form State
  const [savingConfig, setSavingConfig] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [rulesRes, configRes, studRes] = await Promise.all([
        apiClient.get<GradeRule[]>('/activities/rules'),
        apiClient.get<AcademicConfig>('/activities/config'),
        apiClient.get<StudentItem[]>('/students/'),
      ]);
      setGradeRules(rulesRes.data);
      setConfig(configRes.data);
      setStudents(studRes.data);
      if (studRes.data.length > 0) {
        setSelectedStudentId(studRes.data[0].id);
        fetchStudentActivities(studRes.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load activity & grade rules data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentActivities = async (studentId: string) => {
    try {
      const res = await apiClient.get<ActivityItem[]>(`/activities/student/${studentId}`);
      setStudentActivities(res.data);
    } catch (err: any) {
      setStudentActivities([]);
    }
  };

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    fetchStudentActivities(id);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setSavingConfig(true);
      const res = await apiClient.put<AcademicConfig>('/activities/config', config);
      setConfig(res.data);
      setMessage({ text: 'Academic Institution Config updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to update configuration.', type: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setMessage({ text: 'Please select a student.', type: 'error' });
      return;
    }

    try {
      setSavingAct(true);
      await apiClient.post('/activities/', {
        student_id: selectedStudentId,
        category: actCategory,
        title: actTitle,
        description: actDescription,
        academic_year: actYear,
        semester_number: Number(actSem),
        credits: Number(actCredits),
        grade: actGrade,
      });

      setMessage({ text: `Extracurricular activity "${actTitle}" logged successfully!`, type: 'success' });
      setIsActivityModalOpen(false);
      setActTitle('');
      setActDescription('');
      fetchStudentActivities(selectedStudentId);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to record activity.', type: 'error' });
    } finally {
      setSavingAct(false);
    }
  };

  const handleRecalculateGPA = async (studentId: string) => {
    try {
      setRecalculating(true);
      const res = await apiClient.post(`/activities/recalculate-gpa/${studentId}`);
      setRecalcResult(res.data);
      setMessage({
        text: `GPA recalculated dynamically using official Grade Rules! New CGPA: ${res.data.cgpa.toFixed(2)}`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || 'Failed to recalculate GPA.', type: 'error' });
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <PageContainer
        title="Institutional Grading Rules & Extracurricular Activities"
        subtitle="UGC/AICTE Grade Point Scale, Co-curricular credit recognition, and dynamic GPA calculation engine"
      >
        <div className="py-16 text-center text-slate-400 font-mono text-xs">
          Loading institutional grading rules and academic configuration...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Institutional Grading Rules & Extracurricular Activities"
      subtitle="UGC/AICTE Grade Point Scale, Co-curricular credit recognition, and dynamic GPA calculation engine"
      action={
        activeTab === 'activities' ? (
          <Button size="sm" onClick={() => setIsActivityModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Log Activity
          </Button>
        ) : undefined
      }
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1E293B] space-x-6">
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
              activeTab === 'rules'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" /> Grade Point Scale ({gradeRules.length})
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
              activeTab === 'config'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" /> Academic Config
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
              activeTab === 'activities'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Extracurricular Credits
          </button>

          <button
            onClick={() => setActiveTab('recalculate')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
              activeTab === 'recalculate'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" /> GPA Calculation Engine
          </button>
        </div>

        {/* TAB 1: Grade Rules */}
        {activeTab === 'rules' && (
          <Card
            title="Institutional Letter Grades & Point Conversion Scale"
            subtitle="Configured standard for semester GPA (SGPA) and cumulative GPA (CGPA) evaluation"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4">Letter Grade</th>
                    <th className="py-3 px-4 text-center">Grade Point</th>
                    <th className="py-3 px-4 text-center">Percentage Range</th>
                    <th className="py-3 px-4">Qualitative Description</th>
                    <th className="py-3 px-4 text-right">Credit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {gradeRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[#111827]/40 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono text-base font-bold text-cyan-400 px-2.5 py-1 rounded-lg bg-[#0B0F19] border border-[#1E293B]">
                          {rule.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white text-sm">
                        {rule.grade_point.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {rule.min_marks}% — {rule.max_marks}%
                      </td>
                      <td className="py-3 px-4 text-slate-300">{rule.description || 'Standard academic achievement'}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={rule.is_passing ? 'emerald' : 'rose'}>
                          {rule.is_passing ? 'PASS' : 'FAIL / BACKLOG'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 2: Academic Config */}
        {activeTab === 'config' && config && (
          <Card title="Institutional Academic & Grading Policy" subtitle="Global parameters governing evaluation">
            <form onSubmit={handleSaveConfig} className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Institution Name"
                  value={config.institution_name}
                  onChange={(e) => setConfig({ ...config, institution_name: e.target.value })}
                  required
                />
                <Input
                  label="Grading System Scheme"
                  value={config.grading_system}
                  onChange={(e) => setConfig({ ...config, grading_system: e.target.value })}
                  required
                />
                <Input
                  label="Minimum Passing Percentage (%)"
                  type="number"
                  value={config.passing_percentage}
                  onChange={(e) => setConfig({ ...config, passing_percentage: parseFloat(e.target.value) })}
                  required
                />
                <Input
                  label="Grade Point Scale (e.g. 10.0)"
                  type="number"
                  step="0.1"
                  value={config.grade_point_scale}
                  onChange={(e) => setConfig({ ...config, grade_point_scale: parseFloat(e.target.value) })}
                  required
                />
                <Input
                  label="Max Extracurricular Credits Recognized"
                  type="number"
                  value={config.max_extracurricular_credits}
                  onChange={(e) => setConfig({ ...config, max_extracurricular_credits: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-2">
                <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={config.include_extracurricular_in_cgpa}
                    onChange={(e) => setConfig({ ...config, include_extracurricular_in_cgpa: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Factor Verified Extracurricular Activity Credits into Student Cumulative CGPA</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-7">
                  When enabled, approved co-curricular, hackathon, and sports credits count towards final degree classification.
                </p>
              </div>

              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? 'Saving Settings...' : 'Save Academic Policy'}
              </Button>
            </form>
          </Card>
        )}

        {/* TAB 3: Extracurricular Activities */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-[#111827]/60 p-4 rounded-xl border border-[#1E293B]">
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">Select Student Candidate:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.roll_number}) {s.prn ? `• PRN: ${s.prn}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Card
              title="Verified Co-Curricular & Extracurricular Portfolio"
              subtitle={`Recorded achievements for candidate (${studentActivities.length} logged)`}
            >
              {studentActivities.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No extracurricular activities recorded for this candidate yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-slate-400 font-mono uppercase text-[10px]">
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Activity / Achievement</th>
                        <th className="py-2.5 px-3">Session</th>
                        <th className="py-2.5 px-3 text-center">Awarded Credits</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      {studentActivities.map((act) => (
                        <tr key={act.id} className="hover:bg-[#111827]/40 transition">
                          <td className="py-2.5 px-3">
                            <Badge variant="purple">{act.category.replace('_', ' ')}</Badge>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-white">{act.title}</span>
                            {act.description && <p className="text-[11px] text-slate-400 mt-0.5">{act.description}</p>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                            Sem {act.semester_number} ({act.academic_year})
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-400">{act.credits}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">{act.grade || 'O'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="emerald">VERIFIED</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 4: Recalculate GPA Engine */}
        {activeTab === 'recalculate' && (
          <Card
            title="Dynamic SGPA & CGPA Calculation Engine"
            subtitle="Recalculate semester and cumulative GPA dynamically from recorded subject marks and grade rules"
          >
            <div className="space-y-6 max-w-xl">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">Candidate Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.roll_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">How the calculation engine works:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Iterates across all recorded exam results for the student.</li>
                  <li>Maps each subject percentage to institutional Grade Rules (O, A+, A, B+, B, C, P, F).</li>
                  <li>Computes SGPA = Total(Credits × GradePoint) / Total(Credits) for each semester.</li>
                  <li>Updates Cumulative CGPA and persists recalculated metrics directly to student database profile.</li>
                </ul>
              </div>

              <Button
                onClick={() => handleRecalculateGPA(selectedStudentId)}
                disabled={recalculating || !selectedStudentId}
                className="w-full"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {recalculating ? 'Executing Engine Calculation...' : 'Recalculate Student GPA Now'}
              </Button>

              {recalcResult && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle className="w-4 h-4" /> Recalculation Complete
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#0B0F19] border border-[#1E293B]">
                      <span className="text-slate-400 text-[10px] uppercase font-mono">Calculated CGPA</span>
                      <p className="text-xl font-bold text-cyan-400 mt-0.5">{recalcResult.cgpa.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0B0F19] border border-[#1E293B]">
                      <span className="text-slate-400 text-[10px] uppercase font-mono">Total Semesters</span>
                      <p className="text-xl font-bold text-white mt-0.5">{recalcResult.semester_results?.length || 1}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Modal: Log Activity */}
        {isActivityModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" /> Log Extracurricular Activity
                </h3>
                <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateActivity} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={actCategory}
                    onChange={(e) => setActCategory(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="TECHNICAL_CLUB">Technical Club / Hackathon</option>
                    <option value="SPORTS">Inter-University Sports</option>
                    <option value="CULTURAL">Cultural Event / Fest</option>
                    <option value="COMMUNITY_SERVICE">NSS / Community Service</option>
                    <option value="RESEARCH_PUBLICATION">Research Publication</option>
                    <option value="LEADERSHIP">Student Council Leadership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Activity Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smart India Hackathon Finalist"
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Proof</label>
                  <textarea
                    rows={2}
                    placeholder="Details of the event or certificate reference..."
                    value={actDescription}
                    onChange={(e) => setActDescription(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Year</label>
                    <input
                      type="text"
                      value={actYear}
                      onChange={(e) => setActYear(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Semester Number</label>
                    <input
                      type="number"
                      value={actSem}
                      onChange={(e) => setActSem(parseInt(e.target.value))}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Awarded Credits</label>
                    <input
                      type="number"
                      value={actCredits}
                      onChange={(e) => setActCredits(parseInt(e.target.value))}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Equivalent Grade</label>
                    <select
                      value={actGrade}
                      onChange={(e) => setActGrade(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="O">O (Outstanding)</option>
                      <option value="A+">A+ (Excellent)</option>
                      <option value="A">A (Very Good)</option>
                      <option value="B+">B+ (Good)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1E293B]">
                  <Button type="button" variant="ghost" onClick={() => setIsActivityModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingAct}>
                    {savingAct ? 'Recording...' : 'Record Activity'}
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

export default AdminActivitiesPage;
