from django.contrib import admin

from .models import CropListing


@admin.register(CropListing)
class CropListingAdmin(admin.ModelAdmin):
    list_display = ("coffee_type", "quality_grade", "quantity_kg", "price_per_kg", "cooperative", "is_available")
    list_filter = ("coffee_type", "quality_grade", "is_available")
    search_fields = ("description", "location")
