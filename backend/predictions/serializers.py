from rest_framework import serializers

from prices.constants import CoffeeType, PriceType

from .models import PredictionResult


class PredictRequestSerializer(serializers.Serializer):
    coffee_type = serializers.ChoiceField(choices=CoffeeType.choices)
    price_type = serializers.ChoiceField(choices=PriceType.choices, default=PriceType.FARMGATE)
    historical_period = serializers.ChoiceField(choices=[3, 6, 12], default=12)
    prediction_horizon = serializers.ChoiceField(choices=[7, 14, 30], default=30)


class PredictionResultSerializer(serializers.ModelSerializer):
    coffee_type_display = serializers.SerializerMethodField()
    price_type_display = serializers.SerializerMethodField()

    class Meta:
        model = PredictionResult
        fields = (
            "id",
            "coffee_type",
            "coffee_type_display",
            "price_type",
            "price_type_display",
            "currency",
            "current_price",
            "predicted_price",
            "predicted_price_low",
            "predicted_price_high",
            "change_pct",
            "horizon_days",
            "historical_period_months",
            "prediction_date",
            "algorithm_used",
            "accuracy_rate",
            "confidence",
            "recommendation",
        )
        read_only_fields = fields

    def get_coffee_type_display(self, obj):
        return dict(CoffeeType.choices).get(obj.coffee_type, obj.coffee_type)

    def get_price_type_display(self, obj):
        return dict(PriceType.choices).get(obj.price_type, obj.price_type)
