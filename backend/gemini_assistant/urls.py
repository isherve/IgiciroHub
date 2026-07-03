from django.urls import path

from .views import AssistantChatView, AssistantStatusView, DiseaseDetectionView

urlpatterns = [
    path("chat/", AssistantChatView.as_view(), name="assistant_chat"),
    path("disease/", DiseaseDetectionView.as_view(), name="disease_detection"),
    path("status/", AssistantStatusView.as_view(), name="assistant_status"),
]
