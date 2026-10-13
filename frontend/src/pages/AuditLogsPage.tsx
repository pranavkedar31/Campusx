import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import apiClient from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;
      if (emailSearch) params.user_email = emailSearch;

      const [logsRes, summaryRes] = await Promise.all([
        apiClient.get('/audit/logs', { params }),
        apiClient.get('/audit/summary'),
      ]);
      setLogs(logsRes.data);
      setSummary(summaryRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('APPROVED')) return 'emerald';
    if (action.includes('FAILURE') || action.includes('BLOCKED') || action.includes('REJECTED')) return 'rose';
    if (action.includes('UPDATE') || action.includes('MODIFY')) return 'amber';
    return 'blue';
  };

  return (
    <PageContainer
      title="Security & Compliance Audit Trail"
      subtitle="Immutable cryptographic ledger tracking user authentications, administrative actions, and state modifications."
    >
      <div className="space-y-6">
        {/* Security Metrics Header */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-slate-800">
              <div className="text-slate-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <ScrollText className="w-4 h-4 text-cyan-400" /> Total Log Entries
              </div>
              <div className="text-2xl font-bold text-white">{summary.total_logs}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Persisted audit events</p>
            </Card>

            <Card className="p-4 border-emerald-900/40 bg-emerald-950/10">
              <div className="text-emerald-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Successful Logins
              </div>
              <div className="text-2xl font-bold text-emerald-400">{summary.successful_logins_count}</div>
              <p className="text-[11px] text-emerald-300/60 mt-0.5">Authorized access events</p>
            </Card>

            <Card className="p-4 border-rose-900/40 bg-rose-950/10">
              <div className="text-rose-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Failed / Blocked Logins
              </div>
              <div className="text-2xl font-bold text-rose-400">{summary.failed_logins_count}</div>
              <p className="text-[11px] text-rose-300/60 mt-0.5">Potential unauthorized attempts</p>
            </Card>

            <Card className="p-4 border-cyan-900/40 bg-cyan-950/10">
              <div className="text-cyan-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Lock className="w-4 h-4" /> Action Categories
              </div>
              <div className="text-2xl font-bold text-cyan-300">
                {Object.keys(summary.action_breakdown || {}).length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Distinct event types tracked</p>
            </Card>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0B0F19] border border-slate-800">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#111827] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Actions</option>
                <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
                <option value="AUTH_LOGIN_FAILURE">Login Failure</option>
                <option value="AUTH_LOGIN_BLOCKED">Login Blocked</option>
                <option value="CERTIFICATE_APPROVED">Certificate Approved</option>
                <option value="CERTIFICATE_REJECTED">Certificate Rejected</option>
              </select>
            </div>

            <div>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#111827] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Entity Types</option>
                <option value="AUTH">Authentication</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="STUDENT">Student</option>
                <option value="USER">User Account</option>
                <option value="MARK">Performance Mark</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user email..."
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadLogs();
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-[#111827] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={loadLogs} className="p-2">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Ledger Table */}
        <Card
          title={`Audit Log Trail (${logs.length} entries)`}
          subtitle="Real-time chronological recording of all campus platform actions"
        >
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              Loading security audit ledger...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No audit log entries found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0B0F19] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">User / Actor</th>
                    <th className="py-3 px-4">Entity Type</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {log.user_email || 'System / Anonymous'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-cyan-400">{log.entity_type}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {log.entity_id ? log.entity_id.slice(0, 12) + '...' : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.details ? (
                            <button
                              onClick={() =>
                                setExpandedLogId(expandedLogId === log.id ? null : log.id)
                              }
                              className="text-cyan-400 hover:underline flex items-center gap-1 ml-auto text-[11px] font-mono"
                            >
                              <span>{expandedLogId === log.id ? 'Hide' : 'Inspect'}</span>
                              {expandedLogId === log.id ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                      {expandedLogId === log.id && log.details && (
                        <tr className="bg-[#0B0F19]/80">
                          <td colSpan={6} className="p-4">
                            <div className="p-3 rounded-xl bg-[#090D16] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                              <pre>{log.details}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
