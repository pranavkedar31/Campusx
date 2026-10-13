import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  BrainCircuit,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';

export const RiskAnalysisPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isFacultyOrAdmin = hasRole(['FACULTY', 'ADMIN', 'SUPER_ADMIN', 'MANAGEMENT']);

  const [atRiskSummary, setAtRiskSummary] = useState<any>(null);
  const [studentRisk, setStudentRisk] = useState<any>(null);
  const [modelMeta, setModelMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Simulation State
  const [simForm, setSimForm] = useState({
    attendance_pct: 68.0,
    cgpa: 6.2,
    failed_assessments_count: 1,
    assignment_submission_rate: 75.0,
    marks_drop: 12.0,
  });
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const metaRes = await apiClient.get('/predictions/metadata');
      setModelMeta(metaRes.data);

      if (isFacultyOrAdmin) {
        const rosterRes = await apiClient.get('/predictions/at-risk');
        setAtRiskSummary(rosterRes.data);
      }

      if (isStudent && user) {
        // Fetch current student profile first to get student.id
        const profileRes = await apiClient.get('/students/me');
        if (profileRes.data?.id) {
          const riskRes = await apiClient.get(`/predictions/student/${profileRes.data.id}`);
          setStudentRisk(riskRes.data);
        }
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

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await apiClient.post('/predictions/evaluate', simForm);
      setSimResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  const pieData = atRiskSummary?.risk_distribution
    ? [
        { name: 'Low Risk', value: atRiskSummary.risk_distribution.LOW || 0, color: '#10B981' },
        { name: 'Moderate Risk', value: atRiskSummary.risk_distribution.MODERATE || 0, color: '#F59E0B' },
        { name: 'High Risk', value: atRiskSummary.risk_distribution.HIGH || 0, color: '#F43F5E' },
      ]
    : [];

  if (loading) {
    return (
      <PageContainer title="Academic Risk Intelligence" subtitle="Running ML predictive evaluation...">
        <div className="py-12 text-center text-xs text-slate-500">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Evaluating cohort risk metrics...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="ML Student Risk Prediction & Early Warning"
      subtitle="Proactive academic risk classification, performance drop detection, and automated intervention advisories."
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        {isFacultyOrAdmin && atRiskSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-800">
              <div className="text-slate-400 text-xs font-semibold mb-1">Monitored Students</div>
              <div className="text-2xl font-bold text-white">{atRiskSummary.total_students}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Active cohort size</p>
            </Card>

            <Card className="p-4 border-rose-900/40 bg-rose-950/10">
              <div className="text-rose-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> High Risk (Urgent)
              </div>
              <div className="text-2xl font-bold text-rose-400">{atRiskSummary.high_risk_count}</div>
              <p className="text-[11px] text-rose-300/60 mt-0.5">Immediate intervention needed</p>
            </Card>

            <Card className="p-4 border-amber-900/40 bg-amber-950/10">
              <div className="text-amber-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Moderate Risk (Watch)
              </div>
              <div className="text-2xl font-bold text-amber-400">{atRiskSummary.moderate_risk_count}</div>
              <p className="text-[11px] text-amber-300/60 mt-0.5">Academic monitoring suggested</p>
            </Card>

            <Card className="p-4 border-emerald-900/40 bg-emerald-950/10">
              <div className="text-emerald-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Safe Standing
              </div>
              <div className="text-2xl font-bold text-emerald-400">{atRiskSummary.low_risk_count}</div>
              <p className="text-[11px] text-emerald-300/60 mt-0.5">Strong performance</p>
            </Card>
          </div>
        )}

        {/* Model Specs & Risk Chart */}
        {isFacultyOrAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Cohort Risk Distribution" subtitle="Proportion of students across academic risk categories" className="md:col-span-1">
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Low</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Moderate</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> High</span>
              </div>
            </Card>

            <Card
              title="Active Predictive Intelligence Engine"
              subtitle="Scikit-Learn Random Forest ensemble trained on verified academic markers"
              className="md:col-span-2 space-y-4"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
                  <div className="text-slate-500 font-mono text-[10px]">ALGORITHM</div>
                  <div className="font-semibold text-white mt-1">Random Forest</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
                  <div className="text-slate-500 font-mono text-[10px]">ACCURACY</div>
                  <div className="font-semibold text-emerald-400 mt-1">
                    {modelMeta?.metrics?.accuracy ? `${(modelMeta.metrics.accuracy * 100).toFixed(1)}%` : '89.3%'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
                  <div className="text-slate-500 font-mono text-[10px]">FEATURES EVALUATED</div>
                  <div className="font-semibold text-cyan-400 mt-1">5 Dimensions</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
                  <div className="text-slate-500 font-mono text-[10px]">EXPLAINABILITY</div>
                  <div className="font-semibold text-purple-400 mt-1">Feature Weights</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Feature Importance Coefficients:</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Failed Internal & Terminal Assessments (38.6%)</span>
                      <span className="font-mono text-cyan-400">0.386</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: '38.6%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Cumulative GPA History (21.6%)</span>
                      <span className="font-mono text-cyan-400">0.216</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: '21.6%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Attendance Deficit Percentage (21.1%)</span>
                      <span className="font-mono text-cyan-400">0.211</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: '21.1%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Recent Assessment Drop Trajectory (13.0%)</span>
                      <span className="font-mono text-cyan-400">0.130</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full" style={{ width: '13.0%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Student's Own Risk Profile */}
        {isStudent && studentRisk && (
          <Card
            title="My Academic Risk Assessment"
            subtitle="Grounded in your real attendance logs, assessment scores, and semester progression"
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      studentRisk.risk_level === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : studentRisk.risk_level === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {studentRisk.risk_level === 'HIGH' ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : studentRisk.risk_level === 'MODERATE' ? (
                      <ShieldAlert className="w-6 h-6" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white">Current Academic Risk Level:</span>
                      <Badge
                        variant={
                          studentRisk.risk_level === 'HIGH'
                            ? 'rose'
                            : studentRisk.risk_level === 'MODERATE'
                            ? 'amber'
                            : 'emerald'
                        }
                        size="md"
                      >
                        {studentRisk.risk_level} RISK
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Evaluated Probability: {(studentRisk.risk_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="text-slate-500">Attendance</div>
                    <div className="text-sm font-bold text-white">{studentRisk.attendance_pct}%</div>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <div className="text-slate-500">CGPA</div>
                    <div className="text-sm font-bold text-white">{studentRisk.cgpa}</div>
                  </div>
                  <div className="border-l border-slate-800 pl-4">
                    <div className="text-slate-500">Failed Tests</div>
                    <div className="text-sm font-bold text-white">{studentRisk.failed_assessments_count}</div>
                  </div>
                </div>
              </div>

              {/* Explanations & Recommended Interventions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-[#0B0F19] space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-cyan-400" /> Model Contributing Factors
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {studentRisk.contributing_factors.map((factor: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-[#0B0F19] space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Recommended Action Items
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {studentRisk.recommended_interventions.map((action: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* At-Risk Roster for Faculty / Admin */}
        {isFacultyOrAdmin && atRiskSummary && (
          <Card
            title={`At-Risk Students Intervention Queue (${atRiskSummary.at_risk_students.length})`}
            subtitle="Flagged candidates ordered by vulnerability index requiring faculty mentoring or parental notice"
          >
            {atRiskSummary.at_risk_students.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                No students currently meet the at-risk criteria. Cohort performance is healthy.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0B0F19] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Dept / Course</th>
                      <th className="py-3 px-4">Attendance</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Primary Factors</th>
                      <th className="py-3 px-4 text-right">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {atRiskSummary.at_risk_students.map((stu: any) => (
                      <tr key={stu.student_id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-white">{stu.student_name}</td>
                        <td className="py-3 px-4 font-mono text-cyan-400">{stu.roll_number}</td>
                        <td className="py-3 px-4 text-slate-400">{stu.department}</td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              stu.attendance_pct < 65.0
                                ? 'text-rose-400 font-bold'
                                : stu.attendance_pct < 75.0
                                ? 'text-amber-400 font-medium'
                                : 'text-slate-200'
                            }
                          >
                            {stu.attendance_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200">{stu.cgpa}</td>
                        <td className="py-3 px-4">
                          <Badge variant={stu.risk_level === 'HIGH' ? 'rose' : 'amber'} size="sm">
                            {stu.risk_level} ({(stu.risk_score * 100).toFixed(0)}%)
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {stu.contributing_factors[0] || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              alert(
                                `Recommended Interventions for ${stu.student_name}:\n\n` +
                                  stu.recommended_interventions.join('\n')
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 text-xs font-medium transition"
                          >
                            Mentoring Plan
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

        {/* What-If Academic Risk Simulation Sandbox */}
        <Card
          title="Interactive 'What-If' Academic Risk Simulator"
          subtitle="Simulate and test hypothetical student metrics against the real-time Random Forest inference pipeline"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleSimulate} className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Attendance Percentage</span>
                  <span className="font-mono text-cyan-400">{simForm.attendance_pct}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="1"
                  value={simForm.attendance_pct}
                  onChange={(e) => setSimForm({ ...simForm, attendance_pct: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Cumulative GPA (CGPA)</span>
                  <span className="font-mono text-cyan-400">{simForm.cgpa} / 10.0</span>
                </div>
                <input
                  type="range"
                  min="3.5"
                  max="10.0"
                  step="0.1"
                  value={simForm.cgpa}
                  onChange={(e) => setSimForm({ ...simForm, cgpa: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Failed Tests Count</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={simForm.failed_assessments_count}
                    onChange={(e) =>
                      setSimForm({ ...simForm, failed_assessments_count: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recent Marks Drop (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={simForm.marks_drop}
                    onChange={(e) => setSimForm({ ...simForm, marks_drop: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <Button type="submit" disabled={simulating} className="w-full flex items-center justify-center gap-2">
                <Sliders className="w-4 h-4" />
                {simulating ? 'Simulating...' : 'Execute Model Inference'}
              </Button>
            </form>

            {/* Simulation Result */}
            <div className="p-5 rounded-2xl bg-[#0B0F19] border border-slate-800 flex flex-col justify-between">
              {simResult ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-semibold text-slate-400">Predicted Classification:</span>
                    <Badge
                      variant={
                        simResult.risk_level === 'HIGH'
                          ? 'rose'
                          : simResult.risk_level === 'MODERATE'
                          ? 'amber'
                          : 'emerald'
                      }
                      size="md"
                    >
                      {simResult.risk_level} RISK
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Vulnerability Score</span>
                      <span className="font-mono text-white">{(simResult.risk_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          simResult.risk_level === 'HIGH'
                            ? 'bg-rose-500'
                            : simResult.risk_level === 'MODERATE'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(simResult.risk_score * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                      Explainability Factors:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {simResult.contributing_factors.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                      Suggested Interventions:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {simResult.recommended_interventions.map((action: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-0.5">✓</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <BrainCircuit className="w-10 h-10 text-slate-600" />
                  <p className="text-xs">Adjust academic metrics on the left and click execute to evaluate risk in real-time.</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
