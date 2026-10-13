"""
Professional PDF Certificate & Document Generation Service using ReportLab & QRCode.
"""

from pathlib import Path
from datetime import datetime, timezone
import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, HRFlowable
from app.core.config import settings

CERTIFICATES_DIR = Path(settings.UPLOAD_DIR) / "certificates"
CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)

FEE_RECEIPTS_DIR = Path(settings.UPLOAD_DIR) / "fee_receipts"
FEE_RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)

MARKSHEETS_DIR = Path(settings.UPLOAD_DIR) / "marksheets"
MARKSHEETS_DIR.mkdir(parents=True, exist_ok=True)

ID_CARDS_DIR = Path(settings.UPLOAD_DIR) / "id_cards"
ID_CARDS_DIR.mkdir(parents=True, exist_ok=True)

HALL_TICKETS_DIR = Path(settings.UPLOAD_DIR) / "hall_tickets"
HALL_TICKETS_DIR.mkdir(parents=True, exist_ok=True)

APPLICATIONS_DIR = Path(settings.UPLOAD_DIR) / "applications"
APPLICATIONS_DIR.mkdir(parents=True, exist_ok=True)



def generate_certificate_pdf(
    certificate_uuid: str,
    cert_type: str,
    student_name: str,
    roll_number: str,
    department_name: str,
    course_name: str,
    semester: int,
    purpose: str,
    issue_date: datetime
) -> str:
    """
    Generate an authentic verifiable academic certificate with an embedded verification QR code.
    Returns the absolute path to the generated PDF.
    """
    filename = f"{certificate_uuid}.pdf"
    pdf_path = CERTIFICATES_DIR / filename

    # 1. Generate Verification QR Code
    verification_url = f"http://localhost:5173/verify/{certificate_uuid}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="white")
    qr_path = CERTIFICATES_DIR / f"{certificate_uuid}_qr.png"
    qr_img.save(str(qr_path))

    # 2. Build PDF Document
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        alignment=1,  # Center
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        alignment=1,
    )

    cert_heading_style = ParagraphStyle(
        'CertHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=20,
        textColor=colors.HexColor('#0284C7'),
        alignment=1,
    )

    body_style = ParagraphStyle(
        'CertBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=18,
        textColor=colors.HexColor('#1E293B'),
        alignment=4,  # Justify
    )

    footer_style = ParagraphStyle(
        'CertFooter',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#94A3B8'),
        alignment=1,
    )

    elements = []

    # Header
    elements.append(Paragraph("CAMPUSX UNIVERSITY OF TECHNOLOGY", title_style))
    elements.append(Paragraph("OFFICE OF THE REGISTRAR & ACADEMIC CERTIFICATION", subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=15))

    # Certificate Type
    formatted_type = cert_type.replace('_', ' ').title()
    elements.append(Paragraph(f"CERTIFICATE OF {formatted_type.upper()}", cert_heading_style))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Certificate ID: <b>{certificate_uuid}</b>", subtitle_style))
    elements.append(Spacer(1, 25))

    # Body Statement
    cert_text = (
        f"This is to officially certify that <b>{student_name}</b>, bearing Roll Number "
        f"<b>{roll_number}</b>, is a bonafide student of CampusX University of Technology. "
        f"The student is currently enrolled in the <b>{course_name}</b> program within the "
        f"Department of <b>{department_name}</b>, presently studying in <b>Semester {semester}</b>."
    )
    elements.append(Paragraph(cert_text, body_style))
    elements.append(Spacer(1, 15))

    purpose_text = (
        f"This document is issued upon formal student request for the following stated purpose: "
        f"<i>\"{purpose}\"</i>. The institutional records confirm that the student maintains good conduct "
        f"and active academic standing."
    )
    elements.append(Paragraph(purpose_text, body_style))
    elements.append(Spacer(1, 35))

    # Signatures and QR Code Table
    qr_image = Image(str(qr_path), width=90, height=90)
    sig_data = [
        [
            qr_image,
            "",
            Paragraph(
                f"<b>Issued Date:</b> {issue_date.strftime('%B %d, %Y')}<br/>"
                f"<b>Registrar / Authorized Signatory</b><br/>"
                f"CampusX Academic Directorate<br/>"
                f"<i>(Digitally Verified & Sealed)</i>",
                body_style
            )
        ]
    ]

    sig_table = Table(sig_data, colWidths=[120, 160, 240])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
    ]))
    elements.append(sig_table)

    elements.append(Spacer(1, 25))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=10))
    elements.append(Paragraph("Scan the QR code to verify certificate authenticity on the official CampusX validation portal.", footer_style))

    # Build PDF
    doc.build(elements)

    # Clean temporary QR image
    try:
        qr_path.unlink()
    except Exception:
        pass

    return str(pdf_path)


