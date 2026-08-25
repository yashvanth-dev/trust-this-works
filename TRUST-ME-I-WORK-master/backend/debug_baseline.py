#!/usr/bin/env python3
"""Debug script to trace what FCFS does step by step."""
from scheduler.models import SegmentSchedule, TrainSchedule, compute_summary
from scheduler.topology import (
    TRAINS, SEGMENTS, STATIONS, STATION_MAP, HEADWAY_MINUTES,
    get_train_segments, get_train_station_order,
)
from scheduler.baseline import SegmentOccupancy, StationDwellTracker

sorted_trains = sorted(TRAINS, key=lambda t: (t.entry_time, TRAINS.index(t)))

segment_occupancy = {}
for seg in SEGMENTS:
    if seg.is_single_line:
        segment_occupancy[seg.name] = SegmentOccupancy()

station_tracker = {}
for station in STATIONS:
    if station.has_loop_line:
        station_tracker[station.name] = StationDwellTracker(station.loop_capacity)

for train in sorted_trains:
    segments = get_train_segments(train)
    station_order = get_train_station_order(train)
    print(f"\n=== {train.id} ({train.train_class.display_name}, dir={train.direction.value}) ===")
    print(f"    Route: {' -> '.join(station_order)}")
    print(f"    Segments: {[s.name for s in segments]}")
    print(f"    Entry time: {train.entry_time}")

    current_time = train.entry_time
    seg_schedules = []

    for j, seg in enumerate(segments):
        duration = train.segment_durations[j]
        
        if seg.is_single_line:
            entry_time = segment_occupancy[seg.name].earliest_feasible_entry(current_time, duration)
        else:
            entry_time = current_time

        # Loop capacity check
        if j > 0:
            intermediate_station = station_order[j]
            if intermediate_station in station_tracker:
                tracker = station_tracker[intermediate_station]
                dwell_start = current_time
                dwell_end = entry_time
                
                print(f"    Station {intermediate_station}: dwell [{dwell_start}, {dwell_end}), "
                      f"existing dwells={tracker.dwells}, "
                      f"can_dwell={tracker.can_dwell(dwell_start, dwell_end)}")
                
                attempts = 0
                while not tracker.can_dwell(dwell_start, dwell_end):
                    attempts += 1
                    if attempts > 20:
                        print(f"    *** DEADLOCK after {attempts} attempts!")
                        # Show what's at the station
                        for t in range(dwell_start, dwell_end + 5):
                            print(f"      t={t}: {tracker.count_at(t)} trains dwelling")
                        raise SystemExit(1)
                    entry_time += 1
                    if seg.is_single_line:
                        entry_time = segment_occupancy[seg.name].earliest_feasible_entry(entry_time, duration)
                    dwell_end = entry_time
                    
                tracker.add(dwell_start, dwell_end)

        exit_time = entry_time + duration
        if seg.is_single_line:
            segment_occupancy[seg.name].add(entry_time, exit_time)

        print(f"    Seg {seg.name} ({'SL' if seg.is_single_line else 'DL'}): "
              f"entry={entry_time}, exit={exit_time}, dur={duration}")
        
        current_time = exit_time

    print(f"    Finish: {current_time}, ideal={train.ideal_finish_time}, "
          f"delay={max(0, current_time - train.ideal_finish_time)}")
