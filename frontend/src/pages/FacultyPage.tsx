import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import apiClient from '../services/api';
import { Search } from 'lucide-react';

interface Faculty {
  id: string;
  employee_id: string;
  department_id: string;
  designation: string;
  specialization?: string;
  user?: {
    full_name: string;
    email: string;
  };
  department?: {
    name: string;
    code: string;
  };
  subject_assignments?: Array<{
    id: string;
    academic_year: string;
    section: string;
    subject?: {
      code: string;
      name: string;
    };
  }>;
}

export const FacultyPage: React.FC = () => {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchFaculty = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await apiClient.get<Faculty[]>('/faculty/', { params });
      setFacultyList(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  return (
    <PageContainer
      title="Faculty Directory & Subject Assignments"
      subtitle="Academic educators, departmental designations, and teaching workloads"
      action={
        <div className="flex items-center gap-2">
          <Badge variant="blue" size="md">
            {facultyList.length} Faculty Members
          </Badge>
        </div>
      }
    >
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search faculty by name, employee ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={fetchFaculty} className="flex items-center gap-1.5">
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs">
              Loading faculty directory...
            </div>
          ) : facultyList.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500">
              No faculty members found matching search query.
            </div>
          ) : (
            facultyList.map((f) => (
              <Card key={f.id} className="hover:border-slate-700 transition space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 flex items-center justify-center font-bold text-sm">
                      {f.user?.full_name?.charAt(0) || 'F'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{f.user?.full_name || 'Faculty Member'}</h4>
                      <p className="text-[11px] font-mono text-slate-400">{f.employee_id}</p>
                    </div>
                  </div>
                  <Badge variant="cyan">{f.department?.code || 'CSE'}</Badge>
                </div>

                <div className="space-y-1.5 text-xs border-t border-[#1E293B] pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Designation</span>
                    <span className="font-medium text-slate-200">{f.designation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email</span>
                    <span className="font-mono text-slate-300">{f.user?.email}</span>
                  </div>
                  {f.specialization && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Specialization</span>
                      <span className="text-cyan-400">{f.specialization}</span>
                    </div>
                  )}
                </div>

                {f.subject_assignments && f.subject_assignments.length > 0 && (
                  <div className="border-t border-[#1E293B] pt-3">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2">
                      Assigned Curriculum
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.subject_assignments.map((asgn) => (
                        <span
                          key={asgn.id}
                          className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono"
                        >
                          {asgn.subject?.code || 'SUB'} (Sec {asgn.section})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </Card>
    </PageContainer>
  );
};
