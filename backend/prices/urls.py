from rest_framework.routers import DefaultRouter

from .views import CoffeePriceViewSet

router = DefaultRouter()
router.register(r"", CoffeePriceViewSet, basename="price")

urlpatterns = router.urls
