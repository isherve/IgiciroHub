"""
Seed demo data so the "Demo Login (cooperative)" button and the Dashboard
work out of the box.

Creates:
  * a demo cooperative account (demo@igicirohub.rw / Demo1234!) + profile
  * a demo buyer account (buyer@igicirohub.rw / Demo1234!)
  * ~24 months of coffee prices per variety/price-type (from the synthetic
    dataset) so trending prices and charts have data
  * a few marketplace listings
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from alerts.models import Notification
from cooperatives.models import Cooperative
from crops.models import CropListing
from prices.constants import Currency, MarketTrend, PriceType, season_for_month
from prices.models import CoffeePrice
from predictions.ml.dataset import ensure_dataset

User = get_user_model()

DEMO_COOP_EMAIL = "demo@igicirohub.rw"
DEMO_BUYER_EMAIL = "buyer@igicirohub.rw"
DEMO_PASSWORD = "Demo1234!"


class Command(BaseCommand):
    help = "Seed demo users, coffee prices, and marketplace listings."

    def add_arguments(self, parser):
        parser.add_argument("--months", type=int, default=24, help="Months of price history to seed.")

    def handle(self, *args, **options):
        months = options["months"]

        coop_user, created = User.objects.get_or_create(
            email=DEMO_COOP_EMAIL,
            defaults={
                "full_name": "Huye Mountain Coffee Cooperative",
                "role": User.Role.COOPERATIVE,
                "phone_number": "+250788000001",
                "notify_in_app": True,
            },
        )
        if created:
            coop_user.set_password(DEMO_PASSWORD)
            coop_user.save()
        self.stdout.write(f"Cooperative user: {coop_user.email} ({'created' if created else 'exists'})")

        coop, _ = Cooperative.objects.get_or_create(
            owner=coop_user,
            defaults={
                "cooperative_name": "Huye Mountain Coffee Cooperative",
                "location": "Huye, Southern Province",
                "contact_info": "+250788000001",
                "description": "Specialty Arabica washing station cooperative in Huye.",
            },
        )

        buyer_user, b_created = User.objects.get_or_create(
            email=DEMO_BUYER_EMAIL,
            defaults={
                "full_name": "Kigali Coffee Traders Ltd",
                "role": User.Role.BUYER,
                "phone_number": "+250788000002",
            },
        )
        if b_created:
            buyer_user.set_password(DEMO_PASSWORD)
            buyer_user.save()
        self.stdout.write(f"Buyer user: {buyer_user.email} ({'created' if b_created else 'exists'})")

        # ---- Prices ----------------------------------------------------
        if CoffeePrice.objects.exists():
            self.stdout.write("Coffee prices already present; skipping price seed.")
        else:
            self._seed_prices(coop, months)

        # ---- Listings --------------------------------------------------
        if not CropListing.objects.filter(cooperative=coop).exists():
            self._seed_listings(coop)

        Notification.objects.get_or_create(
            user=coop_user,
            notification_message="Welcome to IgiciroHub! Your demo cooperative is ready.",
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        self.stdout.write(f"  Demo cooperative login: {DEMO_COOP_EMAIL} / {DEMO_PASSWORD}")
        self.stdout.write(f"  Demo buyer login:       {DEMO_BUYER_EMAIL} / {DEMO_PASSWORD}")

    def _seed_prices(self, coop, months):
        df = ensure_dataset()
        df = df.sort_values("date")
        created = 0
        for (coffee_type, price_type), grp in df.groupby(["coffee_type", "price_type"]):
            tail = grp.tail(months).reset_index(drop=True)
            currency = Currency.USD if price_type == PriceType.EXPORT else Currency.RWF
            prev_price = None
            for _, row in tail.iterrows():
                d = row["date"]
                d = d.date() if hasattr(d, "date") else d
                price = float(row["price"])
                if prev_price is None:
                    trend = MarketTrend.STABLE
                elif price > prev_price * 1.01:
                    trend = MarketTrend.UP
                elif price < prev_price * 0.99:
                    trend = MarketTrend.DOWN
                else:
                    trend = MarketTrend.STABLE
                CoffeePrice.objects.create(
                    cooperative=coop if price_type != PriceType.EXPORT else None,
                    coffee_type=coffee_type,
                    price_type=price_type,
                    currency=currency,
                    market_price=round(price, 2),
                    recorded_date=d,
                    season=season_for_month(d.month),
                    market_trend=trend,
                )
                prev_price = price
                created += 1
        self.stdout.write(f"Seeded {created} coffee price records.")

    def _seed_listings(self, coop):
        listings = [
            ("red_bourbon", CropListing.Grade.AA, 2000, 2100, "Huye, Southern Province"),
            ("arabica", CropListing.Grade.A, 1500, 1950, "Huye, Southern Province"),
            ("bourbon_mayaguez", CropListing.Grade.AA, 900, 2050, "Nyamagabe, Southern Province"),
        ]
        for coffee_type, grade, qty, price, loc in listings:
            CropListing.objects.create(
                cooperative=coop,
                coffee_type=coffee_type,
                quality_grade=grade,
                quantity_kg=qty,
                price_per_kg=price,
                currency="RWF",
                location=loc,
                description=f"Freshly processed {coffee_type.replace('_', ' ')} from our washing station.",
                is_available=True,
            )
        self.stdout.write("Seeded 3 marketplace listings.")
