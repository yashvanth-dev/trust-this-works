# SIH25022 - Maximizing Section Throughput Using AI-Powered Precise Train Traffic Control

This project is a working prototype for the Smart India Hackathon problem statement SIH25022. It models the real **Chennai Central (MAS) → Coimbatore Junction (CBE)** main line (Southern Railway) using real station data, real verified distances, and real train schedules.

## The Corridor
- **Route:** Chennai Central (MAS) → Katpadi (KPD) → Jolarpettai (JTJ) → Salem (SA) → Erode (ED) → Tiruppur (TUP) → Coimbatore (CBE).
- **Total Distance:** 497 km.
- **Data Source:** Verified against etrain.info (August 2026).
- **Single-line Bottleneck:** Erode → Coimbatore (Tiruppur/Irugur stretch approaching CBE). We have modeled this specific section as single-line, citing the currently-in-progress Coimbatore-Irugur line doubling project. The remainder of the corridor (MAS through Erode) is double-line.

## The AI Scheduling Approach (CP-SAT)
Rather than Reinforcement Learning (which requires millions of training episodes), we use Google OR-Tools CP-SAT (Constraint Programming) to solve the exact train dispatch problem optimally in seconds.

### Constraints Enforced:
1. **Travel Time Constraints:** Trains must take the correct duration to cross each segment based on their class profile.
2. **Kavach Moving Block Headway:** Fixed 5-minute headway maintained between consecutive trains on the same track.
3. **No Overlap (Rear-end Prevention):** Trains traveling in the same direction on double lines cannot overlap (overtakes require loop lines).
4. **Single-Line Conflict Prevention:** On the Erode-Coimbatore section, trains in opposite directions share the track and cannot overlap, forcing one to wait in a siding.
5. **Loop-line Siding Capacity:** Junction stations have limited loop lines to hold waiting trains. Modeled via Cumulative Constraints.

### Objective
**Minimize Priority-Weighted Delay:** We minimize the weighted sum of arrival delays, strictly prioritizing Vande Bharat / Shatabdi trains over Express, Passenger, and Freight trains.

## Running the Project
The backend is a FastAPI server, and the frontend is a React + Vite application.

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Future Work
- Integrate live CRIS API feeds for real-time delay telemetry.
- Expand topology graph to cover the entire Southern Railway zone.
