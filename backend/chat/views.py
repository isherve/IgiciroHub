from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    StartConversationSerializer,
)


class ConversationViewSet(viewsets.ModelViewSet):
    """Conversations the current user participates in (as buyer or cooperative owner)."""

    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.select_related("buyer", "cooperative", "cooperative__owner")
            .filter(Q(buyer=user) | Q(cooperative__owner=user))
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        """Start (or reuse) a conversation with a cooperative and post first message."""
        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coop = serializer.validated_data["cooperative"]

        if coop.owner == request.user:
            return Response(
                {"detail": "You cannot start a conversation with your own cooperative."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation, _ = Conversation.objects.get_or_create(
            buyer=request.user, cooperative=coop
        )
        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            message=serializer.validated_data["message"],
        )
        return Response(
            self.get_serializer(conversation).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        """Full message thread; marks incoming messages as read."""
        conversation = self.get_object()
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        qs = conversation.messages.select_related("sender").all()
        return Response(MessageSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        msg = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            message=serializer.validated_data["message"],
        )
        conversation.save(update_fields=["updated_at"])
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = (
            Message.objects.filter(
                Q(conversation__buyer=request.user)
                | Q(conversation__cooperative__owner=request.user)
            )
            .filter(is_read=False)
            .exclude(sender=request.user)
            .count()
        )
        return Response({"unread": count})
