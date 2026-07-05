"""JWT session hygiene helpers."""


def blacklist_user_tokens(user) -> None:
    """Invalidate all outstanding refresh tokens for a user."""
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
