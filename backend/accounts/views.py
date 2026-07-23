from django.contrib.auth import logout
from rest_framework.authtoken.models import Token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import token_is_expired
from .serializers import LoginSerializer, UserSerializer


class LoginAPIView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_login"

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, created = Token.objects.get_or_create(user=user)
        if not created and token_is_expired(token):
            token.delete()
            token = Token.objects.create(user=user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "auth": {
                    "type": "token",
                    "token": token.key,
                },
            }
        )


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.auth is not None:
            request.auth.delete()
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
