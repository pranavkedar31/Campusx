"""
Pydantic Schemas for Student Fee Ledger and Billing Management.
"""

from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.models.fee import FeeStatus, PaymentMode, TransactionStatus


class FeeHeadBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class FeeHeadCreate(FeeHeadBase):
    pass


class FeeHeadResponse(FeeHeadBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeeStructureComponentBase(BaseModel):
    fee_head_id: str
    amount: float


class FeeStructureComponentResponse(FeeStructureComponentBase):
    id: str
    fee_head_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FeeStructureCreate(BaseModel):
    department_id: str
    course_id: str
    academic_year: str
    semester_number: int
    due_date: date
    components: List[FeeStructureComponentBase]


class FeeStructureResponse(BaseModel):
    id: str
    department_id: str
    course_id: str
    academic_year: str
    semester_number: int
    total_amount: float
    due_date: date
    components: List[FeeStructureComponentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class FeeReceiptResponse(BaseModel):
    id: str
    receipt_number: str
    fee_transaction_id: str
    student_fee_id: str
    student_id: str
    amount: float
    receipt_date: datetime
    pdf_filename: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FeeTransactionResponse(BaseModel):
    id: str
    student_fee_id: str
    student_id: str
    amount: float
    payment_mode: PaymentMode
    transaction_ref: str
    transaction_date: datetime
    status: TransactionStatus
    remarks: Optional[str] = None
    receipt_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentFeeResponse(BaseModel):
    id: str
    student_id: str
    fee_structure_id: Optional[str] = None
    academic_year: str
    semester_number: int
    total_amount: float
    paid_amount: float
    pending_amount: float
    due_date: date
    status: FeeStatus
    transactions: List[FeeTransactionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class FeePaymentCreate(BaseModel):
    student_fee_id: str
    amount: float
    payment_mode: PaymentMode = PaymentMode.UPI
    remarks: Optional[str] = None


class StudentFeeLedgerResponse(BaseModel):
    student_id: str
    student_name: str
    roll_number: str
    total_fees: float
    total_paid: float
    total_pending: float
    status: FeeStatus
    next_due_date: Optional[date] = None
    fees: List[StudentFeeResponse] = []
    recent_transactions: List[FeeTransactionResponse] = []


class AdminFeeOverview(BaseModel):
    total_expected: float
    total_collected: float
    total_pending: float
    total_overdue: float
    collection_rate_pct: float
    recent_transactions: List[FeeTransactionResponse] = []
