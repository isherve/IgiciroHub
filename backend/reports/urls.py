from django.urls import path

from .views import PredictionReportView

urlpatterns = [
    path("prediction/<int:pk>/", PredictionReportView.as_view(), name="prediction_report"),
]
