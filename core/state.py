from typing import Annotated, Any, Sequence, TypedDict
import operator
from langchain_core.messages import BaseMessage


def merge_assets(a: dict, b: dict) -> dict:
    """Merge two assets dicts; nested 'social' dict is merged, not overwritten."""
    result = dict(a)
    for key, value in b.items():
        if key == "social" and isinstance(value, dict):
            merged_social = dict(result.get("social", {}))
            merged_social.update(value)
            result["social"] = merged_social
        else:
            result[key] = value
    return result


class AgentState(TypedDict):
    """
    Shared state for the content factory graph.

    - Planner builds `execution_queue` and `parallel_groups`.
    - Sequential steps run through Supervisor.
    - Parallel steps (content writers) fan-out via Send API and fan-in here.
    - Each agent writes structured output into `assets`.
    """
    messages: Annotated[Sequence[BaseMessage], operator.add]

    user_input: str
    campaign_id: str
    next: str
    target_platforms: list[str]
    requested_outputs: list[str]

    # Deterministic routing
    execution_queue: list[str]
    parallel_groups: list[list[str]]

    completed_steps: Annotated[list[str], operator.add]

    plan: dict[str, Any]
    assets: Annotated[dict[str, Any], merge_assets]

    # Analytics feedback injected from memory at campaign start
    analytics_context: dict[str, Any]
