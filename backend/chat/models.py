from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """A message thread between a buyer and a cooperative."""

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="buyer_conversations",
    )
    cooperative = models.ForeignKey(
        "cooperatives.Cooperative",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "conversations"
        unique_together = ("buyer", "cooperative")
        ordering = ("-updated_at",)

    def __str__(self):
        return f"Conversation({self.buyer_id} <-> coop {self.cooperative_id})"


class Message(models.Model):
    """
    A single message. Maps to the `Buyer Interactions` table
    (interaction_id, user_id, cooperative_id, message, interaction_date),
    with an added conversation grouping for threading.
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    interaction_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "buyer_interactions"
        ordering = ("interaction_date",)

    def __str__(self):
        return f"Msg#{self.pk} from {self.sender_id}"
