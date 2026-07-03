from rest_framework import serializers

from .models import Cooperative


class CooperativeSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.full_name", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model = Cooperative
        fields = (
            "id",
            "cooperative_name",
            "location",
            "contact_info",
            "description",
            "owner_name",
            "owner_email",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "owner_name", "owner_email")
