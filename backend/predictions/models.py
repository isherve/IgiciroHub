from django.conf import settings
from django.db import models


class PredictionResult(models.Model):
    """Maps to the `Prediction Results` table; stores each served prediction."""

    price = models.ForeignKey(
        "prices.CoffeePrice",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="predictions",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="predictions",
    )
    coffee_type = models.CharField(max_length=32)
    price_type = models.CharField(max_length=20)
    currency = models.CharField(max_length=3, default="RWF")

    current_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    predicted_price = models.DecimalField(max_digits=12, decimal_places=2)
    predicted_price_low = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    predicted_price_high = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    change_pct = models.FloatField(default=0.0)

    horizon_days = models.PositiveIntegerField(default=30)
    historical_period_months = models.PositiveIntegerField(default=12)

    prediction_date = models.DateTimeField(auto_now_add=True)
    algorithm_used = models.CharField(max_length=50, default="random_forest")
    accuracy_rate = models.FloatField(null=True, blank=True)
    confidence = models.CharField(max_length=10, default="medium")
    recommendation = models.TextField(blank=True)

    class Meta:
        db_table = "prediction_results"
        ordering = ("-prediction_date",)

    def __str__(self):
        return f"{self.coffee_type}/{self.price_type} -> {self.predicted_price} ({self.prediction_date:%Y-%m-%d})"
