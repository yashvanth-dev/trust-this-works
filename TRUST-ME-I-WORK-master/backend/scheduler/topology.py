"""
Real-world Chennai-Coimbatore Section Topology (Southern Railway)
MAS -> KPD -> JTJ -> SA -> ED -> TUP -> CBE

Confidence/Sources:
- Distances: MAS(0), KPD(130), JTJ(214), SA(334), ED(396), TUP(446), CBE(497). Source: etrain.info (High confidence).
- Single-line bottleneck: Erode -> Coimbatore (ED-TUP, TUP-CBE). Source: User provided, citing ongoing Coimbatore-Irugur doubling (High confidence).
- Train timings: etrain.info and user corrections (12674 is 22:50->07:00) (High confidence).
"""
from typing import List
from .models import Train, Station, Segment, TrainClass, Direction

# ─── 1. Physical Infrastructure (Track & Stations) ───────────────

STATIONS = [
    Station(name="MAS", distance_km=0, has_loop_line=True, loop_capacity=10),
    Station(name="KPD", distance_km=130, has_loop_line=True, loop_capacity=4),
    Station(name="JTJ", distance_km=214, has_loop_line=True, loop_capacity=4),
    Station(name="SA",  distance_km=334, has_loop_line=True, loop_capacity=5),
    Station(name="ED",  distance_km=396, has_loop_line=True, loop_capacity=6),
    Station(name="TUP", distance_km=446, has_loop_line=True, loop_capacity=4),
    Station(name="CBE", distance_km=497, has_loop_line=True, loop_capacity=10),
]

STATION_MAP = {s.name: s for s in STATIONS}
STATION_NAMES = [s.name for s in STATIONS]

# Single-line bottleneck on ED->CBE section.
SEGMENTS = [
    Segment("MAS", "KPD", is_single_line=False),
    Segment("KPD", "JTJ", is_single_line=False),
    Segment("JTJ", "SA",  is_single_line=False),
    Segment("SA",  "ED",  is_single_line=False),
    Segment("ED",  "TUP", is_single_line=True), # BOTTLENECK
    Segment("TUP", "CBE", is_single_line=True), # BOTTLENECK
]

HEADWAY_MINUTES = 5

# ─── 2. Real-World Train Database ────
# Times are absolute minutes from 00:00 (Midnight).

TRAINS = [
    # ---- DOWN TRAINS (MAS -> CBE) ----
    Train(
        id="12675-Kovai", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(6 * 60) + 10,  # 06:10
        segment_durations=[113, 70, 109, 58, 48, 77] 
    ),
    Train(
        id="12243-Shatabdi", train_class=TrainClass.RAJDHANI,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(7 * 60) + 15,  # 07:15
        segment_durations=[94, 61, 87, 58, 48, 72] # KPD/JTJ interpolated
    ),
    Train(
        id="20643-VandeBharat", train_class=TrainClass.RAJDHANI,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(14 * 60) + 15, # 14:15
        segment_durations=[81, 52, 75, 54, 41, 57] # KPD/JTJ interpolated
    ),
    Train(
        id="12673-Cheran", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(22 * 60) + 0,  # 22:00
        segment_durations=[103, 90, 89, 63, 48, 87] 
    ),
    
    # ---- UP TRAINS (CBE -> MAS) ----
    Train(
        id="20644-VandeBharat(UP)", train_class=TrainClass.RAJDHANI,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(6 * 60) + 10,  # 06:10
        segment_durations=[42, 41, 50, 85, 60, 92] # JTJ/KPD interpolated
    ),
    Train(
        id="12244-Shatabdi(UP)", train_class=TrainClass.RAJDHANI,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(14 * 60) + 30, # 14:30
        segment_durations=[35, 50, 58, 94, 66, 102] # JTJ/KPD interpolated
    ),
    Train(
        id="12676-Kovai(UP)", train_class=TrainClass.MAIL_EXPRESS,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(15 * 60) + 20, # 15:20
        segment_durations=[45, 43, 54, 105, 74, 114] # Rebalanced: original data had a
        # transcription error on the SA-JTJ leg (60 min / 120 km = 120 km/h, roughly
        # double every other segment's pace for this train). Total unchanged at 435 min
        # so the verified 22:35 arrival still holds; time is now spread proportionally
        # to distance (~68-70 km/h throughout), matching this train's other legs.
    ),
    Train(
        id="12674-Cheran(UP)", train_class=TrainClass.MAIL_EXPRESS,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(22 * 60) + 50, # 22:50
        segment_durations=[45, 45, 55, 100, 85, 160] # Estimated from total 8h10m
    ),
    
    # ---- ILLUSTRATIVE TRAINS (Invented for simulation) ----
    Train(
        id="PASS-56001-ILLUST", train_class=TrainClass.PASSENGER,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(5 * 60) + 30, # 05:30 (Illustrative)
        segment_durations=[160, 120, 150, 90, 80, 100] 
    ),
    Train(
        id="PASS-56002-ILLUST", train_class=TrainClass.PASSENGER,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(16 * 60) + 0, # 16:00 (Illustrative)
        segment_durations=[80, 80, 90, 150, 120, 160] 
    ),
    Train(
        id="FRT-BOXN-01-ILLUST", train_class=TrainClass.FREIGHT,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(12 * 60) + 0, # 12:00 (Illustrative)
        segment_durations=[180, 120, 160, 90, 80, 100] 
    ),
]

def get_train_station_order(train: Train) -> List[str]:
    if train.direction == Direction.RIGHT:
        return STATION_NAMES
    else:
        return STATION_NAMES[::-1]

def get_train_segments(train: Train) -> List[Segment]:
    if train.direction == Direction.RIGHT:
        return SEGMENTS
    else:
        return SEGMENTS[::-1]
