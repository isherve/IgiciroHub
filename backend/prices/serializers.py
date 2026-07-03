from rest_framework import serializers

from .models import CoffeePrice


class CoffeePriceSerializer(serializers.ModelSerializer):
    coffee_type_display = serializers.CharField(source="get_coffee_type_display", read_only=True)
    price_type_display = serializers.CharField(source="get_price_type_display", read_only=True)
    cooperative_name = serializers.CharField(source="cooperative.cooperative_name", read_only=True, default=None)

    class Meta:
        model = CoffeePrice
        fields = (
            "id",
            "cooperative",
            "cooperative_name",
            "coffee_type",
            "coffee_type_display",
            "price_type",
            "price_type_display",
            "currency",
            "market_price",
            "recorded_date",
            "season",
            "market_trend",
        )
        read_only_fields = ("id",)


class TrendingPriceSerializer(serializers.Serializer):
    coffee_type = serializers.CharField()
    coffee_type_display = serializers.CharField()
    price_type = serializers.CharField()
    currency = serializers.CharField()
    latest_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    previous_price = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    change_pct = serializers.FloatField()
    market_trend = serializers.CharField()
    recorded_date = serializers.DateField()
