from django.contrib import admin

from .models import PredictionResult


@admin.register(PredictionResult)
class PredictionResultAdmin(admin.ModelAdmin):
    list_display = (
        "coffee_type",
        "price_type",
        "current_price",
        "predicted_price",
        "change_pct",
        "confidence",
        "prediction_date",
        "requested_by",
    )
    list_filter = ("coffee_type", "price_type", "confidence", "algorithm_used")
    date_hierarchy = "prediction_date"
