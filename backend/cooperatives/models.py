from django.conf import settings
from django.db import models


class Cooperative(models.Model):
    """
    Maps to the `Cooperatives` table. One user (role=cooperative) owns one
    cooperative profile.
    """

    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cooperative",
    )
    cooperative_name = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True)
    contact_info = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cooperatives"
        ordering = ("cooperative_name",)

    def __str__(self):
        return self.cooperative_name
