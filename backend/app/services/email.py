import logging
from typing import List, Optional
from app.config import settings

logger = logging.getLogger(__name__)


def send_status_change_email(
    resident_email: str,
    resident_name: str,
    complaint_id: int,
    category: str,
    old_status: str,
    new_status: str,
    note: Optional[str],
) -> bool:
    """
    Send email when a complaint status changes.
    Returns True if sent successfully, False otherwise.
    Email failure does NOT propagate — caller should handle gracefully.
    """
    if not settings.resend_configured:
        logger.info(
            f"[EMAIL SKIPPED] Resend not configured. "
            f"Would have emailed {resident_email} about complaint #{complaint_id} status change."
        )
        return False

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY

        note_section = f"<p><strong>Note:</strong> {note}</p>" if note else ""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">{settings.APP_NAME}</h2>
            <h3>Complaint Status Update</h3>
            <p>Dear {resident_name},</p>
            <p>The status of your complaint has been updated.</p>
            <table style="border-collapse: collapse; width: 100%;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Complaint ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">#{complaint_id}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Category</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{category.replace('_', ' ').title()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Previous Status</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{old_status.replace('_', ' ').title()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>New Status</strong></td><td style="padding: 8px; border: 1px solid #ddd;"><strong style="color: #16a34a;">{new_status.replace('_', ' ').title()}</strong></td></tr>
            </table>
            {note_section}
            <p>Thank you for using {settings.APP_NAME}.</p>
        </div>
        """

        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [resident_email],
            "subject": f"[{settings.APP_NAME}] Complaint #{complaint_id} Status Updated",
            "html": html,
        })
        logger.info(f"[EMAIL SENT] Status change email sent to {resident_email} for complaint #{complaint_id}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL FAILED] Could not send status change email to {resident_email}: {e}")
        return False


def send_important_notice_email(
    resident_emails: List[str],
    notice_title: str,
    notice_content: str,
) -> bool:
    """
    Send email to all residents when an important notice is created.
    Returns True if sent successfully, False otherwise.
    """
    if not settings.resend_configured:
        logger.info(
            f"[EMAIL SKIPPED] Resend not configured. "
            f"Would have emailed {len(resident_emails)} residents about important notice: '{notice_title}'"
        )
        return False

    if not resident_emails:
        return True

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">{settings.APP_NAME}</h2>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 16px;">
                <strong>⚠️ Important Notice</strong>
            </div>
            <h3>{notice_title}</h3>
            <div style="line-height: 1.6;">{notice_content}</div>
            <hr style="margin: 24px 0;">
            <p style="color: #6b7280; font-size: 0.875rem;">
                This is an automated notification from {settings.APP_NAME}.
            </p>
        </div>
        """

        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": resident_emails,
            "subject": f"[{settings.APP_NAME}] Important Notice: {notice_title}",
            "html": html,
        })
        logger.info(f"[EMAIL SENT] Important notice email sent to {len(resident_emails)} residents.")
        return True
    except Exception as e:
        logger.error(f"[EMAIL FAILED] Could not send important notice email: {e}")
        return False
