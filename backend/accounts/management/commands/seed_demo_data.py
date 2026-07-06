"""
Seed demo data so the "Demo Login (cooperative)" button and the Dashboard
work out of the box.

Creates:
  * demo cooperative + buyer accounts
  * ~24 months of coffee prices (global export + per-coop farmgate/cooperative)
  * marketplace listings across multiple Rwandan cooperatives
  * sample predictions, chats, alerts, and notifications for analytics
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from alerts.models import Notification, PriceAlert
from chat.models import Conversation, Message
from cooperatives.models import Cooperative
from crops.models import CropListing
from predictions.models import PredictionResult
from prices.constants import CoffeeType, Currency, MarketTrend, PriceType, season_for_month
from prices.models import CoffeePrice
from predictions.ml.dataset import ensure_dataset

User = get_user_model()

DEMO_COOP_EMAIL = "demo@igicirohub.rw"
DEMO_BUYER_EMAIL = "buyer@igicirohub.rw"
DEMO_ADMIN_EMAIL = "admin@igicirohub.rw"
DEMO_PASSWORD = "Demo1234!"

EXTRA_COOPS = [
    (
        "gakenke@igicirohub.rw",
        "Gakenke Highlands Coffee",
        "Gakenke, Northern Province",
        "Washed Arabica from the volcanic slopes of Gakenke.",
    ),
    (
        "nyamasheke@igicirohub.rw",
        "Nyamasheke Lake Coffee Union",
        "Nyamasheke, Western Province",
        "Lake Kivu micro-lots with bright citrus notes.",
    ),
    (
        "rubavu@igicirohub.rw",
        "Rubavu Border Coop",
        "Rubavu, Western Province",
        "Fair-trade certified cooperative near Lake Kivu.",
    ),
    (
        "nyamagabe@igicirohub.rw",
        "Nyamagabe Hill Farmers",
        "Nyamagabe, Southern Province",
        "High-altitude Bourbon from Nyamagabe hills.",
    ),
    (
        "rulindo@igicirohub.rw",
        "Rulindo Women Coffee Collective",
        "Rulindo, Northern Province",
        "Women-led collective focusing on specialty grades.",
    ),
    (
        "karongi@igicirohub.rw",
        "Karongi Kivu Coffee",
        "Karongi, Western Province",
        "Sun-dried naturals and honey-process lots.",
    ),
]

EXTRA_BUYERS = [
    ("trader@igicirohub.rw", "East Africa Coffee Exports", "+250788000010"),
    ("roaster@igicirohub.rw", "Kigali Specialty Roasters", "+250788000011"),
    ("export@igicirohub.rw", "Global Bean Trading Co.", "+250788000012"),
]

LISTING_TEMPLATES = [
    ("red_bourbon", CropListing.Grade.AA, 1800, 2150),
    ("arabica", CropListing.Grade.A, 2200, 1980),
    ("bourbon_mayaguez", CropListing.Grade.AA, 1200, 2080),
    ("jackson", CropListing.Grade.A, 900, 1920),
    ("robusta", CropListing.Grade.B, 3500, 1450),
    ("red_bourbon", CropListing.Grade.A, 1500, 2050),
    ("arabica", CropListing.Grade.AA, 800, 2200),
]


class Command(BaseCommand):
    help = "Seed demo users, coffee prices, marketplace listings, and analytics data."

    def add_arguments(self, parser):
        parser.add_argument("--months", type=int, default=24, help="Months of price history to seed.")

    def handle(self, *args, **options):
        months = options["months"]
        random.seed(42)

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

        admin_user, a_created = User.objects.get_or_create(
            email=DEMO_ADMIN_EMAIL,
            defaults={
                "full_name": "IgiciroHub Platform Admin",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "phone_number": "+250788000099",
            },
        )
        if a_created:
            admin_user.set_password(DEMO_PASSWORD)
            admin_user.save()
        elif not admin_user.is_staff or admin_user.role != User.Role.ADMIN:
            admin_user.is_staff = True
            admin_user.role = User.Role.ADMIN
            admin_user.save(update_fields=["is_staff", "role"])
        self.stdout.write(f"Admin user: {admin_user.email} ({'created' if a_created else 'exists'})")

        if not CoffeePrice.objects.exists():
            self._seed_global_prices(coop, months)
        else:
            self.stdout.write("Global coffee prices present; skipping initial price seed.")

        if not CropListing.objects.filter(cooperative=coop).exists():
            self._seed_listings(coop, LISTING_TEMPLATES[:3], coop.location)

        extra_coops = self._seed_extra_cooperatives()
        all_coops = [coop] + extra_coops
        buyers = self._seed_extra_buyers(buyer_user)
        self._seed_extended_listings(all_coops)
        self._seed_coop_prices(all_coops, months)
        self._seed_predictions(buyers + [coop_user])
        self._seed_conversations(buyers, all_coops)
        self._seed_alerts(buyers + [coop_user])
        self._seed_notifications(coop_user, buyers)

        Notification.objects.get_or_create(
            user=coop_user,
            notification_message="Welcome to IgiciroHub! Your demo cooperative is ready.",
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        self.stdout.write(f"  Demo cooperative login: {DEMO_COOP_EMAIL} / {DEMO_PASSWORD}")
        self.stdout.write(f"  Demo buyer login:       {DEMO_BUYER_EMAIL} / {DEMO_PASSWORD}")
        self.stdout.write(f"  Demo admin login:       {DEMO_ADMIN_EMAIL} / {DEMO_PASSWORD}")

    def _seed_global_prices(self, coop, months):
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
                trend = self._trend(prev_price, price)
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
        self.stdout.write(f"Seeded {created} global coffee price records.")

    def _seed_coop_prices(self, coops, months):
        df = ensure_dataset()
        df = df.sort_values("date")
        tail_months = min(months, 12)
        created = 0
        for coop in coops:
            if CoffeePrice.objects.filter(cooperative=coop).exists():
                continue
            offset = random.uniform(0.94, 1.06)
            for coffee_type in [CoffeeType.RED_BOURBON, CoffeeType.ARABICA, CoffeeType.JACKSON]:
                for price_type in [PriceType.FARMGATE, PriceType.COOPERATIVE]:
                    grp = df[
                        (df["coffee_type"] == coffee_type)
                        & (df["price_type"] == price_type)
                    ].tail(tail_months)
                    prev_price = None
                    for _, row in grp.iterrows():
                        d = row["date"]
                        d = d.date() if hasattr(d, "date") else d
                        price = round(float(row["price"]) * offset, 2)
                        trend = self._trend(prev_price, price)
                        CoffeePrice.objects.create(
                            cooperative=coop,
                            coffee_type=coffee_type,
                            price_type=price_type,
                            currency=Currency.RWF,
                            market_price=price,
                            recorded_date=d,
                            season=season_for_month(d.month),
                            market_trend=trend,
                        )
                        prev_price = price
                        created += 1
        if created:
            self.stdout.write(f"Seeded {created} cooperative-specific price records.")

    def _trend(self, prev_price, price):
        if prev_price is None:
            return MarketTrend.STABLE
        if price > prev_price * 1.01:
            return MarketTrend.UP
        if price < prev_price * 0.99:
            return MarketTrend.DOWN
        return MarketTrend.STABLE

    def _seed_listings(self, coop, templates, location):
        for coffee_type, grade, qty, price in templates:
            CropListing.objects.create(
                cooperative=coop,
                coffee_type=coffee_type,
                quality_grade=grade,
                quantity_kg=qty,
                price_per_kg=price,
                currency="RWF",
                location=location,
                description=f"Freshly processed {coffee_type.replace('_', ' ')} from our washing station.",
                is_available=True,
            )
        self.stdout.write(f"Seeded {len(templates)} listings for {coop.cooperative_name}.")

    def _seed_extra_cooperatives(self):
        coops = []
        for i, (email, name, location, desc) in enumerate(EXTRA_COOPS):
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": name,
                    "role": User.Role.COOPERATIVE,
                    "phone_number": f"+250788000{100 + i}",
                    "notify_in_app": True,
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            coop, _ = Cooperative.objects.get_or_create(
                owner=user,
                defaults={
                    "cooperative_name": name,
                    "location": location,
                    "contact_info": f"+250788000{100 + i}",
                    "description": desc,
                },
            )
            coops.append(coop)
        self.stdout.write(f"Ensured {len(coops)} extended cooperatives.")
        return coops

    def _seed_extra_buyers(self, primary_buyer):
        buyers = [primary_buyer]
        for i, (email, name, phone) in enumerate(EXTRA_BUYERS):
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": name,
                    "role": User.Role.BUYER,
                    "phone_number": phone,
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            buyers.append(user)
        self.stdout.write(f"Ensured {len(buyers)} buyer accounts.")
        return buyers

    def _seed_extended_listings(self, coops):
        created = 0
        for coop in coops:
            existing = CropListing.objects.filter(cooperative=coop).count()
            if existing >= 2:
                continue
            picks = random.sample(LISTING_TEMPLATES, k=min(2, len(LISTING_TEMPLATES)))
            for coffee_type, grade, qty, price in picks:
                adj_qty = qty * random.uniform(0.7, 1.3)
                adj_price = price * random.uniform(0.92, 1.08)
                CropListing.objects.create(
                    cooperative=coop,
                    coffee_type=coffee_type,
                    quality_grade=grade,
                    quantity_kg=round(adj_qty, 0),
                    price_per_kg=round(adj_price, 0),
                    currency="RWF",
                    location=coop.location,
                    description=f"{coop.cooperative_name} — {grade} lot available now.",
                    is_available=random.random() > 0.15,
                )
                created += 1
        if created:
            self.stdout.write(f"Seeded {created} extended marketplace listings.")

    def _seed_predictions(self, users):
        if PredictionResult.objects.count() >= 20:
            return
        samples = [
            ("red_bourbon", PriceType.FARMGATE, 2050, 2180, 6.3, "hold"),
            ("arabica", PriceType.COOPERATIVE, 1980, 1920, -3.0, "sell"),
            ("bourbon_mayaguez", PriceType.FARMGATE, 2100, 2250, 7.1, "hold"),
            ("jackson", PriceType.EXPORT, 4.2, 4.55, 8.3, "hold"),
            ("robusta", PriceType.FARMGATE, 1450, 1380, -4.8, "sell"),
            ("red_bourbon", PriceType.EXPORT, 4.8, 5.1, 6.2, "hold"),
            ("arabica", PriceType.FARMGATE, 2010, 2095, 4.2, "hold"),
            ("jackson", PriceType.COOPERATIVE, 1890, 1840, -2.6, "monitor"),
        ]
        now = timezone.now()
        rec_map = {
            "hold": "Prices expected to rise — consider holding stock for better returns.",
            "sell": "Market softening — good window to sell before further decline.",
            "monitor": "Mixed signals — monitor weekly and set a price alert.",
        }
        created = 0
        for i, (coffee, ptype, current, predicted, change, rec_key) in enumerate(samples):
            user = users[i % len(users)]
            currency = Currency.USD if ptype == PriceType.EXPORT else Currency.RWF
            low = predicted * 0.97
            high = predicted * 1.03
            days_ago = random.randint(0, 14)
            p = PredictionResult.objects.create(
                requested_by=user,
                coffee_type=coffee,
                price_type=ptype,
                currency=currency,
                current_price=Decimal(str(round(current, 2))),
                predicted_price=Decimal(str(round(predicted, 2))),
                predicted_price_low=Decimal(str(round(low, 2))),
                predicted_price_high=Decimal(str(round(high, 2))),
                change_pct=change,
                horizon_days=30,
                historical_period_months=12,
                algorithm_used="random_forest",
                accuracy_rate=round(random.uniform(82, 94), 1),
                confidence="high" if abs(change) > 5 else "medium",
                recommendation=rec_map.get(rec_key, rec_map["monitor"]),
            )
            PredictionResult.objects.filter(pk=p.pk).update(
                prediction_date=now - timedelta(days=days_ago, hours=random.randint(0, 12))
            )
            created += 1
        for j in range(12):
            coffee = random.choice(list(CoffeeType.values))
            ptype = random.choice([PriceType.FARMGATE, PriceType.COOPERATIVE])
            current = random.uniform(1400, 2200)
            change = random.uniform(-8, 10)
            predicted = current * (1 + change / 100)
            user = users[j % len(users)]
            p = PredictionResult.objects.create(
                requested_by=user,
                coffee_type=coffee,
                price_type=ptype,
                currency=Currency.RWF,
                current_price=Decimal(str(round(current, 2))),
                predicted_price=Decimal(str(round(predicted, 2))),
                change_pct=round(change, 2),
                horizon_days=random.choice([14, 30, 60]),
                historical_period_months=random.choice([6, 12, 18]),
                algorithm_used="random_forest",
                accuracy_rate=round(random.uniform(78, 92), 1),
                confidence=random.choice(["high", "medium", "low"]),
                recommendation="Historical prediction for analytics dashboard.",
            )
            PredictionResult.objects.filter(pk=p.pk).update(
                prediction_date=now - timedelta(days=random.randint(15, 90))
            )
            created += 1
        self.stdout.write(f"Seeded {created} prediction records.")

    def _seed_conversations(self, buyers, coops):
        if Message.objects.count() >= 15:
            return
        threads = [
            (0, 0, "Hello, we are interested in your AA Red Bourbon lot.", "buyer"),
            (0, 0, "Thank you! We have 1.8 tonnes available. Would you like a sample?", "coop"),
            (0, 0, "Yes please — can you ship 5kg to Kigali this week?", "buyer"),
            (0, 1, "Do you offer FOB pricing for export grades?", "buyer"),
            (0, 1, "We can quote FOB Dar es Salaam. Current offer is 4.85 USD/lb.", "coop"),
            (1, 2, "Looking for 2 tonnes Jackson Grade A for our roastery.", "buyer"),
            (1, 2, "We can fulfill 2 tonnes at 1,920 RWF/kg. Harvest date March 2026.", "coop"),
            (2, 3, "Is the Nyamagabe lot still available?", "buyer"),
            (2, 3, "Yes — 900 kg remaining. Price negotiable for bulk order.", "coop"),
            (0, 4, "Can we schedule a farm visit next month?", "buyer"),
        ]
        created = 0
        for buyer_idx, coop_idx, text, sender_role in threads:
            buyer = buyers[buyer_idx % len(buyers)]
            coop = coops[coop_idx % len(coops)]
            conv, _ = Conversation.objects.get_or_create(buyer=buyer, cooperative=coop)
            sender = buyer if sender_role == "buyer" else coop.owner
            if Message.objects.filter(conversation=conv, message=text).exists():
                continue
            msg = Message.objects.create(conversation=conv, sender=sender, message=text)
            Message.objects.filter(pk=msg.pk).update(
                interaction_date=timezone.now() - timedelta(days=random.randint(0, 10), hours=random.randint(1, 20))
            )
            created += 1
        if created:
            self.stdout.write(f"Seeded {created} chat messages.")

    def _seed_alerts(self, users):
        if PriceAlert.objects.count() >= 6:
            return
        alerts = [
            ("red_bourbon", PriceType.FARMGATE, 2200, PriceAlert.Direction.ABOVE),
            ("arabica", PriceType.FARMGATE, 1850, PriceAlert.Direction.BELOW),
            ("bourbon_mayaguez", PriceType.COOPERATIVE, 2100, PriceAlert.Direction.ABOVE),
            ("jackson", PriceType.FARMGATE, 1900, PriceAlert.Direction.BELOW),
            ("robusta", PriceType.FARMGATE, 1500, PriceAlert.Direction.ABOVE),
        ]
        created = 0
        for i, (coffee, ptype, threshold, direction) in enumerate(alerts):
            user = users[i % len(users)]
            _, was_created = PriceAlert.objects.get_or_create(
                user=user,
                coffee_type=coffee,
                price_type=ptype,
                threshold=Decimal(str(threshold)),
                direction=direction,
                defaults={"is_active": True},
            )
            if was_created:
                created += 1
        if created:
            self.stdout.write(f"Seeded {created} price alerts.")

    def _seed_notifications(self, coop_user, buyers):
        messages = [
            (coop_user, "New buyer inquiry on your Red Bourbon AA listing."),
            (coop_user, "Farm gate price for Arabica rose 4.2% this week."),
            (coop_user, "Your ML prediction report is ready to download."),
            (buyers[0], "Price alert: Red Bourbon farmgate crossed 2,200 RWF."),
            (buyers[0], "Nyamasheke Lake Coffee replied to your message."),
            (buyers[1], "3 new listings match your saved search in Gakenke."),
            (buyers[2], "Weekly market summary: export prices trending up."),
        ]
        created = 0
        for user, text in messages:
            _, was_created = Notification.objects.get_or_create(
                user=user,
                notification_message=text,
            )
            if was_created:
                created += 1
        if created:
            self.stdout.write(f"Seeded {created} notifications.")
