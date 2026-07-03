from django.core.management.base import BaseCommand

from predictions.ml import predictor
from predictions.ml.train_model import train_all


class Command(BaseCommand):
    help = "Train the coffee price prediction models (RF + baselines) and print a comparison table."

    def add_arguments(self, parser):
        parser.add_argument(
            "--regenerate-data",
            action="store_true",
            help="Regenerate the synthetic dataset before training.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Training coffee price models..."))
        train_all(force_dataset=options["regenerate_data"])
        predictor.clear_cache()  # ensure freshly trained models are used at runtime
        self.stdout.write(self.style.SUCCESS("Done. Models + comparison written to predictions/ml/."))
