from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import client

MAX_PHOTO_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class AssistantChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "assistant"

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)
        locale = getattr(request.user, "locale", "en")
        return Response(client.ask(message, locale=locale))


class DiseaseDetectionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_scope = "assistant"

    def post(self, request):
        photo = request.FILES.get("photo")
        if not photo:
            return Response({"detail": "photo file is required"}, status=status.HTTP_400_BAD_REQUEST)
        if photo.size > MAX_PHOTO_BYTES:
            return Response(
                {"detail": "Photo must be 5 MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content_type = (photo.content_type or "").lower()
        if content_type not in ALLOWED_IMAGE_TYPES:
            return Response(
                {"detail": "Only JPEG, PNG, or WebP images are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = client.describe_disease(photo.read(), mime_type=content_type)
        return Response(result)


class AssistantStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(client.get_status())
