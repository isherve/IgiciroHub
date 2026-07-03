"""Development settings."""
from .base import *  # noqa: F401,F403
from .base import env

DEBUG = True

# Permissive CORS in dev; still allow explicit origins from .env if provided.
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS", default=[])

# Email to console in dev unless an SMTP host is configured.
_email_host = env("EMAIL_HOST", default="")
if _email_host:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = _email_host
    EMAIL_PORT = env("EMAIL_PORT", default=587)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
    EMAIL_USE_TLS = env("EMAIL_USE_TLS", default=True)
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@igicirohub.rw")
