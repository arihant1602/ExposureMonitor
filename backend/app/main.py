from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

app = FastAPI(
    title="ExposureMonitor API",
    description="Backend API for Dark Web Monitoring and Credential Leak Detection System",
    version="1.0.0"
)

# Configure CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckRequest(BaseModel):
    email: str

class CheckResponse(BaseModel):
    email: str
    is_exposed: bool
    breaches: list[str]
    risk_score: int

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.post("/api/check", response_model=CheckResponse)
async def check_exposure(request: CheckRequest):
    # Mock data for initial connection setup
    # In future, this will connect to the MongoDB and risk analysis engine
    email = request.email.lower()
    
    # Simulate processing delay
    time.sleep(1)

    # Basic mock logic
    if "exposed" in email:
        return CheckResponse(
            email=email,
            is_exposed=True,
            breaches=["Collection #1", "LinkedIn", "Canva"],
            risk_score=85
        )
    elif "safe" in email:
        return CheckResponse(
            email=email,
            is_exposed=False,
            breaches=[],
            risk_score=0
        )
    else:
        # Random/default mock response
        return CheckResponse(
            email=email,
            is_exposed=True,
            breaches=["Unknown Breach"],
            risk_score=30
        )
