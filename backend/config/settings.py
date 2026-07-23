"""Configuracion principal del backend de RFM Core."""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_list(name, default=""):
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def env_bool(name, default=""):
    return os.getenv(name, default).lower() in {"1", "true", "yes", "on"}


def env_int(name, default, *, min_value=0):
    raw_value = os.getenv(name, str(default))
    try:
        value = int(raw_value)
    except (TypeError, ValueError) as exc:
        raise ImproperlyConfigured(f"{name} must be an integer.") from exc
    if value < min_value:
        raise ImproperlyConfigured(
            f"{name} must be greater than or equal to {min_value}."
        )
    return value


DEBUG = env_bool("DJANGO_DEBUG", "True")

if not DEBUG:
    required_env_vars = [
        "DJANGO_SECRET_KEY",
        "DJANGO_ALLOWED_HOSTS",
        "CORS_ALLOWED_ORIGINS",
        "CSRF_TRUSTED_ORIGINS",
        "DATABASE_URL",
    ]
    missing_env_vars = [
        name
        for name in required_env_vars
        if not os.getenv(name, "").strip()
    ]
    if missing_env_vars:
        raise ImproperlyConfigured(
            "Missing required production environment variables: "
            + ", ".join(missing_env_vars)
        )

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    SECRET_KEY = "django-insecure-rfm-core-dev-key"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
FRONTEND_PUBLIC_URL = (
    os.getenv("FRONTEND_PUBLIC_URL", "http://localhost:5173").strip().rstrip("/")
    or "http://localhost:5173"
)


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',
    'accounts',
    'negocio',
    'comercial',
    'financiero',
    'reportes',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    if not DEBUG and not DATABASE_URL.startswith(("postgres://", "postgresql://")):
        raise ImproperlyConfigured(
            "DATABASE_URL must use PostgreSQL when DJANGO_DEBUG is False."
        )
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=env_int("DATABASE_CONN_MAX_AGE", 60),
            conn_health_checks=True,
            ssl_require=not DEBUG,
        )
    }
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = env_bool(
        "DATABASE_DISABLE_SERVER_SIDE_CURSORS",
        "True",
    )
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'es-ec'

TIME_ZONE = 'America/Guayaquil'

USE_I18N = True

USE_TZ = True


STATIC_URL = 'static/'
STATIC_ROOT = Path(
    os.getenv("DJANGO_STATIC_ROOT", str(BASE_DIR / "staticfiles"))
)

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173",
)

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

AUTH_TOKEN_TTL_HOURS = env_int("AUTH_TOKEN_TTL_HOURS", 24, min_value=1)

DATA_UPLOAD_MAX_MEMORY_SIZE = env_int(
    "DJANGO_DATA_UPLOAD_MAX_MEMORY_SIZE",
    1024 * 1024,
    min_value=1024,
)

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = not DEBUG and env_bool("DJANGO_SECURE_SSL_REDIRECT", "True")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = (
    env_int("DJANGO_SECURE_HSTS_SECONDS", 31536000) if not DEBUG else 0
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG and env_bool("DJANGO_SECURE_HSTS_PRELOAD", "True")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
    },
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.ExpiringTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAdminUser',
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": os.getenv("THROTTLE_AUTH_LOGIN", "10/minute"),
        "public_precotizacion": os.getenv(
            "THROTTLE_PUBLIC_PRECOTIZACION",
            "60/hour",
        ),
        "public_preferencia": os.getenv(
            "THROTTLE_PUBLIC_PREFERENCIA",
            "120/hour",
        ),
    },
}
