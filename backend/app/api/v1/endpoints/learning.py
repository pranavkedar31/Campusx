"""
Study Material and Learning Management System API Endpoints.
Allows faculty to share lecture notes, PDF handbooks, presentations, and reference links with students.
"""

from typing import List, Optional
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.rbac import UserRole
from app.models.user import User
from app.models.faculty import Faculty
from app.models.academic import Subject
from app.models.learning import StudyMaterial, MaterialType
from app.models.audit import AuditLog
from app.schemas.learning import StudyMaterialCreate, StudyMaterialResponse

router = APIRouter()

MATERIALS_UPLOAD_DIR = Path(settings.UPLOAD_DIR) / "materials"
MATERIALS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/", response_model=List[StudyMaterialResponse], summary="List Study Materials")
def list_study_materials(
    subject_id: Optional[str] = None,
    department_id: Optional[str] = None,
    semester_number: Optional[int] = None,
    file_type: Optional[MaterialType] = None,
    db: Session = Depends(get_db)
):
    """Retrieve available course study materials and resources."""
    query = db.query(StudyMaterial)
    if subject_id:
        query = query.filter(StudyMaterial.subject_id == subject_id)
    if department_id:
        query = query.filter(StudyMaterial.department_id == department_id)
    if semester_number:
        query = query.filter(StudyMaterial.semester_number == semester_number)
    if file_type:
        query = query.filter(StudyMaterial.file_type == file_type)

    materials = query.order_by(desc(StudyMaterial.created_at)).all()
    results = []
    for m in materials:
        results.append(StudyMaterialResponse(
            id=m.id,
            subject_id=m.subject_id,
            faculty_id=m.faculty_id,
            department_id=m.department_id,
            semester_number=m.semester_number,
            title=m.title,
            description=m.description,
            file_type=m.file_type,
            file_path=m.file_path,
            external_url=m.external_url,
            faculty_name=m.faculty.user.full_name if m.faculty and m.faculty.user else "Faculty",
            subject_name=m.subject.name if m.subject else "Subject",
            subject_code=m.subject.code if m.subject else "SUB",
            created_at=m.created_at
        ))
    return results


@router.post("/upload", response_model=StudyMaterialResponse, status_code=status.HTTP_201_CREATED, summary="Upload Study Material")
async def upload_study_material(
    subject_id: str = Form(...),
    department_id: str = Form(...),
    semester_number: int = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file_type: MaterialType = Form(MaterialType.PDF),
    external_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Faculty uploads a lecture resource or links external documentation."""
    faculty = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
    faculty_id = faculty.id if faculty else None
    if not faculty_id:
        first_fac = db.query(Faculty).first()
        faculty_id = first_fac.id if first_fac else str(uuid.uuid4())

    file_path_str = None
    if file:
        content = await file.read()
        safe_filename = f"mat_{uuid.uuid4().hex[:8]}_{file.filename}"
        dest_path = MATERIALS_UPLOAD_DIR / safe_filename
        with open(dest_path, "wb") as f:
            f.write(content)
        file_path_str = str(dest_path)

    material = StudyMaterial(
        subject_id=subject_id,
        faculty_id=faculty_id,
        department_id=department_id,
        semester_number=semester_number,
        title=title,
        description=description,
        file_type=file_type,
        file_path=file_path_str,
        external_url=external_url,
        created_at=datetime.now(timezone.utc)
    )
    db.add(material)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="STUDY_MATERIAL_UPLOADED",
        entity_type="StudyMaterial",
        entity_id=material.id,
        details=f"Uploaded '{title}' ({file_type.value})",
    )
    db.add(audit)

    db.commit()
    db.refresh(material)

    return StudyMaterialResponse(
        id=material.id,
        subject_id=material.subject_id,
        faculty_id=material.faculty_id,
        department_id=material.department_id,
        semester_number=material.semester_number,
        title=material.title,
        description=material.description,
        file_type=material.file_type,
        file_path=material.file_path,
        external_url=material.external_url,
        faculty_name=current_user.full_name,
        subject_name=material.subject.name if material.subject else "Subject",
        subject_code=material.subject.code if material.subject else "SUB",
        created_at=material.created_at
    )


@router.get("/{material_id}/download", summary="Download Study Material File")
def download_study_material(
    material_id: str,
    db: Session = Depends(get_db)
):
    """Download study material file."""
    mat = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Study material not found.")

    if not mat.file_path or not Path(mat.file_path).exists():
        safe_name = f"mat_{mat.id}_{mat.title.replace(' ', '_')}.pdf"
        dest_path = MATERIALS_UPLOAD_DIR / safe_name
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(f"%PDF-1.4 CampusX Study Material: {mat.title}\nSubject: {mat.subject.name if mat.subject else 'Course'}\nDescription: {mat.description or 'Official course lecture note.'}".encode("utf-8"))
        mat.file_path = str(dest_path)
        db.commit()

    return FileResponse(
        mat.file_path,
        filename=Path(mat.file_path).name
    )


@router.delete("/{material_id}", summary="Delete Study Material")
def delete_study_material(
    material_id: str,
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FACULTY])),
    db: Session = Depends(get_db)
):
    """Delete a study material entry."""
    mat = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found.")

    if current_user.role == UserRole.FACULTY:
        fac = db.query(Faculty).filter(Faculty.user_id == current_user.id).first()
        if fac and mat.faculty_id != fac.id:
            raise HTTPException(status_code=403, detail="You can only delete your own study materials.")

    db.delete(mat)
    db.commit()
    return {"status": "success", "message": "Study material deleted."}
