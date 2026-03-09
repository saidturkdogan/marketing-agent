from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship
from sqlalchemy.types import JSON

from core.config import DATABASE_URL


def get_json_type():
    if DATABASE_URL.startswith("postgresql"):
        return JSONB
    return JSON


class Base(DeclarativeBase):
    pass


class CampaignRecord(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_uuid: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_input: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    target_platforms: Mapped[list[str]] = mapped_column(get_json_type())
    requested_outputs: Mapped[list[str]] = mapped_column(get_json_type())
    plan: Mapped[dict] = mapped_column(get_json_type())
    completed_steps: Mapped[list[str]] = mapped_column(get_json_type())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    assets: Mapped[list["AssetRecord"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class AssetRecord(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    asset_type: Mapped[str] = mapped_column(String(64), index=True)
    asset_name: Mapped[str] = mapped_column(String(128), default="")
    content: Mapped[dict] = mapped_column(get_json_type())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    campaign: Mapped[CampaignRecord] = relationship(back_populates="assets")


_engine: Engine | None = None
_initialized = False


def get_engine() -> Engine | None:
    global _engine
    if not DATABASE_URL:
        return None
    if _engine is None:
        _engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
    return _engine


def init_db() -> bool:
    global _initialized
    engine = get_engine()
    if engine is None:
        return False
    if not _initialized:
        Base.metadata.create_all(engine)
        _initialized = True
    return True


@contextmanager
def session_scope():
    engine = get_engine()
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured.")

    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
