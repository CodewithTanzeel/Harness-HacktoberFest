"""
TestCraft Engine - CLI Interface
Allows direct terminal execution of the autonomous test pipeline.
Usage:
    python3 engine/cli.py run samples/calculator.py --provider fake
    python3 engine/cli.py run samples/calculator.py --provider fake-simulate-repair
    python3 engine/cli.py list-runs
    python3 engine/cli.py show-run <run_id>
"""

import sys
import os
import argparse
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from engine.orchestrator import Orchestrator
from engine.store.run_store import RunStore
from engine.registry import ProviderRegistry

def main():
    parser = argparse.ArgumentParser(description="TestCraft Autonomous Pytest & Self-Healing Engine")
    subparsers = parser.add_subparsers(dest="command")

    # Command: run
    run_parser = subparsers.add_parser("run", help="Run the test generation and repair pipeline on a source file")
    run_parser.add_argument("target", help="Path to Python source file")
    run_parser.add_argument("--provider", default="fake", help="Provider ID (fake, fake-simulate-repair, etc.)")
    run_parser.add_argument("--json", action="store_true", help="Output full run record as JSON")

    # Command: list-runs
    list_parser = subparsers.add_parser("list-runs", help="List recent stored test runs")
    list_parser.add_argument("--limit", type=int, default=10, help="Number of records to show")

    # Command: show-run
    show_parser = subparsers.add_parser("show-run", help="Inspect a specific stored run by ID")
    show_parser.add_argument("run_id", help="The run ID")

    # Command: list-providers
    subparsers.add_parser("list-providers", help="List all registered test providers")

    args = parser.parse_args()

    if args.command == "run":
        orchestrator = Orchestrator()
        try:
            record = orchestrator.execute_pipeline(
                filepath=args.target,
                provider_id=args.provider,
                verbose=not args.json
            )
            if args.json:
                print(json.dumps(record.to_dict(), indent=2))
            sys.exit(0 if record.final_report and record.final_report.is_success else 1)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(2)

    elif args.command == "list-runs":
        store = RunStore()
        runs = store.list_runs(limit=args.limit)
        print(f"Found {len(runs)} past test runs:")
        for r in runs:
            status_symbol = "✔" if r.get("status") in ("passed", "repaired") else "✘"
            repaired_tag = " (AUTO-REPAIRED)" if r.get("was_repaired") else ""
            print(f"[{status_symbol}] {r.get('id')} | {r.get('target_filename')} | {r.get('passed')}/{r.get('total')} tests | {r.get('duration_ms', 0):.1f}ms{repaired_tag}")

    elif args.command == "show-run":
        store = RunStore()
        run = store.get_run(args.run_id)
        if not run:
            print(f"Run {args.run_id} not found.")
            sys.exit(1)
        print(json.dumps(run, indent=2))

    elif args.command == "list-providers":
        providers = ProviderRegistry.list_providers()
        print("Registered Providers:")
        for p in providers:
            print(f"  • {p['id']}: {p['name']} (Model: {p['model']})")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
