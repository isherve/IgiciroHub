from rest_framework import serializers

from .models import CropListing


class CropListingSerializer(serializers.ModelSerializer):
    coffee_type_display = serializers.CharField(source="get_coffee_type_display", read_only=True)
    grade_display = serializers.CharField(source="get_quality_grade_display", read_only=True)
    cooperative_name = serializers.CharField(source="cooperative.cooperative_name", read_only=True)
    cooperative_owner = serializers.IntegerField(source="cooperative.owner_id", read_only=True)

    class Meta:
        model = CropListing
        fields = (
            "id",
            "cooperative",
            "cooperative_name",
            "cooperative_owner",
            "coffee_type",
            "coffee_type_display",
            "quality_grade",
            "grade_display",
            "quantity_kg",
            "price_per_kg",
            "currency",
            "location",
            "description",
            "photo",
            "is_available",
            "created_at",
        )
        read_only_fields = ("id", "cooperative", "created_at")
