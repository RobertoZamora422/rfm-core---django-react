"""Serializers de la app accounts."""

from base64 import b64encode

from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(
            request=request,
            username=attrs["username"],
            password=attrs["password"],
        )

        if user is None:
            raise serializers.ValidationError(
                {"non_field_errors": ["Credenciales invalidas."]}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": ["El usuario se encuentra inactivo."]}
            )

        attrs["user"] = user
        attrs["auth_token"] = b64encode(
            f"{attrs['username']}:{attrs['password']}".encode("utf-8")
        ).decode("utf-8")
        return attrs


class UserSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "nombre_completo",
            "is_staff",
            "is_superuser",
        ]
        read_only_fields = fields
