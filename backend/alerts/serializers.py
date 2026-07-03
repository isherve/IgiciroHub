from rest_framework import serializers

from prices.constants import CoffeeType, PriceType

from .models import Notification, PriceAlert


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "notification_message", "notification_date", "is_read")
        read_only_fields = ("id", "notification_message", "notification_date")


class PriceAlertSerializer(serializers.ModelSerializer):
    coffee_type_display = serializers.SerializerMethodField()
    price_type_display = serializers.SerializerMethodField()

    class Meta:
        model = PriceAlert
        fields = (
            "id",
            "coffee_type",
            "coffee_type_display",
            "price_type",
            "price_type_display",
            "threshold",
            "direction",
            "is_active",
            "last_triggered",
            "created_at",
        )
        read_only_fields = ("id", "last_triggered", "created_at")

    def get_coffee_type_display(self, obj):
        return dict(CoffeeType.choices).get(obj.coffee_type, obj.coffee_type)

    def get_price_type_display(self, obj):
        return dict(PriceType.choices).get(obj.price_type, obj.price_type)
