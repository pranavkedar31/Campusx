"""
Campus Events and Event Registrations API endpoints.
"""

from typing import List, Optional
import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.student import Student
from app.models.communication import CampusEvent, EventCategory, EventRegistration
from app.schemas.communication import EventCreate, EventUpdate, EventResponse, EventRegistrationResponse

router = APIRouter()


@router.get("/", response_model=List[EventResponse], summary="List Campus Events")
def list_events(
    category: Optional[EventCategory] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List campus events with registration count and attendance status for the current student.
    """
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    student_id = student.id if student else None

    query = db.query(CampusEvent)
    if category:
        query = query.filter(CampusEvent.category == category)

    events = query.order_by(CampusEvent.event_date.asc()).all()
    result = []
    for ev in events:
        reg_count = db.query(EventRegistration).filter(EventRegistration.event_id == ev.id).count()
        is_reg = False
        if student_id:
            is_reg = db.query(EventRegistration).filter(
                EventRegistration.event_id == ev.id,
                EventRegistration.student_id == student_id
            ).first() is not None

        result.append(EventResponse(
            id=ev.id,
            title=ev.title,
            description=ev.description,
            category=ev.category,
            venue=ev.venue,
            event_date=ev.event_date,
            start_time=ev.start_time,
            end_time=ev.end_time,
            registration_deadline=ev.registration_deadline,
            attachment_url=ev.attachment_url,
            status=ev.status,
            organizer=ev.organizer,
            max_participants=ev.max_participants,
            created_at=ev.created_at,
            registration_count=reg_count,
            is_registered=is_reg
        ))

    return result


@router.get("/{event_id}", response_model=EventResponse, summary="Get Event Details")
def get_event_details(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full details of a campus event."""
    ev = db.query(CampusEvent).filter(CampusEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    student_id = student.id if student else None

    reg_count = db.query(EventRegistration).filter(EventRegistration.event_id == ev.id).count()
    is_reg = False
    if student_id:
        is_reg = db.query(EventRegistration).filter(
            EventRegistration.event_id == ev.id,
            EventRegistration.student_id == student_id
        ).first() is not None

    return EventResponse(
        id=ev.id,
        title=ev.title,
        description=ev.description,
        category=ev.category,
        venue=ev.venue,
        event_date=ev.event_date,
        start_time=ev.start_time,
        end_time=ev.end_time,
        registration_deadline=ev.registration_deadline,
        attachment_url=ev.attachment_url,
        status=ev.status,
        organizer=ev.organizer,
        max_participants=ev.max_participants,
        created_at=ev.created_at,
        registration_count=reg_count,
        is_registered=is_reg
    )


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED, summary="Create Event")
def create_event(
    event_in: EventCreate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Schedule a new campus event (Admin/Faculty only)."""
    event = CampusEvent(
        **event_in.model_dump(),
        created_by_user_id=current_admin.id
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventResponse(
        **event_in.model_dump(),
        id=event.id,
        created_at=event.created_at,
        registration_count=0,
        is_registered=False
    )


@router.put("/{event_id}", response_model=EventResponse, summary="Update Event")
def update_event(
    event_id: str,
    event_in: EventUpdate,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Update event schedule and details."""
    ev = db.query(CampusEvent).filter(CampusEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found.")

    for field, val in event_in.model_dump(exclude_unset=True).items():
        setattr(ev, field, val)

    db.commit()
    db.refresh(ev)
    reg_count = db.query(EventRegistration).filter(EventRegistration.event_id == ev.id).count()
    return EventResponse(
        id=ev.id,
        title=ev.title,
        description=ev.description,
        category=ev.category,
        venue=ev.venue,
        event_date=ev.event_date,
        start_time=ev.start_time,
        end_time=ev.end_time,
        registration_deadline=ev.registration_deadline,
        attachment_url=ev.attachment_url,
        status=ev.status,
        organizer=ev.organizer,
        max_participants=ev.max_participants,
        created_at=ev.created_at,
        registration_count=reg_count,
        is_registered=False
    )


@router.delete("/{event_id}", summary="Delete Event")
def delete_event(
    event_id: str,
    current_admin: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    ev = db.query(CampusEvent).filter(CampusEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found.")
    db.delete(ev)
    db.commit()
    return {"status": "success", "message": "Event deleted successfully."}


@router.post("/{event_id}/register", status_code=status.HTTP_201_CREATED, summary="Register for Event")
def register_for_event(
    event_id: str,
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Register the authenticated student for an event."""
    event = db.query(CampusEvent).filter(CampusEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    existing = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already registered for this event.")

    count = db.query(EventRegistration).filter(EventRegistration.event_id == event_id).count()
    if count >= event.max_participants:
        raise HTTPException(status_code=400, detail="Event has reached maximum capacity.")

    reg = EventRegistration(event_id=event_id, student_id=student.id, status="Confirmed")
    db.add(reg)
    db.commit()
    return {"status": "success", "message": f"Successfully registered for '{event.title}'."}


@router.post("/{event_id}/cancel", summary="Cancel Registration")
def cancel_registration(
    event_id: str,
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: Session = Depends(get_db)
):
    """Cancel attendance registration for an event."""
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found.")

    reg = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.student_id == student.id
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found.")

    db.delete(reg)
    db.commit()
    return {"status": "success", "message": "Event registration cancelled."}


@router.get("/{event_id}/participants", summary="List Registered Participants")
def list_event_participants(
    event_id: str,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """View registered participants for an event (Admin/Faculty only)."""
    regs = db.query(EventRegistration).filter(EventRegistration.event_id == event_id).all()
    return [
        {
            "registration_id": r.id,
            "student_id": r.student_id,
            "roll_number": r.student.roll_number if r.student else "",
            "full_name": r.student.user.full_name if (r.student and r.student.user) else "Student",
            "department_name": r.student.department.name if (r.student and r.student.department) else "",
            "registered_at": r.registered_at,
            "status": r.status
        }
        for r in regs
    ]


@router.get("/{event_id}/export-registrations", summary="Export Registrations to CSV")
def export_event_registrations(
    event_id: str,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Export event attendees to a downloadable CSV spreadsheet."""
    ev = db.query(CampusEvent).filter(CampusEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found.")

    regs = db.query(EventRegistration).filter(EventRegistration.event_id == event_id).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Event Title", "Roll Number", "Student Name", "Department", "Program", "Registered At", "Status"])

    for r in regs:
        writer.writerow([
            ev.title,
            r.student.roll_number if r.student else "N/A",
            r.student.user.full_name if (r.student and r.student.user) else "N/A",
            r.student.department.name if (r.student and r.student.department) else "N/A",
            r.student.course.name if (r.student and r.student.course) else "N/A",
            r.registered_at.strftime("%Y-%m-%d %H:%M:%S") if r.registered_at else "N/A",
            r.status
        ])

    output.seek(0)
    filename = f"Attendees_{ev.title.replace(' ', '_')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
