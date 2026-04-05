import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from app.database import get_db_connection, init_db
from app.services.risk_engine import calculate_risk_score, generate_playbook
from app.models import UserExposure, Breach
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="ExposureMonitor API",
    description="Backend API for Dark Web Monitoring and Credential Leak Detection System",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_db_client():
    init_db()

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
    breaches: List[Dict[str, Any]]
    risk_score: int
    recommendations: List[str]

class DomainCheckRequest(BaseModel):
    domain: str

class DomainCheckResponse(BaseModel):
    domain: str
    exposed_emails: List[Dict[str, Any]]

class PasswordSuffixResponse(BaseModel):
    suffix: str
    count: int

class PasswordCheckResponse(BaseModel):
    prefix: str
    suffixes: List[PasswordSuffixResponse]

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.post("/api/check", response_model=CheckResponse)
async def check_exposure(request: CheckRequest):
    email = request.email.lower()
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Get user
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if user:
            # Get breaches for user
            cursor.execute('''
                SELECT b.* FROM breaches b
                JOIN user_breaches ub ON b.id = ub.breach_id
                WHERE ub.user_id = ?
            ''', (user['id'],))
            
            breach_rows = cursor.fetchall()
            
            breaches = []
            for row in breach_rows:
                breach = dict(row)
                if isinstance(breach.get('compromised_data'), str):
                    try:
                        breach['compromised_data'] = json.loads(breach['compromised_data'])
                    except json.JSONDecodeError:
                        breach['compromised_data'] = []
                if isinstance(breach.get('domains'), str):
                    try:
                        breach['domains'] = json.loads(breach['domains'])
                    except json.JSONDecodeError:
                        breach['domains'] = []
                breaches.append(breach)
                
            risk_score = calculate_risk_score(breaches)
            recommendations = generate_playbook(breaches)
            
            return CheckResponse(
                email=email,
                is_exposed=bool(breaches),
                breaches=breaches,
                risk_score=risk_score,
                recommendations=recommendations
            )
        else:
            return CheckResponse(
                email=email,
                is_exposed=False,
                breaches=[],
                risk_score=0,
                recommendations=[]
            )
            
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.post("/api/check/domain", response_model=DomainCheckResponse)
async def check_domain_exposure(request: DomainCheckRequest):
    domain = request.domain.lower()
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Find all users with email ending in @domain
        cursor.execute("SELECT id, email FROM users WHERE email LIKE ?", (f"%@{domain}",))
        users = cursor.fetchall()
        
        exposed_emails = []
        for user in users:
            cursor.execute('''
                SELECT b.name FROM breaches b
                JOIN user_breaches ub ON b.id = ub.breach_id
                WHERE ub.user_id = ?
            ''', (user['id'],))
            breach_rows = cursor.fetchall()
            if breach_rows:
                exposed_emails.append({
                    "email": user['email'],
                    "breaches": [row['name'] for row in breach_rows]
                })
                
        return DomainCheckResponse(
            domain=domain,
            exposed_emails=exposed_emails
        )
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.get("/api/check/password/{hash_prefix}", response_model=PasswordCheckResponse)
async def check_password(hash_prefix: str):
    prefix = hash_prefix.upper()
    if len(prefix) != 5:
        raise HTTPException(status_code=400, detail="Hash prefix must be exactly 5 characters")
        
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT hash_suffix, count FROM leaked_passwords WHERE hash_prefix = ?
        ''', (prefix,))
        rows = cursor.fetchall()
        
        suffixes = [{"suffix": row['hash_suffix'], "count": row['count']} for row in rows]
        
        return PasswordCheckResponse(
            prefix=prefix,
            suffixes=suffixes
        )
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()