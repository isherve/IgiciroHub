from django.db import models

from prices.constants import CoffeeType


class CropListing(models.Model):
    """A coffee product a cooperative lists on the marketplace."""

    class Grade(models.TextChoices):
        AA = "AA", "Grade AA"
        A = "A", "Grade A"
        B = "B", "Grade B"
        C = "C", "Grade C"

    cooperative = models.ForeignKey(
        "cooperatives.Cooperative",
        on_delete=models.CASCADE,
        related_name="listings",
    )
    coffee_type = models.CharField(max_length=32, choices=CoffeeType.choices)
    quality_grade = models.CharField(max_length=4, choices=Grade.choices, default=Grade.A)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2)
    price_per_kg = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="RWF")
    location = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="listings/", null=True, blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crop_listings"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.get_coffee_type_display()} — {self.quantity_kg}kg @ {self.price_per_kg}{self.currency}/kg"
