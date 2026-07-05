from datetime import timedelta

from django.db.models import Avg, Count, Max, Min, Q, Sum
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from alerts.models import Notification, PriceAlert
from chat.models import Conversation, Message
from cooperatives.models import Cooperative
from crops.models import CropListing
from predictions.models import PredictionResult
from prices.constants import CoffeeType, MarketTrend, PriceType
from prices.models import CoffeePrice


class AnalyticsOverviewView(APIView):
    """GET /api/analytics/overview/ — platform-wide stats for dashboards."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "analytics"

    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        counts = {
            "cooperatives": Cooperative.objects.count(),
            "buyers": User.objects.filter(role=User.Role.BUYER).count(),
            "listings": CropListing.objects.filter(is_available=True).count(),
            "total_listings": CropListing.objects.count(),
            "price_records": CoffeePrice.objects.count(),
            "predictions": PredictionResult.objects.count(),
            "predictions_this_week": PredictionResult.objects.filter(
                prediction_date__gte=week_ago
            ).count(),
            "conversations": Conversation.objects.count(),
            "messages": Message.objects.count(),
            "active_alerts": PriceAlert.objects.filter(is_active=True).count(),
            "notifications": Notification.objects.count(),
        }

        latest_farmgate = []
        for coffee_type in CoffeeType.values:
            row = (
                CoffeePrice.objects.filter(
                    coffee_type=coffee_type,
                    price_type=PriceType.FARMGATE,
                    currency="RWF",
                )
                .order_by("-recorded_date")
                .first()
            )
            if row:
                latest_farmgate.append(float(row.market_price))
        farmgate_avg = sum(latest_farmgate) / len(latest_farmgate) if latest_farmgate else 0

        latest_export = []
        for coffee_type in CoffeeType.values:
            row = (
                CoffeePrice.objects.filter(
                    coffee_type=coffee_type,
                    price_type=PriceType.EXPORT,
                    currency="USD",
                )
                .order_by("-recorded_date")
                .first()
            )
            if row:
                latest_export.append(float(row.market_price))
        export_avg = sum(latest_export) / len(latest_export) if latest_export else 0

        trend_counts = dict(
            CoffeePrice.objects.filter(recorded_date__gte=month_ago)
            .values("market_trend")
            .annotate(n=Count("id"))
            .values_list("market_trend", "n")
        )

        by_variety = []
        for coffee_type, label in CoffeeType.choices:
            stats = CropListing.objects.filter(
                coffee_type=coffee_type, is_available=True
            ).aggregate(
                listings=Count("id"),
                avg_price=Avg("price_per_kg"),
                total_kg=Avg("quantity_kg"),
            )
            price_stats = CoffeePrice.objects.filter(
                coffee_type=coffee_type,
                price_type=PriceType.FARMGATE,
            ).aggregate(
                avg=Avg("market_price"),
                min=Min("market_price"),
                max=Max("market_price"),
            )
            by_variety.append(
                {
                    "coffee_type": coffee_type,
                    "label": label,
                    "listings": stats["listings"] or 0,
                    "avg_listing_price": float(stats["avg_price"] or 0),
                    "avg_farmgate": float(price_stats["avg"] or 0),
                    "min_farmgate": float(price_stats["min"] or 0),
                    "max_farmgate": float(price_stats["max"] or 0),
                }
            )

        by_region = []
        for row in (
            Cooperative.objects.exclude(location="")
            .values("location")
            .annotate(
                cooperatives=Count("id"),
                listings=Count("listings", filter=Q(listings__is_available=True)),
            )
            .order_by("-listings")[:8]
        ):
            by_region.append(
                {
                    "region": row["location"],
                    "cooperatives": row["cooperatives"],
                    "listings": row["listings"],
                }
            )

        pred_stats = PredictionResult.objects.aggregate(
            avg_accuracy=Avg("accuracy_rate"),
            avg_change=Avg("change_pct"),
        )
        prediction_summary = {
            "avg_accuracy": round(float(pred_stats["avg_accuracy"] or 0), 1),
            "avg_change_pct": round(float(pred_stats["avg_change"] or 0), 2),
            "rising": PredictionResult.objects.filter(change_pct__gt=0).count(),
            "falling": PredictionResult.objects.filter(change_pct__lt=0).count(),
            "stable": PredictionResult.objects.filter(change_pct=0).count(),
        }

        recent_activity = self._recent_activity(limit=12)

        marketplace_volume = CropListing.objects.filter(is_available=True).aggregate(
            total_kg=Sum("quantity_kg"),
            avg_price=Avg("price_per_kg"),
        )

        return Response(
            {
                "counts": counts,
                "market": {
                    "avg_farmgate_rwf": round(farmgate_avg, 2),
                    "avg_export_usd": round(export_avg, 2),
                    "trends": {
                        "up": trend_counts.get(MarketTrend.UP, 0),
                        "down": trend_counts.get(MarketTrend.DOWN, 0),
                        "stable": trend_counts.get(MarketTrend.STABLE, 0),
                    },
                },
                "marketplace": {
                    "total_kg_available": float(marketplace_volume["total_kg"] or 0),
                    "avg_price_per_kg": float(marketplace_volume["avg_price"] or 0),
                },
                "by_variety": by_variety,
                "by_region": by_region,
                "prediction_summary": prediction_summary,
                "recent_activity": recent_activity,
                "generated_at": now.isoformat(),
            }
        )

    def _recent_activity(self, limit: int):
        items = []

        coffee_labels = dict(CoffeeType.choices)
        price_labels = dict(PriceType.choices)

        for p in PredictionResult.objects.select_related("requested_by").order_by(
            "-prediction_date"
        )[:5]:
            items.append(
                {
                    "type": "prediction",
                    "title": f"{coffee_labels.get(p.coffee_type, p.coffee_type)} · {price_labels.get(p.price_type, p.price_type)}",
                    "detail": f"Predicted {float(p.predicted_price):,.0f} {p.currency} ({p.change_pct:+.1f}%)",
                    "timestamp": p.prediction_date.isoformat(),
                }
            )

        for listing in CropListing.objects.select_related("cooperative").order_by(
            "-created_at"
        )[:5]:
            items.append(
                {
                    "type": "listing",
                    "title": listing.get_coffee_type_display(),
                    "detail": f"{listing.cooperative.cooperative_name} · {float(listing.quantity_kg):,.0f} kg",
                    "timestamp": listing.created_at.isoformat(),
                }
            )

        for msg in Message.objects.select_related(
            "conversation__cooperative", "sender"
        ).order_by("-interaction_date")[:5]:
            coop_name = msg.conversation.cooperative.cooperative_name
            items.append(
                {
                    "type": "message",
                    "title": f"Chat · {coop_name}",
                    "detail": "New marketplace message",
                    "timestamp": msg.interaction_date.isoformat(),
                }
            )

        items.sort(key=lambda x: x["timestamp"], reverse=True)
        return items[:limit]
