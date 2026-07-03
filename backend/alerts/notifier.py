"""
Multi-channel notification delivery: in-app (always), plus email and SMS
according to the user's preferences. SMS uses Africa's Talking (Rwanda);
both email and SMS degrade gracefully if not configured.
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _send_email(user, message: str) -> bool:
    if not user.email:
        return False
    try:
        send_mail(
            subject="IgiciroHub price alert",
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@igicirohub.rw"),
            recipient_list=[user.email],
            fail_silently=True,
        )
        return True
    except Exception:  # noqa: BLE001 - never let notifications crash a request
        logger.exception("Email notification failed")
        return False


def _send_sms(user, message: str) -> bool:
    api_key = getattr(settings, "AT_API_KEY", "")
    if not api_key or not user.phone_number:
        return False
    try:
        import africastalking

        africastalking.initialize(settings.AT_USERNAME, api_key)
        sms = africastalking.SMS
        sender = getattr(settings, "AT_SENDER_ID", "") or None
        sms.send(message, [user.phone_number], sender_id=sender)
        return True
    except Exception:  # noqa: BLE001
        logger.exception("SMS notification failed")
        return False


def notify(user, message: str, *, create_in_app: bool = True):
    """Create an in-app Notification and fan out to email/SMS per preferences."""
    from .models import Notification

    note = None
    if create_in_app and getattr(user, "notify_in_app", True):
        note = Notification.objects.create(user=user, notification_message=message)
    deliver(user, message)
    return note


def deliver(user, message: str):
    """Send email/SMS according to preferences (no in-app row)."""
    channels = []
    if getattr(user, "notify_email", False) and _send_email(user, message):
        channels.append("email")
    if getattr(user, "notify_sms", False) and _send_sms(user, message):
        channels.append("sms")
    return channels
