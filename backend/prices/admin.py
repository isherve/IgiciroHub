from django.contrib import admin

from .models import CoffeePrice


@admin.register(CoffeePrice)
class CoffeePriceAdmin(admin.ModelAdmin):
    list_display = (
        "coffee_type",
        "price_type",
        "currency",
        "market_price",
        "recorded_date",
        "market_trend",
        "cooperative",
    )
    list_filter = ("coffee_type", "price_type", "currency", "market_trend", "season")
    date_hierarchy = "recorded_date"
    search_fields = ("coffee_type",)
