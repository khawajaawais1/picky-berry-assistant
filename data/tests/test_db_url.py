"""Connection settings: separate PG* lines (no encoding) or DATABASE_URL."""
import pytest

pytest.importorskip("sqlalchemy")

from picky_data import db  # noqa: E402


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for k in ("PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "DATABASE_URL"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setattr(db, "load_env", lambda: None)


def test_pg_vars_keep_special_characters(monkeypatch):
    monkeypatch.setenv("PGHOST", "aws-0-eu-west-1.pooler.supabase.com")
    monkeypatch.setenv("PGUSER", "postgres.abcdef")
    monkeypatch.setenv("PGPASSWORD", "pa@ss#wo/rd:1")
    u = db.database_url()
    assert u.password == "pa@ss#wo/rd:1"
    assert u.host == "aws-0-eu-west-1.pooler.supabase.com" and u.port == 5432
    assert u.username == "postgres.abcdef" and u.database == "postgres"
    assert u.drivername == "postgresql+psycopg"


def test_supabase_uri_gets_psycopg_driver(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", '"postgresql://postgres.x:p%4092@host.example:5432/postgres"')
    u = db.database_url()
    assert u.drivername == "postgresql+psycopg" and u.password == "p@92" and u.host == "host.example"


def test_bad_url_message_hides_password(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "not a url secret123")
    with pytest.raises(RuntimeError) as e:
        db.database_url()
    assert "secret123" not in str(e.value)


def test_nothing_configured():
    with pytest.raises(RuntimeError):
        db.database_url()
