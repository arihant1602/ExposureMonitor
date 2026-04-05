import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError

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

    suffixes = []
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT hash_suffix, count FROM leaked_passwords WHERE hash_prefix = ?
        ''', (prefix,))
        rows = cursor.fetchall()
        suffixes = [{"suffix": row['hash_suffix'], "count": row['count']} for row in rows]
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

    use_live_range_api = os.getenv("USE_LIVE_K_ANON_API", "0").strip().lower() in {"1", "true", "yes"}
    if use_live_range_api and not suffixes:
        try:
            suffixes = _fetch_live_k_anon_range(prefix)
        except Exception as e:
            # Keep API resilient: local mode continues even if live source is unavailable.
            logger.warning(f"Live k-anonymity range lookup failed for prefix {prefix}: {e}")

    return PasswordCheckResponse(prefix=prefix, suffixes=suffixes)


def _fetch_live_k_anon_range(prefix: str) -> List[Dict[str, Any]]:
    """Optional lawful live integration: query a k-anonymity range endpoint without sending plaintext passwords."""
    url = f"https://api.pwnedpasswords.com/range/{prefix}"
    req = urllib_request.Request(
        url,
        headers={
            "Add-Padding": "true",
            "User-Agent": "ExposureMonitor/1.0 (k-anonymity range lookup)",
        },
        method="GET",
    )

    try:
        with urllib_request.urlopen(req, timeout=8) as response:
            body = response.read().decode("utf-8", errors="ignore")
    except (HTTPError, URLError) as exc:
        raise RuntimeError(str(exc))

    parsed: List[Dict[str, Any]] = []
    for line in body.splitlines():
        if ":" not in line:
            continue
        suffix, count = line.split(":", 1)
        suffix = suffix.strip().upper()
        try:
            count_value = int(count.strip())
        except ValueError:
            continue
        if len(suffix) == 35:
            parsed.append({"suffix": suffix, "count": count_value})
    return parsed

@app.get("/api/breaches", response_model=List[Dict[str, Any]])
async def get_all_breaches():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM breaches ORDER BY date DESC")
        rows = cursor.fetchall()
        
        breaches = []
        for row in rows:
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
        return breaches
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.get("/api/breaches/{breach_id}/samples", response_model=List[str])
async def get_breach_samples(breach_id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT u.email FROM users u
            JOIN user_breaches ub ON u.id = ub.user_id
            WHERE ub.breach_id = ?
            LIMIT 10
        ''', (breach_id,))
        rows = cursor.fetchall()
        return [row['email'] for row in rows]
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.get("/api/stats")
async def get_global_stats():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM breaches")
        total_breaches = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM user_breaches")
        total_exposures = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM users")
        unique_emails = cursor.fetchone()[0]
        
        return {
            "total_breaches": total_breaches,
            "total_exposures": total_exposures,
            "unique_emails": unique_emails
        }
    except Exception as e:
        logger.error(f"Stats query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()
