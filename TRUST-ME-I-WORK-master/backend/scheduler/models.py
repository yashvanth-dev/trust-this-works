"""
Domain models for the railway section scheduling problem.
"""
from dataclasses import dataclass
from enum import Enum
from typing import List, Dict

class Direction(Enum):
    RIGHT = "right"  # MAS → CBE (DOWN)
    LEFT = "left"    # CBE → MAS (UP)

class TrainClass(Enum):
    RAJDHANI     = ("Rajdhani/Vande Bharat", 5)
    MAIL_EXPRESS = ("Mail/Express", 3)
    PASSENGER    = ("Passenger", 2)
    FREIGHT      = ("Freight", 1)

    def __init__(self, display_name: str, weight: int):
        self.display_name = display_name
        self.weight = weight

@dataclass
class Station:
    name: str
    distance_km: int = 0
    has_loop_line: bool = False
    loop_capacity: int = 0

@dataclass
class Segment:
    start_station: str
    end_station: str
    is_single_line: bool

    @property
    def name(self) -> str:
        return f"{self.start_station}-{self.end_station}"

@dataclass
class Train:
    id: str
    train_class: TrainClass
    origin: str
    destination: str
    direction: Direction
    entry_time: int
    segment_durations: List[int]

    @property
    def weight(self) -> int:
        return self.train_class.weight

    @property
    def ideal_total_duration(self) -> int:
        return sum(self.segment_durations)

    @property
    def ideal_finish_time(self) -> int:
        return self.entry_time + self.ideal_total_duration

@dataclass
class SegmentSchedule:
    segment_name: str
    entry_time: int
    exit_time: int

    def to_dict(self) -> dict:
        return {
            "segment": self.segment_name,
            "entry_time": self.entry_time,
            "exit_time": self.exit_time,
        }

@dataclass
class TrainSchedule:
    train_id: str
    train_class: str
    priority_weight: int
    direction: str
    segments: List[SegmentSchedule]
    scheduled_finish: int
    actual_finish: int
    delay: int

    def to_dict(self) -> dict:
        return {
            "id": self.train_id,
            "class": self.train_class,
            "priority_weight": self.priority_weight,
            "direction": self.direction,
            "segments": [s.to_dict() for s in self.segments],
            "scheduled_finish": self.scheduled_finish,
            "actual_finish": self.actual_finish,
            "delay": self.delay
        }

@dataclass
class ScheduleSummary:
    total_weighted_delay: float
    total_raw_delay: float
    throughput_trains_per_hour: float
    per_class_avg_delay: Dict[str, float]
    solve_time_seconds: float = 0.0
    is_proven_optimal: bool = True
    optimality_gap_pct: float = 0.0

    def to_dict(self) -> dict:
        return {
            "total_weighted_delay": self.total_weighted_delay,
            "total_raw_delay": self.total_raw_delay,
            "throughput_trains_per_hour": self.throughput_trains_per_hour,
            "per_class_avg_delay": self.per_class_avg_delay,
            "solve_time_seconds": self.solve_time_seconds,
            "is_proven_optimal": self.is_proven_optimal,
            "optimality_gap_pct": self.optimality_gap_pct,
        }

@dataclass
class ScheduleResult:
    trains: List[TrainSchedule]
    summary: ScheduleSummary

    def to_dict(self) -> dict:
        return {
            "trains": [t.to_dict() for t in self.trains],
            "summary": self.summary.to_dict(),
        }

def compute_summary(
    schedules: List[TrainSchedule],
    solve_time: float = 0.0,
    is_proven_optimal: bool = False,
    optimality_gap_pct: float = 0.0,
) -> ScheduleSummary:
    total_weighted_delay = sum(s.priority_weight * s.delay for s in schedules)
    total_raw_delay = sum(s.delay for s in schedules)

    all_entry = [seg.entry_time for s in schedules for seg in s.segments]
    all_exit  = [seg.exit_time  for s in schedules for seg in s.segments]
    window_start = min(all_entry) if all_entry else 0
    window_end   = max(all_exit)  if all_exit  else 1
    window_hours = max((window_end - window_start) / 60.0, 0.01)
    throughput = len(schedules) / window_hours

    class_delays: Dict[str, List[int]] = {}
    for s in schedules:
        class_delays.setdefault(s.train_class, []).append(s.delay)
    per_class_avg = {
        cls: round(sum(delays) / len(delays), 1)
        for cls, delays in class_delays.items()
    }

    return ScheduleSummary(
        total_weighted_delay=total_weighted_delay,
        total_raw_delay=total_raw_delay,
        throughput_trains_per_hour=round(throughput, 2),
        per_class_avg_delay=per_class_avg,
        solve_time_seconds=round(solve_time, 3),
        is_proven_optimal=is_proven_optimal,
        optimality_gap_pct=round(optimality_gap_pct, 1),
    )
