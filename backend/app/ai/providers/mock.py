"""
Deterministic Context-Grounded Mock AI Provider.
Generates evidence-backed answers utilizing database context without requiring external cloud LLM tokens.
"""

from typing import Any, Dict, List, Optional
from app.ai.base import BaseAIProvider


class MockAIProvider(BaseAIProvider):
    """
    Intelligent deterministic mock provider that reasons directly over supplied
    structured database context and query intent.
    """

    async def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        prompt_lower = prompt.lower()
        context = context or {}
        role = context.get("role", "STUDENT")

        if not context or (not context.get("student") and not context.get("faculty") and not context.get("admin")):
            return "Insufficient data available for this analysis. Please ensure relevant academic records are recorded."

        # Student Context Grounding
        if role == "STUDENT":
            student = context.get("student", {})
            name = student.get("name", "Student")
            att = student.get("attendance_pct", 100.0)
            cgpa = student.get("cgpa", 0.0)
            subjects = student.get("subjects", [])
            risk = student.get("risk_level", "LOW")
            weak_subjects = student.get("weak_subjects", [])

            if "attendance" in prompt_lower or "absent" in prompt_lower or "detention" in prompt_lower:
                if att < 75.0:
                    needed = max(1, int((75.0 - att) * 0.8))
                    return (
                        f"Hello {name}. According to institutional attendance logs, your cumulative attendance is currently "
                        f"**{att:.1f}%**, which is below the mandatory 75% institutional threshold. "
                        f"To restore your standing and avoid examination debarment, you must attend at least the next **{needed} classes** "
                        f"without absence. Please submit any medical or approved duty leaves to the Dean's office immediately."
                    )
                else:
                    return (
                        f"Hello {name}. Your overall attendance stands at a healthy **{att:.1f}%**, well above the 75% threshold. "
                        f"You have satisfied the minimum attendance criteria for the upcoming examinations."
                    )

            if "cgpa" in prompt_lower or "grade" in prompt_lower or "performance" in prompt_lower or "marks" in prompt_lower or "score" in prompt_lower:
                response = f"Hello {name}. Your current academic standing shows a CGPA of **{cgpa:.2f} / 10.0**.\n\n"
                if weak_subjects:
                    weak_str = ", ".join([f"{w['subject']} ({w['score']}%)" for w in weak_subjects])
                    response += (
                        f"⚠️ **Attention Required in Subject Areas:**\n"
                        f"Our performance intelligence engine has identified lower score margins in: **{weak_str}**.\n\n"
                        f"**Recommended Action:** Allocate at least 45 minutes daily to revision in these subjects and review previous semester question sets in the campus repository."
                    )
                else:
                    response += "You have maintained steady scores across all enrolled courses. Keep up the consistent pace!"
                return response

            if "risk" in prompt_lower or "warning" in prompt_lower or "failing" in prompt_lower:
                return (
                    f"Hello {name}. Your current Early Warning Risk Level is categorized as **{risk} RISK**.\n\n"
                    f"• Attendance: {att:.1f}%\n"
                    f"• CGPA: {cgpa:.2f}\n"
                    f"• Weak Areas: {len(weak_subjects)} flagged subject(s)\n\n"
                    f"If you need guidance, consider booking a mentoring session with your faculty advisor."
                )

            if "placement" in prompt_lower or "job" in prompt_lower or "interview" in prompt_lower:
                return (
                    f"Hello {name}. Based on your current CGPA of **{cgpa:.2f}**, you meet the eligibility criteria for "
                    f"most campus recruitment drives (typical cutoff: 6.5–7.5 CGPA). Check the **Placements** tab to view open drives and apply."
                )

            # General response
            return (
                f"Hello {name}. I am your CampusX AI Academic Companion. Based on your current semester data:\n"
                f"• Cumulative CGPA: **{cgpa:.2f}**\n"
                f"• Attendance: **{att:.1f}%**\n"
                f"• Monitored Status: **{risk} RISK**\n\n"
                f"How can I assist you with your coursework, attendance recovery, or exam preparation today?"
            )

        # Faculty Context Grounding
        elif role in ["FACULTY", "ADMIN", "SUPER_ADMIN"]:
            faculty = context.get("faculty", {})
            fac_name = faculty.get("name", "Professor")
            assigned_subjects = faculty.get("assigned_subjects", [])
            at_risk_students = faculty.get("at_risk_students", [])
            class_avg = faculty.get("class_attendance_avg", 80.0)

            if "risk" in prompt_lower or "at risk" in prompt_lower or "warning" in prompt_lower or "failing" in prompt_lower:
                if at_risk_students:
                    items = "\n".join([f"• **{s['name']}** ({s['roll_number']}) — {s['risk_level']} Risk (Attendance: {s['attendance_pct']}%, CGPA: {s['cgpa']})" for s in at_risk_students[:5]])
                    return (
                        f"Good day, {fac_name}. Analysis of your assigned sections indicates **{len(at_risk_students)} student(s)** flagged for early academic intervention:\n\n"
                        f"{items}\n\n"
                        f"**Suggested Strategy:** Schedule a group remedial tutorial and notify class advisors before upcoming midterms."
                    )
                else:
                    return f"Good day, {fac_name}. None of the students in your assigned subjects are currently flagged in the High or Moderate risk bands."

            if "attendance" in prompt_lower or "absent" in prompt_lower:
                return (
                    f"Good day, {fac_name}. The mean attendance across your teaching sections currently averages **{class_avg:.1f}%**. "
                    f"Daily attendance logs are synchronized with the university compliance system."
                )

            # Default faculty response
            subj_list = ", ".join([s.get("name", "") for s in assigned_subjects]) or "General Sciences"
            return (
                f"Good day, {fac_name}. I am your CampusX Faculty Teaching & Analytics Assistant.\n"
                f"• Assigned Courses: **{subj_list}**\n"
                f"• Monitored At-Risk Students: **{len(at_risk_students)}**\n"
                f"• Section Attendance Average: **{class_avg:.1f}%**\n\n"
                f"How can I assist you with lesson pacing, student remediation, or assessment grade distributions?"
            )

        return "I am the CampusX AI Assistant. How can I assist you with your campus activities?"

    async def generate_student_recommendations(
        self,
        student_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        att = student_data.get("attendance_pct", 100.0)
        cgpa = student_data.get("cgpa", 0.0)
        risk = student_data.get("risk_level", "LOW")

        recommendations = []
        if att < 75.0:
            recommendations.append("Prioritize attending next 10 consecutive lectures to escape attendance penalty zone.")
        if cgpa < 7.0:
            recommendations.append("Review foundational modules in Data Structures and Algorithms with designated peer tutors.")
        if risk == "HIGH":
            recommendations.append("Book an urgent one-on-one session with your academic advisor.")
        else:
            recommendations.append("Consider enrolling in advanced technical electives or competitive programming club.")

        return {
            "status": "success",
            "risk_level": risk,
            "recommendations": recommendations,
            "generated_by": "CampusX Grounded Analytics Model"
        }

    async def answer_rag_query(
        self,
        query: str,
        retrieved_documents: List[Dict[str, Any]],
        role: str
    ) -> Dict[str, Any]:
        if not retrieved_documents:
            return {
                "answer": "Insufficient verified institutional documentation found matching this inquiry. Please consult the Student Handbook or University Registrar.",
                "sources": [],
                "confidence": "LOW"
            }

        top_doc = retrieved_documents[0]
        title = top_doc.get("title", "Campus Policy")
        content = top_doc.get("content", "")

        answer = (
            f"Based on official CampusX institutional regulations ({title}):\n\n"
            f"{content[:400]}...\n\n"
            f"Please verify any specific exemptions with your department coordinator."
        )

        return {
            "answer": answer,
            "sources": [{"title": d.get("title"), "section": d.get("section", "General")} for d in retrieved_documents],
            "confidence": "HIGH"
        }
