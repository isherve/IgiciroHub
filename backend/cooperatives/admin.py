from django.contrib import admin

from .models import Cooperative


@admin.register(Cooperative)
class CooperativeAdmin(admin.ModelAdmin):
    list_display = ("cooperative_name", "location", "owner", "created_at")
    search_fields = ("cooperative_name", "location")
