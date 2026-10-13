/**
 * CampusX Frontend Type Definitions & College ERP Schema
 */

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FACULTY'
  | 'STUDENT'
  | 'PLACEMENT_OFFICER'
  | 'MANAGEMENT';

export interface User {
  id: string;
  email: string;
  full_name: string;
  fullName?: string;
  role: UserRole;
  is_active: boolean;
  isActive?: boolean;
  phone?: string;
  avatarUrl?: string;
  departmentId?: string;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
}

export interface HealthStatus {
  status: string;
  environment: string;
  debug: boolean;
  deterministic_data_dir?: string;
}

// --- Fees Management Types ---
export type FeeStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
export type PaymentMode = 'ONLINE_NETBANKING' | 'UPI' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'CHALLAN' | 'DEMAND_DRAFT';

export interface FeeTransaction {
  id: string;
  student_fee_id: string;
  student_id: string;
  amount: number;
  payment_mode: PaymentMode;
  transaction_ref: string;
  transaction_date: string;
  status: string;
  remarks?: string;
  receipt_number?: string;
}

export interface StudentFee {
  id: string;
  student_id: string;
  academic_year: string;
  semester_number: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  due_date: string;
  status: FeeStatus;
  transactions?: FeeTransaction[];
}

export interface StudentFeeLedger {
  student_id: string;
  student_name: string;
  roll_number: string;
  total_fees: number;
  total_paid: number;
  total_pending: number;
  status: FeeStatus;
  next_due_date?: string;
  fees: StudentFee[];
  recent_transactions: FeeTransaction[];
}

export interface AdminFeeOverview {
  total_expected: number;
  total_collected: number;
  total_pending: number;
  total_overdue: number;
  collection_rate_pct: number;
  recent_transactions: FeeTransaction[];
}

// --- Examination Types ---
export type ExamType = 'INTERNAL' | 'MIDTERM' | 'END_SEMESTER' | 'PRACTICAL' | 'VIVA' | 'UNIVERSITY';
export type ExamStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'RESULTS_PUBLISHED';
export type ExamFormStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
export type ResultStatus = 'PASS' | 'FAIL' | 'PROMOTED' | 'WITHHELD';

export interface ExamSchedule {
  id: string;
  examination_id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_no: string;
  max_marks: number;
}

export interface Examination {
  id: string;
  name: string;
  exam_type: ExamType;
  academic_year: string;
  semester_number: number;
  start_date: string;
  end_date: string;
  status: ExamStatus;
  instructions?: string;
  schedules?: ExamSchedule[];
}

export interface ExamFormSubject {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  credits?: number;
  is_backlog: boolean;
}

export interface ExamForm {
  id: string;
  examination_id: string;
  examination_name?: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  status: ExamFormStatus;
  submission_date: string;
  verification_notes?: string;
  subjects: ExamFormSubject[];
}

export interface ExamResultSubject {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  credits?: number;
  internal_marks: number;
  external_marks: number;
  practical_marks: number;
  total_marks: number;
  max_marks: number;
  grade: string;
  grade_point: number;
  status: string;
}

export interface ExamResult {
  id: string;
  examination_id: string;
  examination_name?: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  department_name?: string;
  course_name?: string;
  semester_number: number;
  academic_year: string;
  sgpa: number;
  cgpa: number;
  total_marks_obtained: number;
  total_max_marks: number;
  percentage: number;
  result_status: ResultStatus;
  published_at: string;
  subjects: ExamResultSubject[];
}

// --- Assignment Types ---
export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type SubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'GRADED';

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  assignment_title?: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  original_filename: string;
  file_size: number;
  submitted_at: string;
  status: SubmissionStatus;
  marks_awarded?: number;
  max_marks?: number;
  feedback?: string;
  graded_at?: string;
  graded_by_name?: string;
}

export interface Assignment {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  faculty_id: string;
  faculty_name?: string;
  department_id: string;
  semester_number: number;
  section: string;
  title: string;
  description: string;
  instructions?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_path?: string;
  max_marks: number;
  publish_date: string;
  due_date: string;
  allow_late_submission: boolean;
  status: AssignmentStatus;
  submissions_count?: number;
  pending_evaluation_count?: number;
  my_submission?: AssignmentSubmission;
}

export interface FacultyAssignmentOverview {
  total_assignments: number;
  published_assignments: number;
  due_soon_count: number;
  closed_assignments: number;
  pending_evaluation_count: number;
  recent_submissions: AssignmentSubmission[];
}

// --- Study Material Types ---
export type MaterialType = 'PDF' | 'PPT' | 'NOTES' | 'LINK';

export interface StudyMaterial {
  id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  faculty_id: string;
  faculty_name?: string;
  department_id: string;
  semester_number: number;
  title: string;
  description?: string;
  file_type: MaterialType;
  file_path?: string;
  external_url?: string;
  created_at: string;
}

