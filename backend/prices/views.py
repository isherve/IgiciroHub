from django.db.models import Avg, Max
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsCooperativeOrReadOnly

from .constants import CoffeeType, PriceType
from .models import CoffeePrice
from .serializers import CoffeePriceSerializer, TrendingPriceSerializer


class CoffeePriceViewSet(viewsets.ModelViewSet):
    """
    Historical + current coffee prices. Reading is open (guest browse);
    creating/updating is restricted to cooperative accounts.
    """

    queryset = CoffeePrice.objects.select_related("cooperative").all()
    serializer_class = CoffeePriceSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "trending", "seasonal", "history"):
            return [permissions.AllowAny()]
        return [IsCooperativeOrReadOnly()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        for field in ("coffee_type", "price_type", "currency"):
            if params.get(field):
                qs = qs.filter(**{field: params[field]})
        if params.get("cooperative"):
            qs = qs.filter(cooperative_id=params["cooperative"])
        return qs

    def perform_create(self, serializer):
        coop = getattr(self.request.user, "cooperative", None)
        if not coop:
            raise PermissionDenied("Only a cooperative account can add prices.")
        if serializer.validated_data.get("price_type") == PriceType.EXPORT:
            raise PermissionDenied("Export reference prices are managed globally.")
        serializer.save(cooperative=coop)

    def _assert_owner(self, instance):
        coop = getattr(self.request.user, "cooperative", None)
        if not coop:
            raise PermissionDenied("Only a cooperative account can manage prices.")
        if instance.cooperative_id is None:
            raise PermissionDenied("Global reference prices cannot be edited.")
        if instance.cooperative_id != coop.id:
            raise PermissionDenied("You can only manage your own cooperative's prices.")

    def perform_update(self, serializer):
        self._assert_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_owner(instance)
        instance.delete()

    @action(detail=False, methods=["get"])
    def history(self, request):
        """
        Time-ordered price series for charting.
        Query: coffee_type, price_type, currency, months (default 12).
        """
        qs = self.get_queryset().order_by("recorded_date")
        try:
            months = int(request.query_params.get("months", 12))
        except ValueError:
            months = 12
        from datetime import date, timedelta

        cutoff = date.today() - timedelta(days=months * 31)
        qs = qs.filter(recorded_date__gte=cutoff)
        serializer = CoffeePriceSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def trending(self, request):
        """
        Latest price per (coffee_type, price_type) with % change vs the
        previous record — powers the Dashboard "Trending Prices" section.
        """
        results = []
        combos = (
            CoffeePrice.objects.order_by()  # clear default ordering so DISTINCT collapses
            .values_list("coffee_type", "price_type", "currency")
            .distinct()
        )
        for coffee_type, price_type, currency in combos:
            series = list(
                CoffeePrice.objects.filter(
                    coffee_type=coffee_type, price_type=price_type, currency=currency
                ).order_by("-recorded_date")[:2]
            )
            if not series:
                continue
            latest = series[0]
            previous = series[1] if len(series) > 1 else None
            change_pct = 0.0
            if previous and previous.market_price:
                change_pct = float(
                    (latest.market_price - previous.market_price) / previous.market_price * 100
                )
            results.append(
                {
                    "coffee_type": coffee_type,
                    "coffee_type_display": dict(CoffeeType.choices).get(coffee_type, coffee_type),
                    "price_type": price_type,
                    "currency": currency,
                    "latest_price": latest.market_price,
                    "previous_price": previous.market_price if previous else None,
                    "change_pct": round(change_pct, 2),
                    "market_trend": latest.market_trend,
                    "recorded_date": latest.recorded_date,
                }
            )
        results.sort(key=lambda r: abs(r["change_pct"]), reverse=True)
        return Response(TrendingPriceSerializer(results, many=True).data)

    @action(detail=False, methods=["get"])
    def seasonal(self, request):
        """Average price per season for a coffee/price type."""
        qs = self.get_queryset()
        data = (
            qs.values("season")
            .annotate(avg_price=Avg("market_price"), latest=Max("recorded_date"))
            .order_by("season")
        )
        return Response(list(data))
