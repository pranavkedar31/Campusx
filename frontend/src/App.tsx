import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { AcademicManagementPage } from './pages/AcademicManagementPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { FacultyPage } from './pages/FacultyPage';
import { AttendancePage } from './pages/AttendancePage';
import { PerformancePage } from './pages/PerformancePage';
import { NoticesPage } from './pages/NoticesPage';
import { NoticeDetailPage } from './pages/NoticeDetailPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { StudentApplicationsPage } from './pages/StudentApplicationsPage';
import { AdminApplicationsPage } from './pages/AdminApplicationsPage';
import { AdminStudentsPage } from './pages/AdminStudentsPage';
import { AdminExamTimetablePage } from './pages/AdminExamTimetablePage';
import { AdminExamFormsPage } from './pages/AdminExamFormsPage';
import { AdminActivitiesPage } from './pages/AdminActivitiesPage';
import { DocumentsCenterPage } from './pages/DocumentsCenterPage';
import { AcademicProgressPage } from './pages/AcademicProgressPage';
import { CertificatesPage } from './pages/CertificatesPage';
import { VerifyCertificatePage } from './pages/VerifyCertificatePage';
import { PlacementsPage } from './pages/PlacementsPage';
import { RiskAnalysisPage } from './pages/RiskAnalysisPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { CampusAssistantPage } from './pages/CampusAssistantPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { FeesPage } from './pages/FeesPage';
import { ExaminationsPage } from './pages/ExaminationsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { LearningMaterialPage } from './pages/LearningMaterialPage';
import { TimetablePage } from './pages/TimetablePage';
import { ReportsPage } from './pages/ReportsPage';
import { StudentProfilePage } from './pages/StudentProfilePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Common Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Academic Management Routes */}
          <Route
            path="/academics"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FACULTY']}>
                <AcademicManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FACULTY', 'PLACEMENT_OFFICER', 'MANAGEMENT']}>
                <StudentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students/:id"
            element={
              <ProtectedRoute>
                <StudentDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/faculty"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FACULTY', 'MANAGEMENT']}>
                <FacultyPage />
              </ProtectedRoute>
            }
          />

          {/* Attendance & Performance Routes */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <PerformancePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/academic-progress"
            element={
              <ProtectedRoute>
                <AcademicProgressPage />
              </ProtectedRoute>
            }
          />

          {/* Notices & Events */}
          <Route
            path="/notices"
            element={
              <ProtectedRoute>
                <NoticesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notices/:id"
            element={
              <ProtectedRoute>
                <NoticeDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Student Application Center */}
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <StudentApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminApplicationsPage />
              </ProtectedRoute>
            }
          />

          {/* Certificates & Documents */}
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <CertificatesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/verify/:uuid" element={<VerifyCertificatePage />} />

          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsCenterPage />
              </ProtectedRoute>
            }
          />

          {/* Placements */}
          <Route
            path="/placements"
            element={
              <ProtectedRoute>
                <PlacementsPage />
              </ProtectedRoute>
            }
          />

          {/* ML Risk Prediction */}
          <Route
            path="/risk-analysis"
            element={
              <ProtectedRoute>
                <RiskAnalysisPage />
              </ProtectedRoute>
            }
          />

          {/* AI Assistants */}
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campus-assistant"
            element={
              <ProtectedRoute>
                <CampusAssistantPage />
              </ProtectedRoute>
            }
          />

          {/* Institutional Analytics & Audit */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          {/* ERP Core Modules */}
          <Route
            path="/fees"
            element={
              <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN', 'SUPER_ADMIN', 'MANAGEMENT']}>
                <FeesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/examinations"
            element={
              <ProtectedRoute>
                <ExaminationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/examinations/timetable"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FACULTY']}>
                <AdminExamTimetablePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/examinations/forms"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FACULTY']}>
                <AdminExamFormsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/activities"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FACULTY', 'STUDENT']}>
                <AdminActivitiesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assignments"
            element={
              <ProtectedRoute>
                <AssignmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/learning"
            element={
              <ProtectedRoute>
                <LearningMaterialPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/timetable"
            element={
              <ProtectedRoute>
                <TimetablePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'FACULTY', 'MANAGEMENT']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback & Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
