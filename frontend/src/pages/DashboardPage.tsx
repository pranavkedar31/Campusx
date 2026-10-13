import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '../components/layout/PageContainer';
import { StudentERPDashboard } from '../components/dashboard/StudentERPDashboard';
import { FacultyERPDashboard } from '../components/dashboard/FacultyERPDashboard';
import { AdminERPDashboard } from '../components/dashboard/AdminERPDashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const renderDashboardByRole = () => {
    switch (user?.role) {
      case 'STUDENT':
        return <StudentERPDashboard />;
      case 'FACULTY':
        return <FacultyERPDashboard />;
      case 'ADMIN':
      case 'SUPER_ADMIN':
      case 'MANAGEMENT':
      case 'PLACEMENT_OFFICER':
      default:
        return <AdminERPDashboard />;
    }
  };

  return (
    <PageContainer
      title={`Welcome back, ${user?.full_name || 'User'}`}
      subtitle={`Authenticated as ${user?.role} • CampusX Smart College ERP & Student Intelligence Platform`}
      action={
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border border-[#1E293B] bg-[#111827]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400">ERP Session:</span>
          <span className="text-emerald-400 font-semibold">{user?.role} Active</span>
        </div>
      }
    >
      {renderDashboardByRole()}
    </PageContainer>
  );
};

export default DashboardPage;
