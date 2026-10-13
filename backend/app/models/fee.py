"""
Student Fee and Ledger Models for CampusX College ERP.
Tracks fee structures, student fee liabilities, payment transactions, and generated receipts.
"""

import uuid
from datetime import datetime, date, timezone
from enum import Enum
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Date, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class FeeStatus(str, Enum):
    PAID = "PAID"
    PARTIAL = "PARTIAL"
    PENDING = "PENDING"
    OVERDUE = "OVERDUE"


class PaymentMode(str, Enum):
    ONLINE_NETBANKING = "ONLINE_NETBANKING"
    UPI = "UPI"
    DEBIT_CARD = "DEBIT_CARD"
    CREDIT_CARD = "CREDIT_CARD"
    CHALLAN = "CHALLAN"
    DEMAND_DRAFT = "DEMAND_DRAFT"


class TransactionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    PENDING = "PENDING"
    FAILED = "FAILED"


class FeeHead(Base):
    __tablename__ = "fee_heads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # e.g., "Tuition Fee", "Lab Fee"
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)   # e.g., "TUIT", "LAB"
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "2025-2026"
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)   # 1 to 8
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    department = relationship("Department")
    course = relationship("Course")
    components = relationship("FeeStructureComponent", back_populates="fee_structure", cascade="all, delete-orphan")


class FeeStructureComponent(Base):
    __tablename__ = "fee_structure_components"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fee_structure_id: Mapped[str] = mapped_column(String(36), ForeignKey("fee_structures.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_head_id: Mapped[str] = mapped_column(String(36), ForeignKey("fee_heads.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    fee_structure = relationship("FeeStructure", back_populates="components")
    fee_head = relationship("FeeHead")


class StudentFee(Base):
    __tablename__ = "student_fees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_structure_id: Mapped[str] = mapped_column(String(36), ForeignKey("fee_structures.id"), nullable=True)
    academic_year: Mapped[str] = mapped_column(String(50), nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    pending_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[FeeStatus] = mapped_column(
        SQLEnum(FeeStatus, name="fee_status_enum"),
        default=FeeStatus.PENDING,
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    student = relationship("Student")
    fee_structure = relationship("FeeStructure")
    transactions = relationship("FeeTransaction", back_populates="student_fee", cascade="all, delete-orphan")


class FeeTransaction(Base):
    __tablename__ = "fee_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_fee_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_fees.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_mode: Mapped[PaymentMode] = mapped_column(
        SQLEnum(PaymentMode, name="payment_mode_enum"),
        default=PaymentMode.UPI,
        nullable=False
    )
    transaction_ref: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    transaction_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[TransactionStatus] = mapped_column(
        SQLEnum(TransactionStatus, name="transaction_status_enum"),
        default=TransactionStatus.SUCCESS,
        nullable=False
    )
    remarks: Mapped[str] = mapped_column(String(255), nullable=True)

    student_fee = relationship("StudentFee", back_populates="transactions")
    student = relationship("Student")
    receipt = relationship("FeeReceipt", back_populates="transaction", uselist=False, cascade="all, delete-orphan")


class FeeReceipt(Base):
    __tablename__ = "fee_receipts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # e.g., "RCP-2026-0001"
    fee_transaction_id: Mapped[str] = mapped_column(String(36), ForeignKey("fee_transactions.id", ondelete="CASCADE"), nullable=False, unique=True)
    student_fee_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_fees.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    receipt_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    pdf_filename: Mapped[str] = mapped_column(String(255), nullable=True)

    transaction = relationship("FeeTransaction", back_populates="receipt")
    student = relationship("Student")
