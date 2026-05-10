from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze usage logs and estimate efficiency gains.")
    parser.add_argument("--input", default="logs/usage_events.jsonl", help="Path to usage JSONL log")
    parser.add_argument("--output", default="reports/efficiency_report.json", help="Path to generated report")
    return parser.parse_args()


def _read_events(path: Path) -> tuple[list[dict], dict[str, int]]:
    stats = {"invalid_json": 0, "duplicates": 0, "negative_duration": 0}
    events: list[dict] = []
    seen_ids: set[str] = set()

    if not path.exists():
        return events, stats

    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw.strip():
            continue
        try:
            event = json.loads(raw)
        except json.JSONDecodeError:
            stats["invalid_json"] += 1
            continue

        event_id = str(event.get("event_id", ""))
        if event_id and event_id in seen_ids:
            stats["duplicates"] += 1
            continue
        seen_ids.add(event_id)

        duration_ms = event.get("duration_ms")
        if isinstance(duration_ms, (int, float)) and duration_ms < 0:
            stats["negative_duration"] += 1
            continue

        events.append(event)

    return events, stats


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    events, excluded = _read_events(input_path)
    successes = [e for e in events if e.get("status") == "success"]

    by_action: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0.0, "saved_seconds": 0.0})
    by_day: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0.0, "saved_seconds": 0.0})

    total_saved = 0.0
    for event in successes:
        action = str(event.get("action", "unknown"))
        saved = event.get("saved_seconds")
        saved_seconds = float(saved) if isinstance(saved, (int, float)) else 0.0

        by_action[action]["count"] += 1
        by_action[action]["saved_seconds"] += saved_seconds

        ts = str(event.get("timestamp", ""))
        day = ts[:10]
        try:
            datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            day = "unknown"
        by_day[day]["count"] += 1
        by_day[day]["saved_seconds"] += saved_seconds

        total_saved += saved_seconds

    total_count = len(events)
    success_count = len(successes)
    success_rate = (success_count / total_count) if total_count else 0.0
    avg_saved = (total_saved / success_count) if success_count else 0.0

    report = {
        "summary": {
            "total_runs": total_count,
            "success_rate": round(success_rate, 4),
            "total_saved_seconds": round(total_saved, 3),
            "average_saved_seconds_per_run": round(avg_saved, 3),
            "excluded_records": excluded,
        },
        "saved_hours": round(total_saved / 3600.0, 3),
        "by_action": {k: {"count": int(v["count"]), "saved_seconds": round(v["saved_seconds"], 3)} for k, v in sorted(by_action.items())},
        "by_day": {k: {"count": int(v["count"]), "saved_seconds": round(v["saved_seconds"], 3)} for k, v in sorted(by_day.items())},
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== Efficiency Report ===")
    print(f"Input: {input_path}")
    print(f"Total runs: {report['summary']['total_runs']}")
    print(f"Success rate: {report['summary']['success_rate'] * 100:.2f}%")
    print(f"Total saved: {report['summary']['total_saved_seconds']:.2f} seconds")
    print(f"Average saved/run: {report['summary']['average_saved_seconds_per_run']:.2f} seconds")
    print(f"Output: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
