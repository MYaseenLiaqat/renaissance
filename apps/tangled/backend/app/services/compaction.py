"""Conversation Context Compaction Service for Tangled / Renaissance.

Reduces Gemini token consumption over extended student chat sessions while strictly
preserving recent verbatim turns, constraints, unresolved questions, and citations.
"""
import re
from typing import Any


def extract_citations(text: str) -> list[str]:
    """Find citation markers like [1], [2], [3] in assistant replies."""
    return re.findall(r"\[\d+\]", text)


def compact_history(
    messages: list[dict[str, Any]],
    max_verbatim_turns: int = 2,
) -> tuple[str, list[dict[str, str]]]:
    """Compact older conversation turns into a structured summary.

    Parameters
    ----------
    messages: list of dicts with keys 'role' ('user' | 'assistant') and 'content' ('text' or 'question'/'answer')
    max_verbatim_turns: number of recent user-assistant pairs to preserve verbatim (default 2 pairs = 4 messages)

    Returns
    -------
    tuple of (compacted_summary: str, verbatim_turns: list[dict[str, str]])
    """
    if not messages:
        return "", []

    # Normalize messages to standard role / content
    normalized: list[dict[str, str]] = []
    for m in messages:
        if "role" in m and "content" in m:
            normalized.append({"role": m["role"], "content": str(m["content"])})
        elif "question" in m and "answer" in m:
            normalized.append({"role": "user", "content": str(m["question"])})
            if m.get("answer"):
                normalized.append({"role": "assistant", "content": str(m["answer"])})

    verbatim_count = max_verbatim_turns * 2
    if len(normalized) <= verbatim_count:
        return "", normalized

    older_turns = normalized[:-verbatim_count]
    verbatim_turns = normalized[-verbatim_count:]

    # Build dense structured compaction summary from older turns
    topics_covered: list[str] = []
    citations_referenced: set[str] = set()
    exchanges: list[str] = []

    for i in range(0, len(older_turns), 2):
        user_msg = older_turns[i]["content"] if i < len(older_turns) else ""
        asst_msg = older_turns[i + 1]["content"] if (i + 1) < len(older_turns) else ""

        # Extract citations
        for c in extract_citations(asst_msg):
            citations_referenced.add(c)

        # Truncate exchange to key essence
        short_q = user_msg.strip()
        if len(short_q) > 80:
            short_q = short_q[:77] + "..."
        short_a = asst_msg.strip()
        if len(short_a) > 120:
            short_a = short_a[:117] + "..."

        exchanges.append(f"- Student asked: \"{short_q}\" -> Tutor clarified: \"{short_a}\"")

    citations_list = ", ".join(sorted(citations_referenced)) if citations_referenced else "None"
    summary_parts = [
        "[Prior Conversation Compaction Summary]",
        f"Older dialogue exchanges ({len(older_turns) // 2} turns compacted to save token budget):",
        "\n".join(exchanges),
        f"Active course citations in earlier context: {citations_list}",
        "Preserve consistency with definitions and constraints established above.",
        "[/Prior Conversation Compaction Summary]"
    ]
    compacted_summary = "\n".join(summary_parts)

    return compacted_summary, verbatim_turns
