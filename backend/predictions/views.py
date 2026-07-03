import json

from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from prices.constants import CoffeeType, PriceType

from .ml import predictor
from .ml.config import FEATURE_IMPORTANCE_JSON
from .ml.predictor import ModelNotTrained
from .models import PredictionResult
from .notifications import maybe_notify
from .recommendations import build_recommendation
from .serializers import PredictionResultSerializer, PredictRequestSerializer
from .services import accuracy_for, currency_for, get_recent_prices


class PredictView(APIView):
    """POST /api/predictions/predict/ — the flagship prediction endpoint."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "predict"

    def post(self, request):
        serializer = PredictRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        coffee_type = data["coffee_type"]
        price_type = data["price_type"]
        months = int(data["historical_period"])
        horizon = int(data["prediction_horizon"])
        currency = currency_for(price_type)

        try:
            recent, last_month, last_month_index = get_recent_prices(coffee_type, price_type, months)
            result = predictor.predict(
                coffee_type=coffee_type,
                price_type=price_type,
                recent_prices=recent,
                horizon_days=horizon,
                last_month=last_month,
                last_month_index=last_month_index,
            )
        except ModelNotTrained as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        accuracy = accuracy_for(price_type)
        recommendation = build_recommendation(
            coffee_type_display=dict(CoffeeType.choices).get(coffee_type, coffee_type),
            price_type_display=dict(PriceType.choices).get(price_type, price_type),
            current_price=result["current_price"],
            predicted_price=result["predicted_price"],
            change_pct=result["change_pct"],
            horizon_days=horizon,
            currency=currency,
            confidence=result["confidence"],
        )

        prediction = PredictionResult.objects.create(
            requested_by=request.user,
            coffee_type=coffee_type,
            price_type=price_type,
            currency=currency,
            current_price=result["current_price"],
            predicted_price=result["predicted_price"],
            predicted_price_low=result["predicted_price_low"],
            predicted_price_high=result["predicted_price_high"],
            change_pct=result["change_pct"],
            horizon_days=horizon,
            historical_period_months=months,
            algorithm_used=result["method"],
            accuracy_rate=accuracy,
            confidence=result["confidence"],
            recommendation=recommendation,
        )

        maybe_notify(request.user, prediction)
        return Response(PredictionResultSerializer(prediction).data, status=status.HTTP_201_CREATED)


class PredictionHistoryView(ListAPIView):
    serializer_class = PredictionResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PredictionResult.objects.filter(requested_by=self.request.user)
        if self.request.query_params.get("coffee_type"):
            qs = qs.filter(coffee_type=self.request.query_params["coffee_type"])
        return qs


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def feature_importance(request):
    """GET /api/predictions/feature-importance/ — what drives the price."""
    if not FEATURE_IMPORTANCE_JSON.exists():
        return Response(
            {"detail": "Feature importance not available. Train the model first."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(json.loads(FEATURE_IMPORTANCE_JSON.read_text()))
