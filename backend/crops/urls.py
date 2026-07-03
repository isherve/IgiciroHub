from rest_framework.routers import DefaultRouter

from .views import CropListingViewSet

router = DefaultRouter()
router.register(r"", CropListingViewSet, basename="listing")

urlpatterns = router.urls
