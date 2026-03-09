import json

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from core.llm import get_llm


def invoke_text_agent(system_prompt: str, user_prompt: str, temperature: float = 0.4) -> str:
    """Run a single LLM call and normalize multimodal responses to plain text."""
    llm = get_llm(temperature=temperature)
    response = llm.invoke(
        [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
    )
    content = response.content
    if isinstance(content, list):
        return "\n".join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict) and "text" in item
        )
    return str(content)


def to_pretty_json(data: object) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def mark_step_complete(state: dict, step_name: str) -> list[str]:
    completed = list(state.get("completed_steps", []))
    if step_name not in completed:
        completed.append(step_name)
    return completed


def build_message(step_name: str, content: str) -> list[AIMessage]:
    return [AIMessage(content=content, name=step_name)]
