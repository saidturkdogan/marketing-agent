from langgraph.types import Send

from core.state import AgentState


def supervisor_node(state: AgentState):
    """
    Deterministic orchestrator.
    - Pops sequential steps from execution_queue one at a time.
    - When it hits "PARALLEL", fans out all writers simultaneously via Send.
    - When queue is empty, signals FINISH.
    """
    print("[Supervisor]: selecting next step...")
    queue = list(state.get("execution_queue", []))
    completed = set(state.get("completed_steps", []))

    while queue and queue[0] in completed:
        queue.pop(0)

    if not queue:
        print("[Supervisor]: queue empty -> FINISH")
        return {"next": "FINISH", "execution_queue": []}

    next_step = queue[0]

    if next_step == "PARALLEL":
        # Fan out all writers in the first parallel group
        groups = state.get("parallel_groups", [])
        writers = groups[0] if groups else []
        remaining_groups = groups[1:] if len(groups) > 1 else []
        remaining_queue = queue[1:]  # drop PARALLEL token

        print(f"[Supervisor]: fan-out -> {writers}")
        return (
            [Send(w, state) for w in writers],
            {
                "next": "PARALLEL",
                "execution_queue": remaining_queue,
                "parallel_groups": remaining_groups,
            },
        )

    print(f"[Supervisor]: next -> {next_step}")
    return {"next": next_step, "execution_queue": queue}
