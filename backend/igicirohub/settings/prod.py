"""Production settings."""
import os

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS", default=[])

# Render sets RENDER_EXTERNAL_HOSTNAME automatically; include it in the allowed
# hosts and CSRF trusted origins so the deployed API and admin work.
_render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if _render_host:
    ALLOWED_HOSTS = list(set(ALLOWED_HOSTS + [_render_host]))
    CSRF_TRUSTED_ORIGINS = [f"https://{_render_host}"]

# Security hardening.
SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@igicirohub.rw")
