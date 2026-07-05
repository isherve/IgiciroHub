from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from accounts.permissions import IsCooperative

from .models import Cooperative
from .serializers import CooperativeSerializer


class CooperativeViewSet(viewsets.ModelViewSet):
    """
    Browse cooperatives (public read for discovery), and let a cooperative
    owner update their own profile.
    """

    queryset = Cooperative.objects.select_related("owner").all()
    serializer_class = CooperativeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        if self.action == "me":
            return [permissions.IsAuthenticated(), IsCooperative()]
        return [permissions.IsAuthenticated(), IsCooperative()]

    def get_queryset(self):
        qs = super().get_queryset()
        location = self.request.query_params.get("location")
        search = self.request.query_params.get("search")
        if location:
            qs = qs.filter(location__icontains=location)
        if search:
            qs = qs.filter(cooperative_name__icontains=search)
        return qs

    @action(detail=False, methods=["get", "patch"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Return / update the cooperative profile owned by the current user."""
        coop = Cooperative.objects.filter(owner=request.user).first()
        if not coop:
            return Response({"detail": "No cooperative profile for this account."}, status=404)
        if request.method == "PATCH":
            serializer = self.get_serializer(coop, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(coop).data)

    def perform_update(self, serializer):
        if serializer.instance.owner != self.request.user:
            raise PermissionDenied("You can only edit your own cooperative profile.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            raise PermissionDenied("You can only delete your own cooperative profile.")
        instance.delete()
