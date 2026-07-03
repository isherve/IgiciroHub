from django.urls import path

from .views import PredictionHistoryView, PredictView, feature_importance

urlpatterns = [
    path("predict/", PredictView.as_view(), name="predict"),
    path("history/", PredictionHistoryView.as_view(), name="prediction_history"),
    path("feature-importance/", feature_importance, name="feature_importance"),
]
