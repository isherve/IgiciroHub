from django.conf import settings
from django.db import models

from prices.constants import CoffeeType, PriceType


class Notification(models.Model):
    """Maps to the `Notifications` table."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_message = models.TextField()
    notification_date = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "notifications"
        ordering = ("-notification_date",)

    def __str__(self):
        return f"Notification#{self.pk} -> {self.user_id}"


class PriceAlert(models.Model):
    """A user's price-alert subscription."""

    class Direction(models.TextChoices):
        ABOVE = "above", "Rises above"
        BELOW = "below", "Falls below"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="price_alerts",
    )
    coffee_type = models.CharField(max_length=32, choices=CoffeeType.choices)
    price_type = models.CharField(max_length=20, choices=PriceType.choices, default=PriceType.FARMGATE)
    threshold = models.DecimalField(max_digits=12, decimal_places=2)
    direction = models.CharField(max_length=6, choices=Direction.choices, default=Direction.ABOVE)
    is_active = models.BooleanField(default=True)
    last_triggered = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "price_alerts"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user_id}: {self.coffee_type}/{self.price_type} {self.direction} {self.threshold}"

    def is_met(self, current_price: float) -> bool:
        if self.direction == self.Direction.ABOVE:
            return current_price >= float(self.threshold)
        return current_price <= float(self.threshold)
