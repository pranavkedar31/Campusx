"""
Timetable and Class Scheduling API Endpoints.
Provides student daily/weekly timetables, faculty teaching schedules, and lecture room allocations.
"""

from typing import List, Optional, Dict
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.academic import Subject, Department, Course
from app.models.timetable import Room, ClassSection, Timetable, TimetableSlot, DayOfWeek
from app.schemas.timetable import (
    RoomResponse, ClassSectionResponse,
    TimetableSlotResponse, TimetableSlotCreate,
    DailyScheduleResponse, WeeklyTimetableResponse
)

router = APIRouter()

DAYS_MAP = {
    0: DayOfWeek.MONDAY,
    1: DayOfWeek.TUESDAY,
    2: DayOfWeek.WEDNESDAY,
    3: DayOfWeek.THURSDAY,
    4: DayOfWeek.FRIDAY,
    5: DayOfWeek.SATURDAY,
    6: DayOfWeek.MONDAY,  # Fallback for Sunday in demo view
}


@router.get("/student/today", response_model=DailyScheduleResponse, summary="Get Today's Class Schedule for Student")
def get_student_today_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve today's lecture schedule for the authenticated student."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    today_weekday = datetime.today().weekday()
    target_day = DAYS_MAP.get(today_weekday, DayOfWeek.MONDAY)

    # Find timetable for student's class section
    cs = db.query(ClassSection).filter(
        ClassSection.department_id == student.department_id,
        ClassSection.semester_number == student.current_semester,
        ClassSection.section_name == student.section
    ).first()

    slots = []
    if cs:
        tt = db.query(Timetable).filter(Timetable.class_section_id == cs.id, Timetable.is_active == True).first()
        if tt:
            raw_slots = db.query(TimetableSlot).filter(
                TimetableSlot.timetable_id == tt.id,
                TimetableSlot.day_of_week == target_day
            ).order_by(TimetableSlot.start_time).all()
            slots = [_build_slot_response(s) for s in raw_slots]

    # Find upcoming class
    now_str = datetime.now().strftime("%H:%M")
    upcoming = next((s for s in slots if s.start_time >= now_str), slots[0] if slots else None)

    return DailyScheduleResponse(
        day=target_day.value,
        slots=slots,
        upcoming_class=upcoming
    )


@router.get("/student/weekly", response_model=WeeklyTimetableResponse, summary="Get Weekly Timetable for Student")
def get_student_weekly_timetable(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full weekly class schedule for the student's enrolled section."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    cs = db.query(ClassSection).filter(
        ClassSection.department_id == student.department_id,
        ClassSection.semester_number == student.current_semester,
        ClassSection.section_name == student.section
    ).first()

    schedule_by_day = {day.value: [] for day in DayOfWeek}
    if cs:
        tt = db.query(Timetable).filter(Timetable.class_section_id == cs.id, Timetable.is_active == True).first()
        if tt:
            all_slots = db.query(TimetableSlot).filter(TimetableSlot.timetable_id == tt.id).order_by(TimetableSlot.start_time).all()
            for s in all_slots:
                schedule_by_day[s.day_of_week.value].append(_build_slot_response(s))

    return WeeklyTimetableResponse(
        class_section_name=f"{student.department.code if student.department else 'CSE'}-{student.section} (Sem {student.current_semester})",
        academic_year="2025-2026",
        semester_number=student.current_semester,
        schedule_by_day=schedule_by_day
    )


@router.get("/faculty/today", response_model=DailyScheduleResponse, summary="Get Today's Teaching Schedule for Faculty")
def get_faculty_today_schedule(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Retrieve today's lecture schedule for the authenticated faculty member."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    today_weekday = datetime.today().weekday()
    target_day = DAYS_MAP.get(today_weekday, DayOfWeek.MONDAY)

    slots = []
    if faculty_id:
        raw_slots = db.query(TimetableSlot).filter(
            TimetableSlot.faculty_id == faculty_id,
            TimetableSlot.day_of_week == target_day
        ).order_by(TimetableSlot.start_time).all()
        slots = [_build_slot_response(s) for s in raw_slots]

    now_str = datetime.now().strftime("%H:%M")
    upcoming = next((s for s in slots if s.start_time >= now_str), slots[0] if slots else None)

    return DailyScheduleResponse(
        day=target_day.value,
        slots=slots,
        upcoming_class=upcoming
    )


@router.get("/faculty/weekly", response_model=WeeklyTimetableResponse, summary="Get Weekly Teaching Timetable for Faculty")
def get_faculty_weekly_timetable(
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Retrieve weekly teaching schedule across all assigned courses for faculty."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None

    schedule_by_day = {day.value: [] for day in DayOfWeek}
    if faculty_id:
        all_slots = db.query(TimetableSlot).filter(TimetableSlot.faculty_id == faculty_id).order_by(TimetableSlot.start_time).all()
        for s in all_slots:
            schedule_by_day[s.day_of_week.value].append(_build_slot_response(s))

    return WeeklyTimetableResponse(
        class_section_name=f"Prof. {current_user.full_name} Weekly Schedule",
        academic_year="2025-2026",
        semester_number=4,
        schedule_by_day=schedule_by_day
    )


@router.get("/rooms", response_model=List[RoomResponse], summary="List Campus Rooms")
def list_rooms(db: Session = Depends(get_db)):
    """List lecture halls and laboratories."""
    rooms = db.query(Room).all()
    return rooms


def _build_slot_response(s: TimetableSlot) -> TimetableSlotResponse:
    return TimetableSlotResponse(
        id=s.id,
        day_of_week=s.day_of_week,
        start_time=s.start_time,
        end_time=s.end_time,
        subject_id=s.subject_id,
        subject_name=s.subject.name if s.subject else "Subject",
        subject_code=s.subject.code if s.subject else "SUB",
        faculty_id=s.faculty_id,
        faculty_name=s.faculty.user.full_name if s.faculty and s.faculty.user else "Faculty",
        room_id=s.room_id,
        room_number=s.room.room_number if s.room else "LH-101",
        building=s.room.building if s.room else "Main Block"
    )
