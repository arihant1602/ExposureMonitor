from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class Breach(BaseModel):
    name: str
    date: date
    severity: int = Field(ge=1, le=10, description="Severity of the breach from 1 to 10")
    domains: List[str]
    compromised_data: List[str]

class UserExposure(BaseModel):
    email: str
    breaches: List[Breach] = []
