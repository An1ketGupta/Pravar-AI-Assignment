"""Run an isolated local preview without editing the user's Supabase environment."""

import argparse
import os
import subprocess
import sys
from pathlib import Path

import uvicorn

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8000)
parser.add_argument("--database-name", choices=["preview.db", "e2e.db"], default="preview.db")
parser.add_argument("--fresh", action="store_true")
args = parser.parse_args()
backend = Path(__file__).resolve().parents[1]
local = backend / ".local"
local.mkdir(exist_ok=True)
database = local / args.database_name
if args.fresh:
    assert database.resolve().is_relative_to(local.resolve())
    database.unlink(missing_ok=True)

os.environ["DATABASE_URL"] = f"sqlite:///{database.as_posix()}"
os.environ["APP_ENV"] = "development"
os.environ["LOCAL_DEMO_MODE"] = "true"
os.environ["CORS_ORIGINS"] = "http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3100"
sys.path.insert(0, str(backend))
subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend, check=True)
uvicorn.run("app.main:app", host="127.0.0.1", port=args.port)
