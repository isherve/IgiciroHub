from django.utils.html import escape
from rest_framework import serializers

from cooperatives.models import Cooperative

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "sender_name", "message", "is_read", "interaction_date")
        read_only_fields = ("id", "sender", "sender_name", "is_read", "interaction_date")

    def validate_message(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        # Basic input sanitization to prevent stored XSS.
        return escape(value)


class ConversationSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source="cooperative.cooperative_name", read_only=True)
    buyer_name = serializers.CharField(source="buyer.full_name", read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "buyer",
            "buyer_name",
            "cooperative",
            "cooperative_name",
            "last_message",
            "unread_count",
            "updated_at",
        )
        read_only_fields = fields

    def get_last_message(self, obj):
        last = obj.messages.order_by("-interaction_date").first()
        return MessageSerializer(last).data if last else None

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()


class StartConversationSerializer(serializers.Serializer):
    cooperative = serializers.PrimaryKeyRelatedField(queryset=Cooperative.objects.all())
    message = serializers.CharField()

    def validate_message(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        return escape(value)
