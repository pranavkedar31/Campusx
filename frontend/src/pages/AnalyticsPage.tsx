import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  Building,
  Briefcase,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import apiClient from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/analytics/institutional-summary');
        setData(res.data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <PageContainer title="Executive Institutional Analytics" subtitle="Aggregating campus intelligence...">
        <div className="py-12 text-center text-xs text-slate-500">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Compiling institutional metrics...
        </div>
      </PageContainer>
    );
  }

  const kpis = data?.kpis;
  const deptMatrix = data?.department_matrix || [];
  const riskDist = data?.risk_distribution || {};

  const chartData = deptMatrix.map((d: any) => ({
    name: d.code,
    Attendance: d.avg_attendance,
    CGPA: (d.avg_cgpa * 10), // Scaled to 100 for visual comparison
    PlacementRate: d.placement_rate,
  }));

  return (
    <PageContainer
      title="Executive Institutional Analytics"
      subtitle="Chancellor and Leadership Overview: Department performance, student retention, faculty workload, and career placement index."
    >
      <div className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4 border-cyan-900/40 bg-cyan-950/10">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold mb-1">
              <GraduationCap className="w-4 h-4" /> Students
            </div>
            <div className="text-2xl font-bold text-white">{kpis?.total_students}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpis?.total_departments} Departments</p>
          </Card>

          <Card className="p-4 border-blue-900/40 bg-blue-950/10">
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-1">
              <Users className="w-4 h-4" /> Faculty Ratio
            </div>
            <div className="text-2xl font-bold text-white">{kpis?.student_faculty_ratio}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpis?.total_faculty} Faculty members</p>
          </Card>

          <Card className="p-4 border-emerald-900/40 bg-emerald-950/10">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
              <TrendingUp className="w-4 h-4" /> Mean CGPA
            </div>
            <div className="text-2xl font-bold text-emerald-400">{kpis?.average_cgpa}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Scale of 10.0</p>
          </Card>

          <Card className="p-4 border-purple-900/40 bg-purple-950/10">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold mb-1">
              <Award className="w-4 h-4" /> Attendance Avg
            </div>
            <div className="text-2xl font-bold text-purple-300">{kpis?.average_attendance}%</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Campus compliance</p>
          </Card>

          <Card className="p-4 border-amber-900/40 bg-amber-950/10">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
              <Briefcase className="w-4 h-4" /> Placement Rate
            </div>
            <div className="text-2xl font-bold text-amber-400">{kpis?.placement_rate}%</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpis?.total_placement_offers} Total Offers</p>
          </Card>

          <Card className="p-4 border-rose-900/40 bg-rose-950/10">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" /> At-Risk Cohort
            </div>
            <div className="text-2xl font-bold text-rose-400">
              {(riskDist.HIGH || 0) + (riskDist.MODERATE || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{riskDist.HIGH || 0} Critical / {riskDist.MODERATE || 0} Watch</p>
          </Card>
        </div>

        {/* Department Comparison Chart */}
        <Card
          title="Cross-Department Performance Index"
          subtitle="Comparative attendance compliance, normalized CGPA, and placement rates across faculties"
        >
          <div className="h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Attendance" fill="#06B6D4" name="Attendance (%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CGPA" fill="#10B981" name="CGPA (x10)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PlacementRate" fill="#F59E0B" name="Placement Rate (%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Detailed Department Performance Matrix */}
        <Card
          title="Institutional Department Matrix"
          subtitle="Detailed breakdown of academic standing, faculty staffing, and risk concentration"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0B0F19] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">Faculty</th>
                  <th className="py-3 px-4">Avg Attendance</th>
                  <th className="py-3 px-4">Avg CGPA</th>
                  <th className="py-3 px-4">At-Risk Count</th>
                  <th className="py-3 px-4 text-right">Placement Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {deptMatrix.map((d: any) => (
                  <tr key={d.department_id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {d.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">{d.code}</td>
                    <td className="py-3 px-4">{d.student_count}</td>
                    <td className="py-3 px-4">{d.faculty_count}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          d.avg_attendance < 75.0 ? 'text-amber-400 font-semibold' : 'text-slate-200'
                        }
                      >
                        {d.avg_attendance}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">{d.avg_cgpa}</td>
                    <td className="py-3 px-4">
                      {d.at_risk_count > 0 ? (
                        <Badge variant="rose" size="sm">
                          {d.at_risk_count} At Risk
                        </Badge>
                      ) : (
                        <Badge variant="emerald" size="sm">
                          0 At Risk
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {d.placement_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
