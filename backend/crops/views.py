from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import IsCooperativeOrReadOnly

from .models import CropListing
from .serializers import CropListingSerializer


class CropListingViewSet(viewsets.ModelViewSet):
    """
    Marketplace listings. Guests/buyers can browse & filter; only the owning
    cooperative can create/update/delete its listings.
    """

    queryset = CropListing.objects.select_related("cooperative", "cooperative__owner").all()
    serializer_class = CropListingSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [IsCooperativeOrReadOnly()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("coffee_type"):
            qs = qs.filter(coffee_type=params["coffee_type"])
        if params.get("grade"):
            qs = qs.filter(quality_grade=params["grade"])
        if params.get("location"):
            qs = qs.filter(location__icontains=params["location"])
        if params.get("search"):
            qs = qs.filter(description__icontains=params["search"])
        if params.get("max_price"):
            qs = qs.filter(price_per_kg__lte=params["max_price"])
        if params.get("available") == "true":
            qs = qs.filter(is_available=True)
        if params.get("cooperative"):
            qs = qs.filter(cooperative_id=params["cooperative"])
        return qs

    def _get_owner_coop(self):
        coop = getattr(self.request.user, "cooperative", None)
        if not coop:
            raise PermissionDenied("Only a cooperative account can manage listings.")
        return coop

    def perform_create(self, serializer):
        serializer.save(cooperative=self._get_owner_coop())

    def perform_update(self, serializer):
        if serializer.instance.cooperative.owner != self.request.user:
            raise PermissionDenied("You can only edit your own listings.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.cooperative.owner != self.request.user:
            raise PermissionDenied("You can only delete your own listings.")
        instance.delete()
