"""Shared choices for coffee domain, reused across prices/crops/predictions."""
from django.db import models


class CoffeeType(models.TextChoices):
    RED_BOURBON = "red_bourbon", "Red Bourbon"
    ARABICA = "arabica", "Arabica"
    BOURBON_MAYAGUEZ = "bourbon_mayaguez", "Bourbon Mayaguez"
    JACKSON = "jackson", "Jackson"
    ROBUSTA = "robusta", "Robusta"


class PriceType(models.TextChoices):
    FARMGATE = "farmgate", "Farm Gate"
    COOPERATIVE = "cooperative", "Cooperative"
    EXPORT = "export", "Export (USD)"


class Currency(models.TextChoices):
    RWF = "RWF", "Rwandan Franc"
    USD = "USD", "US Dollar"


class MarketTrend(models.TextChoices):
    UP = "up", "Rising"
    DOWN = "down", "Falling"
    STABLE = "stable", "Stable"


class Season(models.TextChoices):
    MAIN_HARVEST = "main_harvest", "Main Harvest (Mar-Jul)"
    FLY_CROP = "fly_crop", "Fly Crop (Sep-Dec)"
    OFF_SEASON = "off_season", "Off Season"


def season_for_month(month: int) -> str:
    """Map a calendar month to a Rwandan coffee season."""
    if 3 <= month <= 7:
        return Season.MAIN_HARVEST
    if 9 <= month <= 12:
        return Season.FLY_CROP
    return Season.OFF_SEASON
