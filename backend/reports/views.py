from django.http import FileResponse
from rest_framework import permissions
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView

from predictions.models import PredictionResult

from .pdf import build_prediction_pdf


class PredictionReportView(APIView):
    """GET /api/reports/prediction/<id>/ -> downloadable PDF."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        prediction = PredictionResult.objects.filter(pk=pk).first()
        if not prediction:
            raise NotFound("Prediction not found.")
        # Users can only download their own predictions (admins any).
        if prediction.requested_by_id and prediction.requested_by_id != request.user.id and not request.user.is_staff:
            raise NotFound("Prediction not found.")

        buf = build_prediction_pdf(prediction)
        filename = f"igicirohub_prediction_{prediction.pk}.pdf"
        return FileResponse(buf, as_attachment=True, filename=filename, content_type="application/pdf")
