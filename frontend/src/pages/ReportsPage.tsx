import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Filter,
  RefreshCw,
  Users,
  CreditCard,
  AlertTriangle,
  GraduationCap,
  CalendarCheck,
  Briefcase,
  Layers,
  Search,
} from 'lucide-react';
import apiClient from '../services/api';
import { ReportData } from '../types';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('STUDENTS');
  const [semester, setSemester] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const reportCategories = [
    {
      id: 'STUDENTS',
      title: 'Student Census Roster',
      desc: 'All enrolled students, sections, GPA, and attendance standings',
      icon: <Users className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: 'FEE_LEDGER',
      title: 'Fee Collection Ledger',
      desc: 'Semester payment totals, collected amounts, and transaction status',
      icon: <CreditCard className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'FEE_OUTSTANDING',
      title: 'Fee Defaulters & Arrears',
      desc: 'Accounts with overdue balances and pending tuition fee installments',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'RESULTS',
      title: 'Semester Grade Sheets',
      desc: 'Cumulative marks, SGPA/CGPA calculations, and pass/fail standings',
      icon: <GraduationCap className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'ATTENDANCE_DEFICIENCY',
      title: 'Attendance Shortage (<75%)',
      desc: 'Students at risk of exam debarment due to low physical lecture attendance',
      icon: <CalendarCheck className="w-5 h-5 text-rose-400" />,
    },
    {
      id: 'ASSIGNMENTS',
      title: 'Coursework Submissions',
      desc: 'Course assignment completion logs, pending grading, and student submissions',
      icon: <Layers className="w-5 h-5 text-blue-400" />,
    },
    {
      id: 'PLACEMENTS',
      title: 'Placement Drives & Offers',
      desc: 'Candidate applications, interview statuses, and company recruitment results',
      icon: <Briefcase className="w-5 h-5 text-teal-400" />,
    },
  ];

  const handleGenerate = async (targetType?: string) => {
    const selectedType = targetType || reportType;
    try {
      setLoading(true);
      const payload: any = {
        report_type: selectedType,
      };
      if (semester) payload.semester_number = Number(semester);

      const res = await apiClient.post<ReportData>('/reports/generate', payload);
      setReportData(res.data);
    } catch (err: any) {
      console.error('Failed to generate report', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      let url = `/reports/export/csv?report_type=${reportType}`;
      if (semester) url += `&semester_number=${semester}`;

      const res = await apiClient.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `CampusX_${reportType}_Report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Failed to export CSV', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter rows by client-side search
  const filteredRows = (reportData?.rows || []).filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(term));
  });

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Reports & Analytics</h1>
              <Badge variant="cyan">ERP Reporting Engine</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Generate customizable tabular operational reports, export raw datasets to CSV, and prepare audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {reportData && (
              <>
                <Button variant="secondary" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print
                </Button>
                <Button variant="primary" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Export CSV
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Report Types Cards Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {reportCategories.map((cat) => {
            const isSelected = reportType === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setReportType(cat.id);
                  handleGenerate(cat.id);
                }}
                className={`p-4 rounded-xl text-left transition border ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-800 text-white shadow-md shadow-cyan-950/50'
                    : 'bg-[#111827]/80 border-[#1E293B] hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0B0F19] border border-[#1E293B]">
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{cat.title}</h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{cat.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <Card className="p-4 bg-[#111827]/80 border-[#1E293B]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                Parameters:
              </span>

              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>

              <Button variant="secondary" onClick={() => handleGenerate()}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Run Query
              </Button>
            </div>

            {reportData && (
              <div className="w-full md:w-64">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search results in table..."
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-cyan-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !reportData ? (
          <Card className="p-12 text-center bg-[#111827]/60 border-[#1E293B]">
            <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-300">Select a report category above</p>
            <p className="text-xs text-slate-500 mt-1">
              Click on any report card to generate live datasets with institutional parameters.
            </p>
          </Card>
        ) : (
          <Card className="p-5 bg-[#111827]/90 border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{reportData.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generated {new Date().toLocaleDateString()} • {filteredRows.length} Records displayed
                </p>
              </div>
              <Badge variant="cyan">{reportData.report_type}</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0B0F19]/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    {reportData.headers.map((h, i) => (
                      <th key={i} className="py-3 px-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.headers.length} className="py-8 text-center text-slate-500 text-xs">
                        No rows matching the filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#1E293B]/30 transition">
                        {reportData.headers.map((h, cIdx) => {
                          const val = row[h];
                          return (
                            <td key={cIdx} className="py-2.5 px-3 text-slate-300">
                              {h.toLowerCase().includes('status') ? (
                                <Badge
                                  variant={
                                    String(val) === 'PAID' || String(val) === 'PASSED' || String(val) === 'SELECTED'
                                      ? 'emerald'
                                      : String(val) === 'PARTIAL' || String(val) === 'PENDING'
                                      ? 'amber'
                                      : 'rose'
                                  }
                                >
                                  {String(val)}
                                </Badge>
                              ) : (
                                String(val ?? '—')
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};
