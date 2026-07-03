from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, PriceAlertViewSet

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"subscriptions", PriceAlertViewSet, basename="pricealert")

urlpatterns = router.urls
