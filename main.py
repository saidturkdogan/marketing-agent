from core.pipeline import build_initial_state, persist_campaign_outputs, stream_campaign

DEFAULT_PLATFORMS = ["Instagram", "LinkedIn", "TikTok", "Twitter"]
DEFAULT_OUTPUTS = ["blog", "social", "video", "images"]


def parse_platform_input(platform_input: str) -> list[str]:
    platform_map = {
        "instagram": "Instagram",
        "ig": "Instagram",
        "insta": "Instagram",
        "linkedin": "LinkedIn",
        "li": "LinkedIn",
        "tiktok": "TikTok",
        "tt": "TikTok",
        "twitter": "Twitter",
        "x": "Twitter",
        "tweet": "Twitter",
    }
    if platform_input in ["all", "", "hepsi", "tümü"]:
        return DEFAULT_PLATFORMS

    platforms = []
    for value in platform_input.split(","):
        normalized = platform_map.get(value.strip().lower())
        if normalized and normalized not in platforms:
            platforms.append(normalized)
    return platforms or DEFAULT_PLATFORMS


def parse_output_input(output_input: str) -> list[str]:
    output_map = {
        "blog": "blog",
        "social": "social",
        "video": "video",
        "script": "video",
        "images": "images",
        "image": "images",
        "all": "all",
    }
    normalized_values = [output_map.get(item.strip().lower()) for item in output_input.split(",")]
    if not output_input.strip() or "all" in normalized_values:
        return DEFAULT_OUTPUTS
    outputs = [value for value in normalized_values if value and value != "all"]
    return list(dict.fromkeys(outputs)) or DEFAULT_OUTPUTS


def print_node_output(node_output: dict) -> None:
    if "next" in node_output and "messages" not in node_output:
        print(f"-> Decision: Task assigned to {node_output['next']} agent.")
        return

    if "messages" not in node_output:
        return

    last_msg = node_output["messages"][-1].content
    if isinstance(last_msg, list):
        formatted_msg = "\n".join([
            item.get("text", "") for item in last_msg
            if isinstance(item, dict) and "text" in item
        ])
    else:
        formatted_msg = str(last_msg)
    print(f"{formatted_msg}\n")


def merge_node_output(final_state: dict, node_output: dict) -> None:
    for key, value in node_output.items():
        if key == "messages":
            final_state["messages"] = list(final_state.get("messages", [])) + list(value)
        else:
            final_state[key] = value


def run_cli_campaign(user_input: str, target_platforms: list[str], requested_outputs: list[str]) -> dict:
    print(
        f"\nFactory is running for platforms: {', '.join(target_platforms)} "
        f"and outputs: {', '.join(requested_outputs)}\n"
    )

    final_state = build_initial_state(user_input, target_platforms, requested_outputs)
    for event in stream_campaign(user_input, target_platforms, requested_outputs):
        for node_name, node_output in event.items():
            print(f"\n{'='*8} [FLOW] {node_name} {'='*8}")
            merge_node_output(final_state, node_output)
            print_node_output(node_output)
    return final_state


def prompt_campaign_inputs() -> tuple[str, list[str], list[str]] | None:
    user_input = input("\nSend Request to Marketing Director:\n> ")

    if user_input.lower() in ["q", "quit", "exit"]:
        print("Shutting down the Marketing Agency system...")
        return None

    if not user_input.strip():
        return ("", [], [])

    print("\nWhich platforms? (comma-separated, or 'all' for all platforms)")
    print("   Options: instagram, linkedin, tiktok, twitter")
    platform_input = input("> ").strip().lower()

    print("\nWhich outputs? (comma-separated, or 'all')")
    print("   Options: blog, social, video, images")
    output_input = input("> ").strip().lower()

    return (
        user_input,
        parse_platform_input(platform_input),
        parse_output_input(output_input),
    )

def main():
    print("=" * 65)
    print("AI Content Factory - Multi-Agent Marketing System")
    print("=" * 65)
    print()
    print("Planner | Research | Strategy | Blog | Social | Video | Images")
    print()
    print("Note: Make sure you have your GOOGLE_API_KEY in the .env file.")
    print("Type 'q' or 'quit' to exit.")
    print("-" * 65)
    
    while True:
        prompted = prompt_campaign_inputs()
        if prompted is None:
            break
        if prompted == ("", [], []):
            continue
        user_input, target_platforms, requested_outputs = prompted
        final_state = run_cli_campaign(user_input, target_platforms, requested_outputs)

        persistence = persist_campaign_outputs(final_state)
        print("\nCampaign assets created and reviewed.")
        print(f"All content saved to: {persistence['output_file']}")
        if persistence["database"]["saved"]:
            print(
                "Database persistence completed: "
                f"campaign #{persistence['database']['campaign_row_id']} "
                f"with {persistence['database']['asset_rows']} asset rows."
            )
        else:
            print(f"Database persistence skipped: {persistence['database']['reason']}")

if __name__ == "__main__":
    main()
