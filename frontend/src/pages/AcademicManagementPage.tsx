import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import apiClient from '../services/api';
import {
  GraduationCap,
  BookOpen,
  Layers,
  Plus,
  Calendar,
  X,
  BookCheck,
} from 'lucide-react';

interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  department_id: string;
  department?: Department;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  course_id: string;
  semester_number: number;
  short_name?: string;
  subject_type?: string;
  lecture_hours?: number;
  practical_hours?: number;
  tutorial_hours?: number;
}

interface SyllabusData {
  id: string;
  subject_id: string;
  unit_1_title?: string;
  unit_1_content?: string;
  unit_2_title?: string;
  unit_2_content?: string;
  unit_3_title?: string;
  unit_3_content?: string;
  unit_4_title?: string;
  unit_4_content?: string;
  unit_5_title?: string;
  unit_5_content?: string;
  course_outcomes?: string;
  reference_books?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  description?: string;
  semester_number?: number;
  academic_year?: string;
}

export const AcademicManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'departments' | 'courses' | 'subjects' | 'calendar'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Forms
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [showDeptForm, setShowDeptForm] = useState(false);

  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCredits, setCourseCredits] = useState(4);
  const [courseDeptId, setCourseDeptId] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);

  // Calendar Event Form
  const [calTitle, setCalTitle] = useState('');
  const [calType, setCalType] = useState('ACADEMIC');
  const [calStartDate, setCalStartDate] = useState('');
  const [calEndDate, setCalEndDate] = useState('');
  const [calDesc, setCalDesc] = useState('');
  const [showCalForm, setShowCalForm] = useState(false);

  // Syllabus Modal state
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [syllabusModalOpen, setSyllabusModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [deptRes, courseRes, subRes, calRes] = await Promise.all([
        apiClient.get<Department[]>('/academics/departments'),
        apiClient.get<Course[]>('/academics/courses'),
        apiClient.get<Subject[]>('/academics/subjects'),
        apiClient.get<CalendarEvent[]>('/academics/academic-calendar').catch(() => ({ data: [] })),
      ]);
      setDepartments(deptRes.data);
      setCourses(courseRes.data);
      setSubjects(subRes.data);
      setCalendarEvents(calRes.data);
      if (deptRes.data.length > 0 && !courseDeptId) {
        setCourseDeptId(deptRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode || !deptName) return;
    try {
      await apiClient.post('/academics/departments', {
        code: deptCode,
        name: deptName,
        description: deptDesc,
      });
      setDeptCode('');
      setDeptName('');
      setDeptDesc('');
      setShowDeptForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create department.');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseName || !courseDeptId) return;
    try {
      await apiClient.post('/academics/courses', {
        code: courseCode,
        name: courseName,
        credits: courseCredits,
        department_id: courseDeptId,
      });
      setCourseCode('');
      setCourseName('');
      setShowCourseForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create course.');
    }
  };

  const handleCreateCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calTitle || !calStartDate || !calEndDate) return;
    try {
      await apiClient.post('/academics/academic-calendar', {
        title: calTitle,
        event_type: calType,
        start_date: calStartDate,
        end_date: calEndDate,
        description: calDesc,
        academic_year: '2025-2026',
        semester_number: 4,
      });
      setCalTitle('');
      setCalDesc('');
      setShowCalForm(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create calendar event.');
    }
  };

  const handleOpenSyllabus = async (subject: Subject) => {
    setSelectedSubject(subject);
    setSyllabusModalOpen(true);
    setLoadingSyllabus(true);
    try {
      const res = await apiClient.get<SyllabusData>(`/academics/subjects/${subject.id}/syllabus`);
      setSyllabusData(res.data);
    } catch (err) {
      setSyllabusData(null);
    } finally {
      setLoadingSyllabus(false);
    }
  };

  return (
    <PageContainer
      title="Academic Hierarchy & Curriculum Management"
      subtitle="Organize institutional faculties, departments, degree programs, curriculum subjects, syllabus units, and academic calendar"
      action={
        <div className="flex gap-2">
          {activeTab === 'departments' && (
            <Button size="sm" onClick={() => setShowDeptForm(!showDeptForm)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Department
            </Button>
          )}
          {activeTab === 'courses' && (
            <Button size="sm" onClick={() => setShowCourseForm(!showCourseForm)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Course
            </Button>
          )}
          {activeTab === 'calendar' && (
            <Button size="sm" onClick={() => setShowCalForm(!showCalForm)} className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Event
            </Button>
          )}
        </div>
      }
    >
      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1E293B] space-x-6">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
            activeTab === 'departments'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Departments ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
            activeTab === 'courses'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Degree Programs ({courses.length})
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
            activeTab === 'subjects'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Curriculum Subjects ({subjects.length})
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-2 border-b-2 ${
            activeTab === 'calendar'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Academic Calendar ({calendarEvents.length})
        </button>
      </div>

      {/* Department Add Form */}
      {showDeptForm && (
        <Card title="Register New Department" subtitle="Create an institutional department">
          <form onSubmit={handleCreateDepartment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Code" placeholder="CSE" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} required />
            <Input label="Department Name" placeholder="Computer Science & Engineering" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
            <Input label="Description" placeholder="Core Computing & AI" value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} />
            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowDeptForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Department
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Course Add Form */}
      {showCourseForm && (
        <Card title="Add Degree Program" subtitle="Attach degree course to a department">
          <form onSubmit={handleCreateCourse} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input label="Course Code" placeholder="BTECH-CSE" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} required />
            <Input label="Course Name" placeholder="B.Tech Computer Science" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
            <Input label="Total Credits" type="number" value={courseCredits} onChange={(e) => setCourseCredits(Number(e.target.value))} required />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Department</label>
              <select
                value={courseDeptId}
                onChange={(e) => setCourseDeptId(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCourseForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Course
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Calendar Add Form */}
      {showCalForm && (
        <Card title="Publish Academic Calendar Milestone" subtitle="Record institutional key dates">
          <form onSubmit={handleCreateCalendarEvent} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Event Title" placeholder="Mid-Semester Examinations" value={calTitle} onChange={(e) => setCalTitle(e.target.value)} required />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Event Classification</label>
              <select
                value={calType}
                onChange={(e) => setCalType(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3.5 py-2 text-xs text-slate-200"
              >
                <option value="EXAMINATION">EXAMINATION</option>
                <option value="HOLIDAY">HOLIDAY</option>
                <option value="ACADEMIC">ACADEMIC MILESTONE</option>
                <option value="WORKSHOP">WORKSHOP / SEMINAR</option>
                <option value="FEST">CULTURAL / TECH FEST</option>
                <option value="REGISTRATION">REGISTRATION DEADLINE</option>
              </select>
            </div>
            <Input label="Start Date" type="date" value={calStartDate} onChange={(e) => setCalStartDate(e.target.value)} required />
            <Input label="End Date" type="date" value={calEndDate} onChange={(e) => setCalEndDate(e.target.value)} required />
            <div className="md:col-span-2">
              <Input label="Description / Location" placeholder="Auditorium & Examination Halls" value={calDesc} onChange={(e) => setCalDesc(e.target.value)} />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCalForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Publish Event
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab Panels */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Card key={dept.id} className="hover:border-slate-700 transition">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="cyan">{dept.code}</Badge>
                  <h3 className="text-base font-bold text-white mt-2">{dept.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{dept.description || 'Active department'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <Card key={course.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="blue">{course.code}</Badge>
                    <span className="text-xs text-slate-400 font-mono">{course.credits} Credits</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-2">{course.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Department: {course.department?.name || 'Assigned'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subjects.map((sub) => (
            <Card key={sub.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant="emerald">{sub.code}</Badge>
                  <span className="text-xs text-slate-400 font-mono">Sem {sub.semester_number}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mt-2">{sub.name}</h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <span>{sub.credits} Credits</span>
                  {sub.lecture_hours !== undefined && (
                    <span>• L-T-P: {sub.lecture_hours}-{sub.tutorial_hours || 0}-{sub.practical_hours || 0}</span>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-[#1E293B] flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => handleOpenSyllabus(sub)}>
                  <BookCheck className="w-3.5 h-3.5 mr-1" /> View Syllabus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'calendar' && (
        <Card title="Institutional Academic Calendar" subtitle="Key academic milestones, exam cycles, and schedules">
          {calendarEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No academic calendar events published.</div>
          ) : (
            <div className="divide-y divide-[#1E293B]">
              {calendarEvents.map((evt) => (
                <div key={evt.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          evt.event_type === 'EXAMINATION'
                            ? 'rose'
                            : evt.event_type === 'HOLIDAY'
                            ? 'amber'
                            : evt.event_type === 'WORKSHOP'
                            ? 'purple'
                            : 'cyan'
                        }
                      >
                        {evt.event_type}
                      </Badge>
                      <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                    </div>
                    {evt.description && <p className="text-slate-400 text-[11px]">{evt.description}</p>}
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-cyan-400 font-medium">
                      {new Date(evt.start_date).toLocaleDateString()}
                    </span>
                    {evt.end_date && evt.end_date !== evt.start_date && (
                      <span className="text-slate-400"> to {new Date(evt.end_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Syllabus Modal */}
      {syllabusModalOpen && selectedSubject && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedSubject.code}: {selectedSubject.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Semester {selectedSubject.semester_number} • {selectedSubject.credits} Credits
                  </p>
                </div>
              </div>
              <button onClick={() => setSyllabusModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingSyllabus ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">Loading course syllabus...</div>
            ) : syllabusData ? (
              <div className="space-y-4 text-xs">
                {/* 5 Units */}
                <div className="space-y-3">
                  <h4 className="font-mono text-[11px] uppercase tracking-wider text-cyan-400 font-bold">
                    Course Curriculum Units
                  </h4>

                  {[
                    { num: 1, title: syllabusData.unit_1_title, content: syllabusData.unit_1_content },
                    { num: 2, title: syllabusData.unit_2_title, content: syllabusData.unit_2_content },
                    { num: 3, title: syllabusData.unit_3_title, content: syllabusData.unit_3_content },
                    { num: 4, title: syllabusData.unit_4_title, content: syllabusData.unit_4_content },
                    { num: 5, title: syllabusData.unit_5_title, content: syllabusData.unit_5_content },
                  ].map((u) => (
                    <div key={u.num} className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-1">
                      <span className="font-semibold text-white">
                        Unit {u.num}: {u.title || 'Curriculum Module'}
                      </span>
                      <p className="text-slate-400 leading-relaxed text-[11px]">{u.content || 'Unit syllabus contents.'}</p>
                    </div>
                  ))}
                </div>

                {/* Course Outcomes */}
                {syllabusData.course_outcomes && (
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-1">
                    <span className="font-semibold text-emerald-400 font-mono text-[11px] uppercase">Course Outcomes</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{syllabusData.course_outcomes}</p>
                  </div>
                )}

                {/* Reference Textbooks */}
                {syllabusData.reference_books && (
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-1">
                    <span className="font-semibold text-purple-400 font-mono text-[11px] uppercase">
                      Prescribed Reference Textbooks
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed font-mono">{syllabusData.reference_books}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Detailed syllabus not yet uploaded for this course.
              </div>
            )}

            <div className="pt-2 border-t border-[#1E293B] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSyllabusModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default AcademicManagementPage;
