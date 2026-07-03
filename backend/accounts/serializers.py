from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from cooperatives.models import Cooperative

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "email",
            "role",
            "phone_number",
            "locale",
            "notify_in_app",
            "notify_email",
            "notify_sms",
            "date_joined",
        )
        read_only_fields = ("id", "role", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    # Cooperative-only optional fields captured at registration.
    cooperative_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    location = serializers.CharField(required=False, allow_blank=True, write_only=True)
    business_name = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = (
            "full_name",
            "email",
            "phone_number",
            "role",
            "password",
            "cooperative_name",
            "location",
            "business_name",
        )

    def validate_role(self, value):
        if value not in (User.Role.COOPERATIVE, User.Role.BUYER):
            raise serializers.ValidationError("Role must be 'cooperative' or 'buyer'.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def create(self, validated_data):
        coop_name = validated_data.pop("cooperative_name", "").strip()
        location = validated_data.pop("location", "").strip()
        validated_data.pop("business_name", "")  # stored implicitly via full_name for MVP
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Auto-create a cooperative profile so the account is usable immediately.
        if user.is_cooperative:
            Cooperative.objects.create(
                owner=user,
                cooperative_name=coop_name or user.full_name,
                location=location,
                contact_info=user.phone_number or user.email,
            )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user profile info to the login response."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
