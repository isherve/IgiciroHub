from django.db import models

from .constants import Currency, CoffeeType, MarketTrend, PriceType, Season


class CoffeePrice(models.Model):
    """Maps to the `Coffee Prices` table (historical + current prices)."""

    cooperative = models.ForeignKey(
        "cooperatives.Cooperative",
        on_delete=models.CASCADE,
        related_name="prices",
        null=True,
        blank=True,
    )
    coffee_type = models.CharField(max_length=32, choices=CoffeeType.choices)
    price_type = models.CharField(max_length=20, choices=PriceType.choices, default=PriceType.FARMGATE)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.RWF)
    market_price = models.DecimalField(max_digits=12, decimal_places=2)
    recorded_date = models.DateField()
    season = models.CharField(max_length=20, choices=Season.choices, blank=True)
    market_trend = models.CharField(max_length=10, choices=MarketTrend.choices, default=MarketTrend.STABLE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coffee_prices"
        ordering = ("-recorded_date",)
        indexes = [
            models.Index(fields=["coffee_type", "price_type", "recorded_date"]),
        ]

    def __str__(self):
        return f"{self.get_coffee_type_display()} {self.price_type} {self.market_price}{self.currency} @ {self.recorded_date}"
