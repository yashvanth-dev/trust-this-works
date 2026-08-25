"""
FCFS (First-Come-First-Served) baseline scheduler.
"""

import time
from typing import Dict, List, Tuple
from .models import (
    Train, Segment, ScheduleResult, TrainSchedule,
    SegmentSchedule, compute_summary,
)
from .topology import (
    TRAINS, SEGMENTS, STATIONS, HEADWAY_MINUTES,
    get_train_segments, get_train_station_order,
)


class SegmentOccupancy:
    def __init__(self):
        self.occupancies: List[Tuple[int, int]] = []

    def earliest_feasible_entry(self, earliest: int, duration: int) -> int:
        candidate = earliest
        while True:
            candidate_end = candidate + duration
            conflict = False
            for occ_entry, occ_exit in self.occupancies:
                if (candidate < occ_exit + HEADWAY_MINUTES
                        and occ_entry < candidate_end):
                    candidate = occ_exit + HEADWAY_MINUTES
                    conflict = True
                    break
            if not conflict:
                return candidate

    def add(self, entry_time: int, exit_time: int):
        self.occupancies.append((entry_time, exit_time))


class StationDwellTracker:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.dwells: List[Tuple[int, int]] = []

    def count_at(self, t: int) -> int:
        return sum(1 for s, e in self.dwells if s <= t < e)

    def earliest_arrival_with_room(self, desired_arrival: int) -> int:
        if self.count_at(desired_arrival) < self.capacity:
            return desired_arrival
        future_ends = sorted(set(e for _, e in self.dwells if e > desired_arrival))
        for end_time in future_ends:
            if self.count_at(end_time) < self.capacity:
                return end_time
        if self.dwells:
            return max(e for _, e in self.dwells)
        return desired_arrival

    def add(self, start: int, end: int):
        if start < end:
            self.dwells.append((start, end))


def solve_baseline() -> ScheduleResult:
    start_time = time.time()
    sorted_trains = sorted(TRAINS, key=lambda t: (t.entry_time, TRAINS.index(t)))

    segment_occupancy: Dict[str, SegmentOccupancy] = {}
    for seg in SEGMENTS:
        if seg.is_single_line:
            segment_occupancy[seg.name] = SegmentOccupancy()
        else:
            segment_occupancy[seg.name + "_UP"] = SegmentOccupancy()
            segment_occupancy[seg.name + "_DOWN"] = SegmentOccupancy()

    station_tracker: Dict[str, StationDwellTracker] = {}
    for station in STATIONS:
        if station.has_loop_line:
            station_tracker[station.name] = StationDwellTracker(station.loop_capacity)

    train_schedules: List[TrainSchedule] = []

    for train in sorted_trains:
        segments = get_train_segments(train)
        station_order = get_train_station_order(train)
        seg_schedules: List[SegmentSchedule] = []
        current_time = train.entry_time

        for j, seg in enumerate(segments):
            duration = train.segment_durations[j]

            if j > 0:
                intermediate_station = station_order[j]
                if intermediate_station in station_tracker:
                    tracker = station_tracker[intermediate_station]
                    current_time = tracker.earliest_arrival_with_room(current_time)

            if seg.is_single_line:
                track_id = seg.name
            else:
                track_id = seg.name + "_UP" if train.direction.value == "left" else seg.name + "_DOWN"

            entry_time = segment_occupancy[track_id].earliest_feasible_entry(current_time, duration)

            if j > 0:
                intermediate_station = station_order[j]
                if intermediate_station in station_tracker:
                    station_tracker[intermediate_station].add(current_time, entry_time)

            exit_time = entry_time + duration
            segment_occupancy[track_id].add(entry_time, exit_time)

            seg_schedules.append(SegmentSchedule(
                segment_name=seg.name,
                entry_time=entry_time,
                exit_time=exit_time,
            ))
            current_time = exit_time

        actual_finish = seg_schedules[-1].exit_time
        train_schedules.append(TrainSchedule(
            train_id=train.id,
            train_class=train.train_class.display_name,
            priority_weight=train.weight,
            direction=train.direction.value,
            segments=seg_schedules,
            scheduled_finish=train.ideal_finish_time,
            actual_finish=actual_finish,
            delay=max(0, actual_finish - train.ideal_finish_time)
        ))

    solve_duration = time.time() - start_time
    summary = compute_summary(train_schedules, solve_duration)
    return ScheduleResult(trains=train_schedules, summary=summary)
