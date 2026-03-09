from agents.common import build_message, invoke_text_agent
from core.state import AgentState
from prompts.agent_prompts import IMAGE_PROMPT_PROMPT


def image_prompt_writer_node(state: AgentState):
    print("[ImagePromptWriter]: generating visual prompt pack...")
    assets = state.get("assets", {})
    strategy = assets.get("strategy", {})
    blog_post = assets.get("blog_post", "")

    prompt_pack = invoke_text_agent(
        IMAGE_PROMPT_PROMPT,
        (
            f"Topic: {state['user_input']}\n\n"
            f"Strategy:\n{strategy}\n\n"
            f"Blog excerpt:\n{blog_post[:2500]}"
        ),
        temperature=0.6,
    )

    return {
        "messages": build_message("ImagePromptWriter", prompt_pack),
        "assets": {"image_prompts": prompt_pack},
        "completed_steps": ["ImagePromptWriter"],
    }
