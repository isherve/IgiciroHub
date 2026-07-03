"""
Prediction notifications sub-module.

Auto-generates an in-app Notification (and optional email/SMS via the user's
preferences) when a served prediction crosses a significant change threshold.
"""
from __future__ import annotations

from django.conf import settings


def maybe_notify(user, prediction) -> bool:
    """Create a notification if |change_pct| >= configured threshold."""
    if user is None:
        return False
    threshold = getattr(settings, "PREDICTION_NOTIFY_THRESHOLD_PCT", 5.0)
    if abs(prediction.change_pct) < threshold:
        return False

    # Local import avoids app-loading cycles.
    from alerts.models import Notification
    from alerts.notifier import deliver

    direction = "increase" if prediction.change_pct > 0 else "drop"
    message = (
        f"Predicted {direction} of {abs(prediction.change_pct):.1f}% for "
        f"{prediction.coffee_type} ({prediction.price_type}) over "
        f"{prediction.horizon_days} days: {prediction.predicted_price} {prediction.currency}."
    )
    note = Notification.objects.create(user=user, notification_message=message)
    deliver(user, message)
    return True
