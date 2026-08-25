from .models import ScheduleResult
from .optimizer import solve_optimized
from .baseline import solve_baseline

def compare_schedules() -> dict:
    baseline = solve_baseline()
    optimized = solve_optimized()

    base_wd = max(baseline.summary.total_weighted_delay, 1)
    base_tp = max(baseline.summary.throughput_trains_per_hour, 0.01)

    improvement = {
        "weighted_delay_reduction": round(
            baseline.summary.total_weighted_delay - optimized.summary.total_weighted_delay, 1
        ),
        "weighted_delay_reduction_pct": round(
            (1 - optimized.summary.total_weighted_delay / base_wd) * 100, 1
        ),
        "raw_delay_reduction": round(
            baseline.summary.total_raw_delay - optimized.summary.total_raw_delay, 1
        ),
        "throughput_increase": round(
            optimized.summary.throughput_trains_per_hour - baseline.summary.throughput_trains_per_hour, 2
        ),
        "throughput_increase_pct": round(
            (optimized.summary.throughput_trains_per_hour / base_tp - 1) * 100, 1
        )
    }

    return {
        "baseline": baseline,
        "optimized": optimized,
        "improvement": improvement,
    }

def compare_to_dict() -> dict:
    results = compare_schedules()
    return {
        "baseline": results["baseline"].to_dict(),
        "optimized": results["optimized"].to_dict(),
        "improvement": results["improvement"],
    }
