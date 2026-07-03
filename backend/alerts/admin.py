from django.contrib import admin

from .models import Notification, PriceAlert


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "notification_message", "is_read", "notification_date")
    list_filter = ("is_read",)


@admin.register(PriceAlert)
class PriceAlertAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "coffee_type", "price_type", "direction", "threshold", "is_active")
    list_filter = ("coffee_type", "price_type", "direction", "is_active")