def generate_fee_receipt_pdf(
    receipt_number: str,
    student_name: str,
    roll_number: str,
    department_name: str,
    course_name: str,
    semester: int,
    academic_year: str,
    amount: float,
    payment_mode: str,
    transaction_ref: str,
    transaction_date: datetime,
    remaining_balance: float = 0.0
) -> str:
    """
    Generate an official institutional Fee Payment Receipt PDF.
    """
    filename = f"{receipt_number}.pdf"
    pdf_path = FEE_RECEIPTS_DIR / filename

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'FeeTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        alignment=1,
    )
    subtitle_style = ParagraphStyle(
        'FeeSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        alignment=1,
    )
    heading_style = ParagraphStyle(
        'FeeHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0284C7'),
        alignment=1,
    )
    body_style = ParagraphStyle(
        'FeeBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
    )

    elements = []
    elements.append(Paragraph("CAMPUSX UNIVERSITY OF TECHNOLOGY", title_style))
    elements.append(Paragraph("OFFICE OF THE BURSAR & FINANCIAL SERVICES", subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=15))

    elements.append(Paragraph("OFFICIAL STUDENT FEE RECEIPT", heading_style))
    elements.append(Spacer(1, 12))

    # Meta Table
    meta_data = [
        [
            Paragraph(f"<b>Receipt No:</b> {receipt_number}", body_style),
            Paragraph(f"<b>Date:</b> {transaction_date.strftime('%B %d, %Y %I:%M %p')}", body_style)
        ],
        [
            Paragraph(f"<b>Payment Mode:</b> {payment_mode.replace('_', ' ')}", body_style),
            Paragraph(f"<b>Txn Ref:</b> {transaction_ref}", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 15))

    # Student Details
    student_data = [
        [Paragraph("<b>Student Name</b>", body_style), Paragraph(student_name, body_style)],
        [Paragraph("<b>Roll Number</b>", body_style), Paragraph(roll_number, body_style)],
        [Paragraph("<b>Program & Dept</b>", body_style), Paragraph(f"{course_name} ({department_name})", body_style)],
        [Paragraph("<b>Semester & Year</b>", body_style), Paragraph(f"Semester {semester} • Academic Year {academic_year}", body_style)],
    ]
    stu_table = Table(student_data, colWidths=[160, 360])
    stu_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F1F5F9')),
    ]))
    elements.append(stu_table)
    elements.append(Spacer(1, 15))

    # Financial Breakdown Table
    fee_data = [
        [Paragraph("<b>Description</b>", body_style), Paragraph("<b>Amount (INR)</b>", body_style)],
        [Paragraph(f"Academic Tuition & Institutional Fees (Semester {semester})", body_style), Paragraph(f"₹ {amount:,.2f}", body_style)],
        [Paragraph("<b>Total Amount Paid</b>", body_style), Paragraph(f"<b>₹ {amount:,.2f}</b>", body_style)],
        [Paragraph("<b>Remaining Pending Balance</b>", body_style), Paragraph(f"₹ {remaining_balance:,.2f}", body_style)],
    ]
    fee_table = Table(fee_data, colWidths=[360, 160])
    fee_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#ECFDF5')),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(fee_table)
    elements.append(Spacer(1, 25))

    # Footer and Signature
    sig_data = [
        [
            Paragraph("<b>Payment Status:</b> <font color='#059669'>SUCCESSFUL / CONFIRMED</font>", body_style),
            Paragraph("<b>Finance Officer / Cashier</b><br/>CampusX Financial Administration<br/><i>(Computer Generated Receipt)</i>", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(sig_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))
    elements.append(Paragraph("This is an electronically generated official receipt. No physical signature required.", subtitle_style))

    doc.build(elements)
    return str(pdf_path)


def generate_marksheet_pdf(
    examination_name: str,
    student_name: str,
    roll_number: str,
    enrollment_number: str,
    department_name: str,
    course_name: str,
    semester: int,
    academic_year: str,
    sgpa: float,
    cgpa: float,
    percentage: float,
    result_status: str,
    subjects: list
) -> str:
    """
    Generate an official Academic Grade Sheet / Marksheet PDF with subject-wise breakdown.
    """
    filename = f"marksheet_{roll_number}_sem{semester}.pdf"
    pdf_path = MARKSHEETS_DIR / filename

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=35,
        bottomMargin=35
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'MarkTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        alignment=1,
    )
    subtitle_style = ParagraphStyle(
        'MarkSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B'),
        alignment=1,
    )
    heading_style = ParagraphStyle(
        'MarkHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0284C7'),
        alignment=1,
    )
    table_header_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.white,
        alignment=1,
    )
    cell_style = ParagraphStyle(
        'TD',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
    )
    cell_center = ParagraphStyle(
        'TDC',
        parent=cell_style,
        alignment=1,
    )

    elements = []
    elements.append(Paragraph("CAMPUSX UNIVERSITY OF TECHNOLOGY", title_style))
    elements.append(Paragraph("OFFICE OF THE CONTROLLER OF EXAMINATIONS", subtitle_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=10))

    elements.append(Paragraph(f"SEMESTER GRADE REPORT — {examination_name.upper()}", heading_style))
    elements.append(Spacer(1, 10))

    # Student Info Grid
    info_data = [
        [
            Paragraph(f"<b>Student Name:</b> {student_name}", cell_style),
            Paragraph(f"<b>Roll Number:</b> {roll_number}", cell_style)
        ],
        [
            Paragraph(f"<b>Enrollment No:</b> {enrollment_number}", cell_style),
            Paragraph(f"<b>Degree:</b> {course_name}", cell_style)
        ],
        [
            Paragraph(f"<b>Department:</b> {department_name}", cell_style),
            Paragraph(f"<b>Semester / Session:</b> Sem {semester} ({academic_year})", cell_style)
        ]
    ]
    info_table = Table(info_data, colWidths=[270, 260])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))

    # Subject Grades Table
    headers = [
        Paragraph("Code", table_header_style),
        Paragraph("Subject Name", table_header_style),
        Paragraph("Credits", table_header_style),
        Paragraph("Int", table_header_style),
        Paragraph("Ext", table_header_style),
        Paragraph("Total", table_header_style),
        Paragraph("Grade", table_header_style),
        Paragraph("Points", table_header_style),
        Paragraph("Status", table_header_style),
    ]
    table_rows = [headers]

    for s in subjects:
        table_rows.append([
            Paragraph(str(s.get("subject_code", "CS")), cell_center),
            Paragraph(str(s.get("subject_name", "Subject")), cell_style),
            Paragraph(str(s.get("credits", 3)), cell_center),
            Paragraph(f"{s.get('internal_marks', 0):.0f}", cell_center),
            Paragraph(f"{s.get('external_marks', 0):.0f}", cell_center),
            Paragraph(f"{s.get('total_marks', 0):.0f}", cell_center),
            Paragraph(str(s.get("grade", "A")), cell_center),
            Paragraph(f"{s.get('grade_point', 8.0):.1f}", cell_center),
            Paragraph(str(s.get("status", "PASS")), cell_center),
        ])

    grade_table = Table(table_rows, colWidths=[55, 175, 45, 40, 40, 45, 45, 45, 40])
    grade_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(grade_table)
    elements.append(Spacer(1, 12))

    # Summary Box
    summary_data = [
        [
            Paragraph(f"<b>SGPA:</b> {sgpa:.2f}", cell_style),
            Paragraph(f"<b>Cumulative CGPA:</b> {cgpa:.2f}", cell_style),
            Paragraph(f"<b>Percentage:</b> {percentage:.1f}%", cell_style),
            Paragraph(f"<b>Final Result:</b> <font color='#059669'><b>{result_status}</b></font>", cell_style),
        ]
    ]
    summary_table = Table(summary_data, colWidths=[130, 140, 130, 130])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#3B82F6')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 25))

    # Signatures
    sig_data = [
        [
            Paragraph("<b>Controller of Examinations</b><br/>CampusX University", cell_style),
            Paragraph("<b>Dean of Academics</b><br/>CampusX Academic Council", cell_style),
            Paragraph(f"<b>Issued Date:</b> {datetime.now().strftime('%B %d, %Y')}<br/><i>(Digitally Sealed)</i>", cell_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[180, 180, 170])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    return str(pdf_path)


def generate_student_id_card_pdf(
    student_name: str,
    roll_number: str,
    enrollment_number: str,
    department_name: str,
    course_name: str,
    admission_year: int,
    valid_until: str = "2027"
) -> str:
    """
    Generate a printable Official Digital Student ID Card PDF.
    """
    filename = f"id_card_{roll_number}.pdf"
    pdf_path = ID_CARDS_DIR / filename

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=(300, 200),  # ID Card landscape aspect
        rightMargin=15,
        leftMargin=15,
        topMargin=15,
        bottomMargin=15
    )
    styles = getSampleStyleSheet()

    card_title = ParagraphStyle(
        'CardTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13,
        textColor=colors.HexColor('#0F172A'),
        alignment=1,
    )
    card_sub = ParagraphStyle(
        'CardSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#64748B'),
        alignment=1,
    )
    card_text = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
    )

    elements = []
    elements.append(Paragraph("CAMPUSX UNIVERSITY OF TECHNOLOGY", card_title))
    elements.append(Paragraph("STUDENT IDENTITY CARD", card_sub))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#0284C7'), spaceAfter=8))

    details = [
        [Paragraph(f"<b>Name:</b> {student_name}", card_text)],
        [Paragraph(f"<b>Roll No:</b> {roll_number}", card_text)],
        [Paragraph(f"<b>Enrollment:</b> {enrollment_number}", card_text)],
        [Paragraph(f"<b>Program:</b> {course_name}", card_text)],
        [Paragraph(f"<b>Department:</b> {department_name}", card_text)],
        [Paragraph(f"<b>Valid Upto:</b> June {valid_until}", card_text)],
    ]
    t = Table(details, colWidths=[270])
    t.setStyle(TableStyle([
        ('PADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(t)

    doc.build(elements)
    return str(pdf_path)


def generate_hall_ticket_pdf(
    hall_ticket_number: str,
    student_name: str,
    roll_number: str,
    prn: str,
    department_name: str,
    course_name: str,
    examination_name: str,
    semester: int,
    academic_year: str,
    schedules: list,
    qr_data: str = None
) -> str:
    """
    Generate an official Examination Hall Ticket / Admit Card PDF.
    """
    filename = f"{hall_ticket_number}.pdf"
    pdf_path = HALL_TICKETS_DIR / filename

    # QR Code generation
    qr_content = qr_data or f"CAMPUSX:HT:{hall_ticket_number}:{roll_number}:{examination_name}"
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=5, border=2)
    qr.add_data(qr_content)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="white")
    qr_path = HALL_TICKETS_DIR / f"{hall_ticket_number}_qr.png"
    qr_img.save(str(qr_path))

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('HTTitle', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#0F172A'), alignment=1)
    sub_style = ParagraphStyle('HTSub', fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=colors.HexColor('#0284C7'), alignment=1)
    label_style = ParagraphStyle('HTLabel', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#334155'))
    val_style = ParagraphStyle('HTVal', fontName='Helvetica', fontSize=9, leading=12, textColor=colors.HexColor('#0F172A'))
    rule_style = ParagraphStyle('HTRule', fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#475569'))
    th_style = ParagraphStyle('HTTh', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=colors.white, alignment=1)
    td_style = ParagraphStyle('HTTd', fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#0F172A'), alignment=1)

    elements = []
    elements.append(Paragraph("CAMPUSX UNIVERSITY OF TECHNOLOGY", title_style))
    elements.append(Paragraph("OFFICE OF THE CONTROLLER OF EXAMINATIONS", ParagraphStyle('Sub2', fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#64748B'), alignment=1)))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(f"EXAMINATION ADMIT CARD / HALL TICKET — {examination_name.upper()}", sub_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=12))

    # Student Info & QR Code
    candidate_info = [
        [
            Paragraph(f"<b>Hall Ticket No:</b> {hall_ticket_number}", val_style),
            Paragraph(f"<b>Academic Year:</b> {academic_year}", val_style),
            Image(str(qr_path), width=70, height=70)
        ],
        [
            Paragraph(f"<b>Candidate Name:</b> {student_name}", val_style),
            Paragraph(f"<b>Roll Number:</b> {roll_number}", val_style),
            ""
        ],
        [
            Paragraph(f"<b>PRN:</b> {prn or 'N/A'}", val_style),
            Paragraph(f"<b>Program:</b> {course_name} (Sem {semester})", val_style),
            ""
        ],
        [
            Paragraph(f"<b>Department:</b> {department_name}", val_style),
            Paragraph("<b>Fee Status:</b> <font color='#059669'>VERIFIED & PAID</font>", val_style),
            ""
        ]
    ]
    info_table = Table(candidate_info, colWidths=[240, 220, 80])
    info_table.setStyle(TableStyle([
        ('SPAN', (2, 0), (2, 3)),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 14))

    # Exam Schedule Table
    sched_header = [
        Paragraph("Date", th_style),
        Paragraph("Time", th_style),
        Paragraph("Code", th_style),
        Paragraph("Course / Subject Name", th_style),
        Paragraph("Room", th_style),
        Paragraph("Invigilator Sig", th_style),
    ]
    sched_data = [sched_header]
    for s in schedules:
        sched_data.append([
            Paragraph(str(s.get("exam_date", "")), td_style),
            Paragraph(f"{s.get('start_time', '')} - {s.get('end_time', '')}", td_style),
            Paragraph(str(s.get("subject_code", "")), td_style),
            Paragraph(str(s.get("subject_name", "")), ParagraphStyle('SchedSub', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A'))),
            Paragraph(str(s.get("room_no", "Main Hall")), td_style),
            Paragraph("____________", td_style)
        ])

    st = Table(sched_data, colWidths=[70, 95, 65, 180, 60, 70])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(st)
    elements.append(Spacer(1, 14))

    # Instructions
    elements.append(Paragraph("<b>IMPORTANT INSTRUCTIONS FOR CANDIDATES:</b>", label_style))
    elements.append(Paragraph("1. Candidates must carry this Admit Card along with their valid College Identity Card to the examination hall.", rule_style))
    elements.append(Paragraph("2. Candidates must occupy their designated seats at least 15 minutes before the scheduled commencement of the examination.", rule_style))
    elements.append(Paragraph("3. Possession of mobile phones, smartwatches, programmable calculators, or any unauthorized material inside the examination hall is strictly prohibited.", rule_style))
    elements.append(Paragraph("4. No candidate will be permitted to enter the examination hall 30 minutes after the exam has started.", rule_style))
    elements.append(Paragraph("5. This Hall Ticket is digitally authenticated upon verification of enrollment, attendance, and exam fee clearance.", rule_style))
    elements.append(Spacer(1, 20))

    # Signatures
    sig_data = [
        [
            Paragraph("____________________________<br/><b>Candidate's Signature</b>", td_style),
            Paragraph("____________________________<br/><b>Center Superintendent</b>", td_style),
            Paragraph("____________________________<br/><b>Controller of Examinations</b>", td_style),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[180, 180, 180])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    return str(pdf_path)


def generate_application_document_pdf(
    application_number: str,
    application_type: str,
    student_name: str,
    roll_number: str,
    enrollment_number: str,
    department_name: str,
    course_name: str,
    reason: str,
    academic_year: str,
    approved_date: datetime,
    admin_remarks: str = None
) -> str:
    """
    Generate an official authenticated student certificate / letter dispatch PDF.
    """
    filename = f"{application_number}.pdf"
    pdf_path = APPLICATIONS_DIR / filename

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('AppTitle', fontName='Helvetica-Bold', fontSize=19, leading=23, textColor=colors.HexColor('#0F172A'), alignment=1)
    sub_title = ParagraphStyle('AppSub', fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#64748B'), alignment=1)
    doc_type_style = ParagraphStyle('AppDocType', fontName='Helvetica-Bold', fontSize=15, leading=20, textColor=colors.HexColor('#0284C7'), alignment=1)
    body_style = ParagraphStyle('AppBody', fontName='Helvetica', fontSize=11, leading=18, textColor=colors.HexColor('#1E293B'))
    ref_style = ParagraphStyle('AppRef', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=colors.HexColor('#475569'))
    seal_style = ParagraphStyle('AppSeal', fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor('#64748B'), alignment=1)

    elements = []
    elements.append(Paragraph("CAMPUSX UNIVERSITY OF TECHNOLOGY", title_style))
    elements.append(Paragraph("OFFICE OF ACADEMIC AFFAIRS & STUDENT SERVICES", sub_title))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=14))

    # Ref & Date
    dt_str = approved_date.strftime("%B %d, %Y") if approved_date else datetime.now().strftime("%B %d, %Y")
    ref_data = [
        [
            Paragraph(f"<b>Dispatch Ref:</b> {application_number}", ref_style),
            Paragraph(f"<b>Date:</b> {dt_str}", ParagraphStyle('RDate', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=colors.HexColor('#475569'), alignment=2))
        ]
    ]
    ref_t = Table(ref_data, colWidths=[270, 250])
    elements.append(ref_t)
    elements.append(Spacer(1, 20))

    clean_type = application_type.replace('_', ' ').title()
    elements.append(Paragraph(f"<u>{clean_type.upper()}</u>", doc_type_style))
    elements.append(Spacer(1, 18))

    body_text = (
        f"This is to certify that <b>{student_name}</b>, bearing Roll Number <b>{roll_number}</b> "
        f"and Enrollment Number <b>{enrollment_number}</b>, is a bonafide student of "
        f"<b>{course_name}</b> in the Department of <b>{department_name}</b> at CampusX University "
        f"for the Academic Year <b>{academic_year}</b>."
    )
    elements.append(Paragraph(body_text, body_style))
    elements.append(Spacer(1, 12))

    if reason:
        reason_text = f"This document has been issued upon specific application by the student for the purpose of: <i>{reason}</i>."
        elements.append(Paragraph(reason_text, body_style))
        elements.append(Spacer(1, 12))

    if admin_remarks:
        remarks_text = f"<b>Administrative Endorsement:</b> {admin_remarks}"
        elements.append(Paragraph(remarks_text, body_style))
        elements.append(Spacer(1, 12))

    elements.append(Paragraph(
        "This official document is electronically generated and digitally validated from the central institutional records.",
        ParagraphStyle('Note', fontName='Helvetica-Oblique', fontSize=9, leading=13, textColor=colors.HexColor('#64748B'))
    ))
    elements.append(Spacer(1, 50))

    # Signatures
    sig_data = [
        [
            Paragraph("<b>[ INSTITUTIONAL SEAL ]</b><br/>CampusX University Registry", seal_style),
            Paragraph("<b>Registrar / Dean of Student Affairs</b><br/>CampusX University of Technology", ParagraphStyle('SigDean', fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#0F172A'), alignment=1))
        ]
    ]
    sig_table = Table(sig_data, colWidths=[260, 260])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    return str(pdf_path)


