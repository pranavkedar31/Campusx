import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

interface SubjectSummary {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  score_percentage: number;
  is_weak_subject: boolean;
}

interface PerformanceAnalytics {
  student_id: string;
  cgpa: number;
  attendance_percentage: number;
  strengths: string[];
  weak_subjects: string[];
  subject_summaries: SubjectSummary[];
  needs_attention: boolean;
  recent_trend: string;
}

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<PerformanceAnalytics | null>(null);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [attentionList, setAttentionList] = useState<any[]>([]);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'FACULTY' || user?.role === 'MANAGEMENT';

  const fetchData = async () => {
    try {
      if (user?.role === 'STUDENT') {
        const meRes = await apiClient.get('/students/me');
        const stuId = meRes.data.id;
        const perfRes = await apiClient.get<PerformanceAnalytics>(`/performance/student/${stuId}`);
        setAnalytics(perfRes.data);
      } else {
        const [topRes, attRes] = await Promise.all([
          apiClient.get('/performance/top-performers'),
          apiClient.get('/performance/attention-required'),
        ]);
        setTopPerformers(topRes.data);
        setAttentionList(attRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Demo trend data for semester comparison
  const semesterTrendData = [
    { semester: 'Sem 1', cgpa: 7.8 },
    { semester: 'Sem 2', cgpa: 8.1 },
    { semester: 'Sem 3', cgpa: 8.4 },
    { semester: 'Sem 4', cgpa: analytics?.cgpa || 8.6 },
  ];

  return (
    <PageContainer
      title="Academic Performance Analytics"
      subtitle="Continuous assessment evaluation, CGPA trends, and academic intervention triggers"
    >
      {/* Student Performance View */}
      {!isStaff && analytics && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Current CGPA" subtitle="10.0 Grade Point Scale">
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white font-mono">
                  {analytics.cgpa > 0 ? analytics.cgpa.toFixed(2) : '8.60'}
                </span>
                <span className="text-xs text-slate-500">/ 10.0</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-2 font-medium">Top 15% of cohort</p>
            </Card>

            <Card title="Performance Trend" subtitle="Recent assessment delta">
              <div className="text-2xl font-bold text-white mt-1">
                {analytics.recent_trend}
              </div>
              <p className="text-[11px] text-cyan-400 mt-2">Consistent upward trajectory</p>
            </Card>

            <Card title="Strengths Identified" subtitle="Subjects scoring >= 80%">
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {analytics.strengths.length} Courses
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Core subject mastery</p>
            </Card>

            <Card title="Weak Areas" subtitle="Subjects scoring < 60%">
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {analytics.weak_subjects.length} Focus Areas
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Recommended for tutoring</p>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Semester CGPA Progression" subtitle="Historical academic trajectory">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={semesterTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="semester" stroke="#64748B" fontSize={11} />
                    <YAxis domain={[6, 10]} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cgpa"
                      stroke="#06B6D4"
                      strokeWidth={3}
                      dot={{ fill: '#06B6D4', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Curriculum Subject Mastery" subtitle="Score percentage across active courses">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.subject_summaries.length > 0 ? analytics.subject_summaries : [
                    { subject_code: 'CS401', score_percentage: 88 },
                    { subject_code: 'CS402', score_percentage: 76 },
                    { subject_code: 'CS403', score_percentage: 64 },
                    { subject_code: 'CS404', score_percentage: 92 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="subject_code" stroke="#64748B" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px' }}
                    />
                    <Bar dataKey="score_percentage" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Staff / Faculty Analytics View */}
      {isStaff && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Top Academic Performers" subtitle="Highest cumulative CGPA cohort ranking">
              <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0F172A] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Roll Number</th>
                      <th className="px-4 py-3">Dept</th>
                      <th className="px-4 py-3 text-right">CGPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B] bg-[#111827]">
                    {topPerformers.map((stu, idx) => (
                      <tr key={stu.id} className="hover:bg-[#0F172A]/50 transition">
                        <td className="px-4 py-3.5 font-mono text-cyan-400 font-bold">
                          #{idx + 1}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-white">{stu.full_name}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">{stu.roll_number}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant="blue">{stu.department}</Badge>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-extrabold text-emerald-400 text-right">
                          {stu.cgpa.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Academic Intervention List" subtitle="Students with declining marks or attendance < 75%">
              <div className="overflow-x-auto rounded-xl border border-[#1E293B]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0F172A] text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-[#1E293B]">
                    <tr>
                      <th className="px-4 py-3">Roll Number</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Indicators</th>
                      <th className="px-4 py-3 text-right">Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B] bg-[#111827]">
                    {attentionList.map((stu) => (
                      <tr key={stu.id} className="hover:bg-[#0F172A]/50 transition">
                        <td className="px-4 py-3.5 font-mono text-cyan-400 font-medium">{stu.roll_number}</td>
                        <td className="px-4 py-3.5 font-medium text-white">{stu.full_name}</td>
                        <td className="px-4 py-3.5 space-y-1">
                          {stu.reasons.map((r: string, i: number) => (
                            <span key={i} className="inline-block text-[10px] bg-rose-950/80 border border-rose-800 text-rose-300 px-2 py-0.5 rounded mr-1">
                              {r}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-amber-400">
                          Faculty Mentoring
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
