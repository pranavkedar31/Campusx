import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck2,
  TrendingUp,
  AlertTriangle,
  BellRing,
  FileCheck2,
  Briefcase,
  Bot,
  BarChart3,
  ScrollText,
  Sparkles,
  CreditCard,
  FileText,
  BookOpen,
  CalendarDays,
  FileSpreadsheet,
  IdCard,
  SendHorizontal,
  FolderLock,
  Layers,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

export const Sidebar: React.FC = () => {
  const { hasRole } = useAuth();

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'My Student Dossier', path: '/profile', icon: <IdCard className="w-4 h-4" />, roles: ['STUDENT'] },
    { label: 'Degree Progress', path: '/academic-progress', icon: <TrendingUp className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Document Vault', path: '/documents', icon: <FolderLock className="w-4 h-4" />, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Request Center', path: '/applications', icon: <SendHorizontal className="w-4 h-4" />, roles: ['STUDENT'] },
    { label: 'Student Applications', path: '/admin/applications', icon: <SendHorizontal className="w-4 h-4" />, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { label: 'Student Admissions & PRN', path: '/admin/students', icon: <Users className="w-4 h-4" />, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { label: 'Timetable', path: '/timetable', icon: <CalendarDays className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Assignments', path: '/assignments', icon: <FileText className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Study Materials', path: '/learning', icon: <BookOpen className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Examinations', path: '/examinations', icon: <GraduationCap className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Exam Forms Review', path: '/admin/examinations/forms', icon: <FileSpreadsheet className="w-4 h-4" />, roles: ['ADMIN', 'SUPER_ADMIN', 'FACULTY'] },
    { label: 'Exam Timetable Matrix', path: '/admin/examinations/timetable', icon: <CalendarDays className="w-4 h-4" />, roles: ['ADMIN', 'SUPER_ADMIN', 'FACULTY'] },
    { label: 'Grading & Activities', path: '/activities', icon: <Award className="w-4 h-4" />, roles: ['ADMIN', 'SUPER_ADMIN', 'FACULTY', 'STUDENT'] },
    { label: 'Fees & Ledger', path: '/fees', icon: <CreditCard className="w-4 h-4" />, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'MANAGEMENT'] },
    { label: 'Academic Mgmt', path: '/academics', icon: <Layers className="w-4 h-4" />, roles: ['SUPER_ADMIN', 'ADMIN', 'FACULTY'] },
    { label: 'Attendance', path: '/attendance', icon: <CalendarCheck2 className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Performance', path: '/performance', icon: <TrendingUp className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'ERP Reports', path: '/reports', icon: <FileSpreadsheet className="w-4 h-4" />, roles: ['SUPER_ADMIN', 'ADMIN', 'FACULTY', 'MANAGEMENT'] },
    { label: 'Risk Analysis', path: '/risk-analysis', icon: <AlertTriangle className="w-4 h-4" />, roles: ['FACULTY', 'ADMIN', 'SUPER_ADMIN', 'STUDENT'] },
    { label: 'Certificates', path: '/certificates', icon: <FileCheck2 className="w-4 h-4" />, roles: ['STUDENT', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'Placements', path: '/placements', icon: <Briefcase className="w-4 h-4" />, roles: ['STUDENT', 'PLACEMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'AI Assistant', path: '/ai-assistant', icon: <Bot className="w-4 h-4" />, roles: ['STUDENT', 'FACULTY', 'SUPER_ADMIN'] },
    { label: 'Campus RAG', path: '/campus-assistant', icon: <Sparkles className="w-4 h-4" /> },
    { label: 'Notices & Events', path: '/notices', icon: <BellRing className="w-4 h-4" /> },
    { label: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-4 h-4" />, roles: ['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN'] },
    { label: 'User Directory', path: '/users', icon: <Users className="w-4 h-4" />, roles: ['ADMIN', 'SUPER_ADMIN'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: <ScrollText className="w-4 h-4" />, roles: ['ADMIN', 'SUPER_ADMIN'] },
  ];

  const visibleItems = navItems.filter((item) => !item.roles || hasRole(item.roles));

  return (
    <aside className="w-64 border-r border-[#1E293B] bg-[#0B0F19] flex flex-col py-6 px-4 space-y-6 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Navigation
        </p>
        <nav className="space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-cyan-950/70 border border-cyan-800 text-cyan-300 shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
