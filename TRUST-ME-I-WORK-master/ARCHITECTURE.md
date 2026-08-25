# SIH25022 Train Scheduler - System Architecture & Workflow

This document outlines the end-to-end system architecture and data workflow for the AI-Powered Train Traffic Control system, categorized by the core technological pillars.

```mermaid
flowchart TD
    %% Cloud & Hosting Environment encompasses everything
    subgraph Cloud ["☁️ Cloud & Hosting (AWS / Docker)"]
        direction TB

        %% Frontend Layer
        subgraph Frontend ["🖥️ Frontend"]
            ReactUI["React + Vite Dashboard\n(Gantt, Map, Live Telemetry)"]
        end

        %% Backend Layer
        subgraph Backend ["⚙️ Backend"]
            FastAPI["FastAPI Server\n(Uvicorn, REST API)"]
        end

        %% AI/ML Layer
        subgraph AIML ["🧠 AI/ML"]
            CPSAT["Google OR-Tools\n(CP-SAT Solver)"]
            Physics["Kinematics Engine\n(Predictive Braking Math)"]
        end

        %% Database Layer
        subgraph Database ["💾 Database"]
            TopologyDB["Railway Topology DB\n(Stations, Distances)"]
            TimetableDB["Timetable DB\n(Train Rosters, Priorities)"]
        end

        %% Notifications Layer
        subgraph Notifications ["🔔 Notifications"]
            AlertService["Alert Service\n(Station Master SMS/Email)"]
            SignalUpdates["Live Signal Updates\n(WebSocket Stream)"]
        end
    end

    %% Define the Workflow Connections
    ReactUI -->|"1. User requests live schedule"| FastAPI
    
    FastAPI -->|"2. Query network state"| TopologyDB
    FastAPI -->|"3. Query active trains"| TimetableDB
    
    TopologyDB -->|"4. Return data"| FastAPI
    TimetableDB -->|"4. Return data"| FastAPI
    
    FastAPI -->|"5. Send parameters to AI"| CPSAT
    CPSAT <-->|"6. Process movement physics"| Physics
    CPSAT -->|"7. Return collision-free routes"| FastAPI
    
    FastAPI -->|"8. Serve JSON response"| ReactUI
    FastAPI -->|"9. Dispatch warnings/delays"| AlertService
    FastAPI -->|"10. Stream telemetry"| SignalUpdates
    
    SignalUpdates -->|"11. Live UI Updates"| ReactUI

    %% Styling
    style Cloud fill:#f8f9fa,stroke:#dee2e6,stroke-width:2px,color:#000
    style Frontend fill:#e3f2fd,stroke:#2196f3,stroke-width:2px,color:#000
    style Backend fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000
    style AIML fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000
    style Database fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000
    style Notifications fill:#ffebee,stroke:#f44336,stroke-width:2px,color:#000
```

## Architectural Breakdown

*   **Frontend:** Built with React and Vite. Handles the user interface, rendering the interactive Gantt chart, the live geographic route map, and the real-time physics telemetry.
*   **Backend:** A Python-based FastAPI server running on Uvicorn. It acts as the central orchestrator, handling API requests, managing data flow, and wrapping the AI models.
*   **AI/ML:** The core intelligence layer powered by Google OR-Tools. It uses a Constraint Programming (CP-SAT) solver to evaluate billions of possible routing combinations in seconds, minimizing weighted delay while strictly enforcing physical kinematics.
*   **Database:** Stores the static railway topology (MAS-CBE station distances, single/double track flags) and dynamic timetable data (train classes, priority weights, scheduled entry times).
*   **Notifications:** The dispatch layer. If the AI detects a delay or modifies a route, this system pushes alerts to Station Masters and streams live signal state changes back to the dashboard.
*   **Cloud & Hosting:** The deployment infrastructure. The frontend can be hosted on edge networks (like Vercel/Netlify), while the backend and AI solver run in containerized Docker environments (e.g., AWS EC2 or Google Cloud Run) for scalable compute power.
