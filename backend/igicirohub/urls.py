from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)


def health(_request):
    return JsonResponse({"status": "ok", "service": "IgiciroHub API"})


urlpatterns = [
    path("", health),
    path("admin/", admin.site.urls),
    # API
    path("api/auth/", include("accounts.urls")),
    path("api/cooperatives/", include("cooperatives.urls")),
    path("api/crops/", include("crops.urls")),
    path("api/prices/", include("prices.urls")),
    path("api/chat/", include("chat.urls")),
    path("api/predictions/", include("predictions.urls")),
    path("api/alerts/", include("alerts.urls")),
    path("api/analytics/", include("reports.analytics_urls")),
    path("api/reports/", include("reports.urls")),
    path("api/assistant/", include("gemini_assistant.urls")),
    # Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
