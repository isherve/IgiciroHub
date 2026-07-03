"""
Evaluate active price alerts against the latest prices and fire notifications.

For the MVP this is run on a schedule via cron / Task Scheduler, e.g.:
    python manage.py check_alerts
(Swap for Celery beat in production.)
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from alerts.models import PriceAlert
from alerts.notifier import notify
from prices.models import CoffeePrice


class Command(BaseCommand):
    help = "Check active price alerts against the latest recorded prices and notify users."

    def handle(self, *args, **options):
        active = PriceAlert.objects.filter(is_active=True).select_related("user")
        fired = 0

        # Cache the latest price per (coffee_type, price_type).
        latest_cache: dict[tuple[str, str], float] = {}

        for alert in active:
            key = (alert.coffee_type, alert.price_type)
            if key not in latest_cache:
                latest = (
                    CoffeePrice.objects.filter(
                        coffee_type=alert.coffee_type, price_type=alert.price_type
                    )
                    .order_by("-recorded_date")
                    .first()
                )
                latest_cache[key] = float(latest.market_price) if latest else None

            current = latest_cache[key]
            if current is None:
                continue

            if alert.is_met(current):
                direction = "risen above" if alert.direction == PriceAlert.Direction.ABOVE else "fallen below"
                message = (
                    f"Price alert: {alert.coffee_type} ({alert.price_type}) has {direction} "
                    f"your threshold of {alert.threshold}. Current: {current}."
                )
                notify(alert.user, message)
                alert.last_triggered = timezone.now()
                alert.save(update_fields=["last_triggered"])
                fired += 1

        self.stdout.write(self.style.SUCCESS(f"Checked {active.count()} alerts, fired {fired} notifications."))
