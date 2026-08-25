#!/usr/bin/env python3
"""
CLI runner — runs both schedulers and prints a before/after comparison.

Usage:
    cd backend
    python main_cli.py
"""
from scheduler.compare import compare_schedules


def fmt_time(minutes: int) -> str:
    """Format minutes as H:MM for readability."""
    h, m = divmod(minutes, 60)
    return f"{h}:{m:02d}"


def main():
    print()
    print("=" * 72)
    print("  SIH25022: AI-Powered Precise Train Traffic Control")
    print("  Baseline (FCFS manual control)  vs.  Optimized (CP-SAT AI)")
    print("=" * 72)
    print()

    results = compare_schedules()
    baseline  = results["baseline"]
    optimized = results["optimized"]
    imp       = results["improvement"]

    # ── Per-train detail tables ──────────────────────────────────────

    for label, schedule in [("BASELINE (FCFS)", baseline),
                            ("OPTIMIZED (CP-SAT)", optimized)]:
        print(f"  ┌─ {label} {'─' * (56 - len(label))}┐")
        print(f"  │ {'Train':<10} {'Class':<22} {'Wt':>2}  "
              f"{'Ideal':>6}  {'Actual':>6}  {'Delay':>5} │")
        print(f"  │ {'─'*10} {'─'*22} {'─'*2}  {'─'*6}  {'─'*6}  {'─'*5} │")

        for t in schedule.trains:
            print(f"  │ {t.train_id:<10} {t.train_class:<22} {t.priority_weight:>2}  "
                  f"{fmt_time(t.scheduled_finish):>6}  "
                  f"{fmt_time(t.actual_finish):>6}  "
                  f"{t.delay:>4}m │")

        s = schedule.summary
        print(f"  │{'─' * 60}│")
        print(f"  │  Total weighted delay: {s.total_weighted_delay:>8.0f}  "
              f"│  Throughput: {s.throughput_trains_per_hour:>5.2f} trains/hr │")
        print(f"  │  Total raw delay:      {s.total_raw_delay:>8.0f}m "
              f"│  Solve time: {s.solve_time_seconds:>7.3f}s       │")
        print(f"  └{'─' * 60}┘")
        print()

    # ── Per-class average delay ──────────────────────────────────────

    print("  Per-class average delay (minutes):")
    print(f"  {'Class':<25} {'Baseline':>10} {'Optimized':>10} {'Saved':>10}")
    print(f"  {'─'*25} {'─'*10} {'─'*10} {'─'*10}")

    all_classes = list(baseline.summary.per_class_avg_delay.keys())
    for cls in all_classes:
        b = baseline.summary.per_class_avg_delay.get(cls, 0)
        o = optimized.summary.per_class_avg_delay.get(cls, 0)
        print(f"  {cls:<25} {b:>10.1f} {o:>10.1f} {b - o:>10.1f}")

    # ── Headline improvement ─────────────────────────────────────────

    print()
    print("  ╔══════════════════════════════════════════════════════════╗")
    print(f"  ║  WEIGHTED DELAY REDUCTION:  "
          f"{imp['weighted_delay_reduction']:>7.0f}  "
          f"({imp['weighted_delay_reduction_pct']:>+.1f}%)"
          f"{'':>13}║")
    print(f"  ║  RAW DELAY REDUCTION:       "
          f"{imp['raw_delay_reduction']:>7.0f}m "
          f"{'':>22}║")
    print(f"  ║  THROUGHPUT CHANGE:          "
          f"{imp['throughput_increase']:>+6.2f} trains/hr "
          f"({imp['throughput_increase_pct']:>+.1f}%)"
          f"{'':>5}║")
    print("  ╚══════════════════════════════════════════════════════════╝")
    print()

    # ── Segment-level detail for optimized schedule ──────────────────

    print("  Optimized schedule segment detail:")
    print(f"  {'Train':<10} │ ", end="")
    for t in optimized.trains[:1]:  # just print header from first train's segments
        for seg in t.segments:
            print(f" {seg.segment_name:^11} │", end="")
    print()

    for t in optimized.trains:
        print(f"  {t.train_id:<10} │ ", end="")
        for seg in t.segments:
            print(f" {fmt_time(seg.entry_time)}-{fmt_time(seg.exit_time):>5} │", end="")
        print(f"  delay={t.delay}m")

    print()


if __name__ == "__main__":
    main()
