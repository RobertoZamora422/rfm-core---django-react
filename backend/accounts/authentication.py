"""Autenticacion por token con vencimiento configurable."""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


def token_is_expired(token):
    ttl = timedelta(hours=settings.AUTH_TOKEN_TTL_HOURS)
    return token.created <= timezone.now() - ttl


class ExpiringTokenAuthentication(TokenAuthentication):
    """Revoca tokens vencidos antes de autorizar una solicitud."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if token_is_expired(token):
            token.delete()
            raise AuthenticationFailed(
                "La sesión expiró. Inicia sesión nuevamente.",
                code="token_expired",
            )
        return user, token
