from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import client


class AssistantChatView(APIView):
    # Guest browse + demo accounts should get stub answers without logging in.
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.is_authenticated:
            locale = getattr(request.user, "locale", "en")
        else:
            locale = (request.data.get("locale") or "en")[:5]
        return Response(client.ask(message, locale=locale))


class DiseaseDetectionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        photo = request.FILES.get("photo")
        if not photo:
            return Response({"detail": "photo file is required"}, status=status.HTTP_400_BAD_REQUEST)
        result = client.describe_disease(photo.read(), mime_type=photo.content_type or "image/jpeg")
        return Response(result)


class AssistantStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"configured": client.is_configured()})