// --- Timetable Types ---
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface TimetableSlot {
  id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  faculty_id: string;
  faculty_name?: string;
  room_id?: string;
  room_number?: string;
  building?: string;
}

export interface DailySchedule {
  day: string;
  slots: TimetableSlot[];
  upcoming_class?: TimetableSlot;
}

export interface WeeklyTimetable {
  class_section_name?: string;
  academic_year: string;
  semester_number: number;
  schedule_by_day: Record<string, TimetableSlot[]>;
}

// --- Composite ERP Dashboard Types ---
export interface AcademicSummary {
  student_id: string;
  roll_number: string;
  enrollment_number: string;
  full_name: string;
  department_code: string;
  department_name: string;
  course_code: string;
  course_name: string;
  current_semester: number;
  academic_year: string;
  section: string;
  admission_year: number;
  cgpa: number;
  sgpa: number;
  percentage: number;
}

export interface AttendanceSubjectCard {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  total_classes: number;
  attended_classes: number;
  absent_classes: number;
  attendance_pct: number;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface AttendanceERPSummary {
  overall_percentage: number;
  present_count: number;
  absent_count: number;
  total_lectures: number;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
  subject_cards: AttendanceSubjectCard[];
  monthly_trend: Array<{ month: string; percentage: number }>;
  alerts: string[];
}

export interface FeesERPSummary {
  total_fees: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  next_due_date?: string;
}

export interface StudentERPDashboardData {
  academic_summary: AcademicSummary;
  attendance_summary: AttendanceERPSummary;
  fees_summary: FeesERPSummary;
  today_classes: Array<{
    start_time: string;
    end_time: string;
    subject_name: string;
    subject_code: string;
    faculty_name: string;
    room: string;
  }>;
  upcoming_exams: Array<{
    exam_name: string;
    subject_name: string;
    subject_code: string;
    exam_date: string;
    start_time: string;
    end_time: string;
    room_no: string;
  }>;
  pending_assignments: Array<{
    id: string;
    title: string;
    subject_code: string;
    due_date: string;
    max_marks: number;
  }>;
  recent_results: Array<{
    id: string;
    examination_name: string;
    semester_number: number;
    sgpa: number;
    cgpa: number;
    result_status: string;
  }>;
  recent_notices: Array<{
    id: string;
    title: string;
    priority: string;
    category: string;
    publish_date: string;
  }>;
  upcoming_events: Array<{
    id: string;
    title: string;
    category: string;
    venue: string;
    event_date: string;
  }>;
}

export interface FacultyERPDashboardData {
  faculty_id: string;
  faculty_name: string;
  employee_id: string;
  department_code: string;
  today_classes: Array<{
    start_time: string;
    end_time: string;
    subject_name: string;
    subject_code: string;
    room: string;
  }>;
  assigned_subjects: Array<{
    subject_id: string;
    subject_code: string;
    subject_name: string;
    section: string;
    students_count: number;
  }>;
  total_students: number;
  attendance_pending_count: number;
  assignments_pending_evaluation: number;
  at_risk_students_count: number;
  recent_submissions: Array<{
    id: string;
    student_name: string;
    roll_number: string;
    assignment_title: string;
    submitted_at: string;
    status: string;
  }>;
  upcoming_exams: Array<{
    subject_name: string;
    subject_code: string;
    exam_date: string;
    start_time: string;
    room_no: string;
  }>;
}

export interface AdminERPDashboardData {
  total_students: number;
  total_faculty: number;
  department_distribution: Record<string, number>;
  fees_collected: number;
  fees_pending: number;
  fees_overdue: number;
  collection_rate_pct: number;
  average_attendance_pct: number;
  low_attendance_students_count: number;
  upcoming_exams_count: number;
  pending_exam_forms_count: number;
  total_assignments_count: number;
  pending_evaluations_count: number;
  pending_certificates_count: number;
  active_placement_drives_count: number;
}

// --- Reports Types ---
export interface ReportData {
  report_type: string;
  title: string;
  total_records: number;
  headers: string[];
  rows: Array<Record<string, any>>;
}

export interface FeeStructure {
  id: string;
  department_id: string;
  course_id: string;
  academic_year: string;
  semester_number: number;
  total_amount: number;
}

export interface Room {
  id: string;
  room_number: string;
  building: string;
  capacity: number;
  room_type: string;
}

export interface Student {
  id: string;
  user_id: string;
  roll_number: string;
  enrollment_number: string;
  department_id?: string;
  course_id?: string;
  current_semester: number;
  section: string;
  admission_year: number;
  cgpa: number;
  attendance_pct: number;
  user?: User;
  department?: { id: string; name: string; code: string };
  course?: { id: string; name: string; code: string };
}

