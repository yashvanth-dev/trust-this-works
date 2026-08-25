from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scheduler.compare import compare_schedules
import dataclasses

app = FastAPI(title="SIH25022 Train Scheduler API")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for hackathon deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compute schedules once on startup since the topology is static
print("Computing schedules (this takes ~30 seconds for CP-SAT)...")
results = compare_schedules()
baseline_result = results["baseline"]
optimized_result = results["optimized"]
improvement = results["improvement"]
print("Schedules computed successfully.")

@app.get("/schedule/optimized")
def get_optimized_schedule():
    """Returns the CP-SAT optimized schedule."""
    return dataclasses.asdict(optimized_result)

@app.get("/schedule/baseline")
def get_baseline_schedule():
    """Returns the FCFS baseline schedule."""
    return dataclasses.asdict(baseline_result)

@app.get("/compare")
def get_comparison():
    """Returns the high-level comparison metrics between the two schedulers."""
    return {
        "improvement": improvement,
        "baseline_summary": dataclasses.asdict(baseline_result.summary),
        "optimized_summary": dataclasses.asdict(optimized_result.summary)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
