from __future__ import annotations

from typing import Any

from sqlalchemy import delete, select

from core.db import AssetRecord, CampaignRecord, init_db, session_scope


def normalize_asset_content(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        return {"items": value}
    return {"text": str(value)}


def flatten_assets(assets: dict[str, Any]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for key, value in assets.items():
        if key == "social" and isinstance(value, dict):
            for platform, platform_value in value.items():
                records.append(
                    {
                        "asset_type": "social",
                        "asset_name": platform,
                        "content": normalize_asset_content(platform_value),
                    }
                )
            continue

        records.append(
            {
                "asset_type": key,
                "asset_name": key,
                "content": normalize_asset_content(value),
            }
        )
    return records


def persist_campaign(final_state: dict[str, Any]) -> dict[str, Any]:
    if not init_db():
        return {"saved": False, "reason": "DATABASE_URL is not configured."}

    with session_scope() as session:
        existing = session.scalar(
            select(CampaignRecord).where(
                CampaignRecord.campaign_uuid == final_state["campaign_id"]
            )
        )

        if existing is None:
            campaign = CampaignRecord(
                campaign_uuid=final_state["campaign_id"],
                user_input=final_state["user_input"],
                status="completed",
                target_platforms=final_state["target_platforms"],
                requested_outputs=final_state["requested_outputs"],
                plan=final_state["plan"],
                completed_steps=final_state["completed_steps"],
            )
            session.add(campaign)
            session.flush()
        else:
            campaign = existing
            campaign.user_input = final_state["user_input"]
            campaign.status = "completed"
            campaign.target_platforms = final_state["target_platforms"]
            campaign.requested_outputs = final_state["requested_outputs"]
            campaign.plan = final_state["plan"]
            campaign.completed_steps = final_state["completed_steps"]
            session.execute(
                delete(AssetRecord).where(AssetRecord.campaign_id == campaign.id)
            )
            session.flush()

        asset_rows = flatten_assets(final_state.get("assets", {}))
        for asset in asset_rows:
            session.add(
                AssetRecord(
                    campaign_id=campaign.id,
                    asset_type=asset["asset_type"],
                    asset_name=asset["asset_name"],
                    content=asset["content"],
                )
            )

        session.flush()
        return {
            "saved": True,
            "campaign_row_id": campaign.id,
            "campaign_uuid": campaign.campaign_uuid,
            "asset_rows": len(asset_rows),
        }
