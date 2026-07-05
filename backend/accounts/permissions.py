from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import User


class IsCooperative(BasePermission):
    message = "Only cooperative accounts may perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_cooperative)


class IsBuyer(BasePermission):
    message = "Only buyer accounts may perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_buyer)


class IsAdmin(BasePermission):
    message = "Admin access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.role == User.Role.ADMIN)
        )


class IsOwnerOrReadOnly(BasePermission):
    """Object-level: safe methods for all, writes only for the owner."""

    owner_field = "owner"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, self.owner_field, None)
        return owner == request.user


class IsCooperativeOrReadOnly(BasePermission):
    """Read for anyone authenticated; write only for cooperatives."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_cooperative
        )
