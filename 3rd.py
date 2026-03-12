# config.py

import os

class Config:
    """Base configuration"""
    DEBUG = False
    SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///app.db")
    API_TIMEOUT = 30


class DevelopmentConfig(Config):
    """Development environment settings"""
    DEBUG = True
    DATABASE_URL = "sqlite:///dev.db"


class ProductionConfig(Config):
    """Production environment settings"""
    DEBUG = False
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/prod_db")


class TestingConfig(Config):
    """Testing environment settings"""
    DEBUG = True
    DATABASE_URL = "sqlite:///test.db"
    TESTING = True


def get_config(env="development"):
    configs = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig
    }
    return configs.get(env, DevelopmentConfig)
