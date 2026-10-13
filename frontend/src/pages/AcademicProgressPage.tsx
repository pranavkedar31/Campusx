import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  prn?: string;
  course_name?: string;
  department_name?: string;
  current_semester?: number;
  current_cgpa?: number;
}

interface SemesterResult {
  id: string;
  semester_number: number;
  academic_year: string;
  sgpa: number;
  cgpa: number;
  total_credits: number;
  earned_credits: number;
  result_status: string;
  subjects: {
    id: string;
    subject_code: string;
    subject_name: string;
    credits: number;
    grade: string;
    grade_point: number;
    total_marks: number;
    status: string;
  }[];
}

interface ActivityItem {
  id: string;
  category: string;
  title: string;
  credits: number;
  grade: string;
}

export const AcademicProgressPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [results, setResults] = useState<SemesterResult[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAcademicData();
  }, [user]);

  const loadAcademicData = async () => {
    try {
      setLoading(true);
      const meRes = await apiClient.get<StudentProfile>('/students/me').catch(() => ({ data: null }));
      if (meRes.data) {
        setProfile(meRes.data);
        const [resList, actRes] = await Promise.all([
          apiClient.get<SemesterResult[]>(`/examinations/results/student/${meRes.data.id}`).catch(() => ({ data: [] })),
          apiClient.get<ActivityItem[]>(`/activities/student/${meRes.data.id}`).catch(() => ({ data: [] })),
        ]);
        setResults(resList.data);
        setActivities(actRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load academic progress data', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute metrics
  const totalAcademicCreditsEarned = results.reduce(
    (acc, r) => acc + (r.earned_credits || r.subjects.reduce((sAcc, s) => sAcc + (s.status === 'PASS' ? s.credits : 0), 0)),
    0
  );
  const totalExtracurricularCredits = activities.reduce((acc, a) => acc + (a.credits || 0), 0);
  const totalCreditsEarned = totalAcademicCreditsEarned + totalExtracurricularCredits;
  const targetDegreeCredits = 160;
  const progressPercent = Math.min(100, Math.round((totalCreditsEarned / targetDegreeCredits) * 100));

  // Compute Grade distribution
  const gradeCounts: Record<string, number> = { O: 0, 'A+': 0, A: 0, 'B+': 0, B: 0, C: 0, P: 0, F: 0 };
  let totalSubjectsTaken = 0;
  let activeBacklogs = 0;

  results.forEach((r) => {
    r.subjects?.forEach((s) => {
      totalSubjectsTaken++;
      if (gradeCounts[s.grade] !== undefined) {
        gradeCounts[s.grade]++;
      }
      if (s.status === 'FAIL') {
        activeBacklogs++;
      }
    });
  });

  const gradeChartData = Object.entries(gradeCounts).map(([grade, count]) => ({
    grade,
    count,
  }));

  const progressionData = results
    .sort((a, b) => a.semester_number - b.semester_number)
    .map((r) => ({
      semester: `Sem ${r.semester_number}`,
      sgpa: parseFloat(r.sgpa.toFixed(2)),
      cgpa: parseFloat(r.cgpa.toFixed(2)),
    }));

  const latestCGPA = profile?.current_cgpa || (results.length > 0 ? results[results.length - 1].cgpa : 8.5);

  if (loading) {
    return (
      <PageContainer
        title="Academic Progress & Degree Audit"
        subtitle="Comprehensive performance analytics, semester progression trajectory, credit accumulation, and degree completion status"
      >
        <div className="py-16 text-center text-slate-400 font-mono text-xs">
          Loading academic progression audit...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Academic Progress & Degree Audit"
      subtitle="Comprehensive performance analytics, semester progression trajectory, credit accumulation, and degree completion status"
    >
      <div className="space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Cumulative CGPA</p>
                <p className="text-2xl font-bold text-cyan-400">{latestCGPA.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Credits Earned</p>
                <p className="text-2xl font-bold text-white">
                  {totalCreditsEarned}{' '}
                  <span className="text-xs text-slate-400 font-normal">/ {targetDegreeCredits}</span>
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Activity Credits</p>
                <p className="text-2xl font-bold text-purple-400">{totalExtracurricularCredits}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  activeBacklogs === 0
                    ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                    : 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                }`}
              >
                {activeBacklogs === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs text-slate-400">Active Backlogs</p>
                <p className={`text-2xl font-bold ${activeBacklogs === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeBacklogs}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Degree Progress Bar */}
        <Card title="Degree Completion Status" subtitle="B.Tech Computer Science & Engineering • 4-Year Undergraduate Program">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Curriculum Credit Progress</span>
              <span className="font-mono text-cyan-400 font-bold">{progressPercent}% Completed</span>
            </div>
            <div className="w-full bg-[#0B0F19] rounded-full h-3 border border-[#1E293B] overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Semester 1 Matriculation</span>
              <span>Semester 4 (Current)</span>
              <span>Semester 8 Graduation ({targetDegreeCredits} Credits)</span>
            </div>
          </div>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: SGPA & CGPA Progression */}
          <Card title="Grade Trajectory Across Semesters" subtitle="Semester SGPA vs Cumulative CGPA trend">
            {progressionData.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">No examination trend data available.</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="semester" stroke="#64748B" fontSize={11} />
                    <YAxis domain={[0, 10]} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }}
                      labelStyle={{ color: '#F1F5F9', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="sgpa" name="Semester SGPA" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="cgpa" name="Cumulative CGPA" stroke="#06B6D4" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Chart 2: Grade Distribution */}
          <Card title="Coursework Grade Distribution" subtitle="Aggregate distribution of awarded letter grades">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="grade" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8 }}
                  />
                  <Bar dataKey="count" name="Subjects Count" fill="#06B6D4" radius={[4, 4, 0, 0]}>
                    {gradeChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.grade === 'F' ? '#EF4444' : entry.grade === 'O' ? '#10B981' : '#06B6D4'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Detailed Semester Results Breakdown */}
        <Card title="Semester-by-Semester Academic Breakdown" subtitle="Detailed subject enrollment and credit audit">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">No semester results recorded.</div>
          ) : (
            <div className="space-y-6">
              {results.map((sem) => (
                <div key={sem.id} className="p-4 rounded-xl border border-[#1E293B] bg-[#0B0F19] space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#1E293B] pb-2.5">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Semester {sem.semester_number} ({sem.academic_year})
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Credits: {sem.earned_credits || sem.total_credits} Earned • Status:{' '}
                        <span className="text-emerald-400 font-semibold">{sem.result_status}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-lg bg-[#111827] border border-[#1E293B] text-center">
                        <span className="text-[9px] uppercase font-mono text-slate-400">SGPA</span>
                        <p className="text-xs font-bold text-emerald-400">{sem.sgpa.toFixed(2)}</p>
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-[#111827] border border-[#1E293B] text-center">
                        <span className="text-[9px] uppercase font-mono text-slate-400">CGPA</span>
                        <p className="text-xs font-bold text-cyan-400">{sem.cgpa.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 font-mono uppercase text-[10px]">
                          <th className="py-1.5 px-2">Code</th>
                          <th className="py-1.5 px-2">Subject Name</th>
                          <th className="py-1.5 px-2 text-center">Credits</th>
                          <th className="py-1.5 px-2 text-center">Grade</th>
                          <th className="py-1.5 px-2 text-center">Grade Point</th>
                          <th className="py-1.5 px-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E293B]/60">
                        {sem.subjects?.map((sub) => (
                          <tr key={sub.id}>
                            <td className="py-2 px-2 font-mono text-cyan-400">{sub.subject_code}</td>
                            <td className="py-2 px-2 text-slate-200">{sub.subject_name}</td>
                            <td className="py-2 px-2 text-center font-mono text-slate-400">{sub.credits}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-emerald-400">
                              {sub.grade}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-300">{sub.grade_point}</td>
                            <td className="py-2 px-2 text-right">
                              <Badge variant={sub.status === 'PASS' ? 'emerald' : 'rose'} size="sm">
                                {sub.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default AcademicProgressPage;
