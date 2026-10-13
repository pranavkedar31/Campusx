"""
Pydantic Schemas for Class Timetables and Daily Schedules.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.timetable import DayOfWeek, RoomType


class RoomBase(BaseModel):
    room_number: str
    building: str = "Main Academic Block"
    capacity: int = 60
    type: RoomType = RoomType.LECTURE_HALL


class RoomCreate(RoomBase):
    pass


class RoomResponse(RoomBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class ClassSectionResponse(BaseModel):
    id: str
    department_id: str
    course_id: str
    semester_number: int
    section_name: str
    academic_year: str

    model_config = ConfigDict(from_attributes=True)


class TimetableSlotResponse(BaseModel):
    id: str
    day_of_week: DayOfWeek
    start_time: str
    end_time: str
    subject_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    faculty_id: str
    faculty_name: Optional[str] = None
    room_id: Optional[str] = None
    room_number: Optional[str] = None
    building: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TimetableSlotCreate(BaseModel):
    timetable_id: str
    day_of_week: DayOfWeek
    start_time: str
    end_time: str
    subject_id: str
    faculty_id: str
    room_id: Optional[str] = None


class DailyScheduleResponse(BaseModel):
    day: str
    slots: List[TimetableSlotResponse] = []
    upcoming_class: Optional[TimetableSlotResponse] = None


class WeeklyTimetableResponse(BaseModel):
    class_section_name: Optional[str] = None
    academic_year: str
    semester_number: int
    schedule_by_day: dict  # mapping DayOfWeek -> list of TimetableSlotResponse
