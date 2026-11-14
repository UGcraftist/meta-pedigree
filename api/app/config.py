"""Runtime configuration, read from the environment.

Secrets never get a default value here: the editor token must be supplied
through the environment (see docs/design/security.md, credential register).
"""

import os

APP_VERSION = "0.1.0"
APP_ENV = os.environ.get("APP_ENV", "development")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
EDITOR_TOKEN = os.environ.get("EDITOR_TOKEN", "")
