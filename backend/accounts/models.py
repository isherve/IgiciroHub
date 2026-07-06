from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Manager for the email-based custom user model."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user. Maps to the `Users` table in the approved schema.
    `id` is the PK (user_id). Login is by email.
    """

    class Role(models.TextChoices):
        COOPERATIVE = "cooperative", "Cooperative"
        BUYER = "buyer", "Buyer"
        ADMIN = "admin", "Admin"

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        KINYARWANDA = "rw", "Kinyarwanda"
        FRENCH = "fr", "French"

    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.BUYER)
    phone_number = models.CharField(max_length=20, blank=True)

    # Notification + language preferences (used by profile screen / alerts).
    locale = models.CharField(max_length=5, choices=Language.choices, default=Language.ENGLISH)
    notify_in_app = models.BooleanField(default=True)
    notify_email = models.BooleanField(default=False)
    notify_sms = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.full_name} <{self.email}> ({self.role})"

    @property
    def is_cooperative(self):
        return self.role == self.Role.COOPERATIVE

    @property
    def is_buyer(self):
        return self.role == self.Role.BUYER

    @property
    def is_admin(self):
        return self.is_staff or self.role == self.Role.ADMIN
