from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="CivicPulse AI Service", version="1.0.0")

SHARED_SECRET = os.getenv("AI_SERVICE_SHARED_SECRET", "dev-ai-secret-change-in-production")

def verify_secret(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    token = authorization.replace("Bearer ", "")
    if token != SHARED_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid shared secret")

class CategorizeRequest(BaseModel):
    description: str

class CategorizeResponse(BaseModel):
    category_key: str
    confidence: float
    reasoning: str
    suggested_title: str

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "civicpulse-ai-service"}

@app.post("/v1/categorize", response_model=CategorizeResponse)
def categorize(req: CategorizeRequest, authorization: Optional[str] = Header(None)):
    verify_secret(authorization)
    text = req.description.lower()
    
    if any(k in text for k in ["water", "pipe", "leak", "tap", "paani", "pani", "nal"]):
        return CategorizeResponse(
            category_key="water_supply",
            confidence=0.92,
            reasoning="Keyword match on water supply terms",
            suggested_title="Water supply disruption / pipeline issue"
        )
    elif any(k in text for k in ["road", "pothole", "tar", "asphalt", "gaddha"]):
        return CategorizeResponse(
            category_key="road_damage",
            confidence=0.95,
            reasoning="Road defect keywords detected",
            suggested_title="Road damage / Pothole repair needed"
        )
    elif any(k in text for k in ["garbage", "trash", "waste", "dump", "dustbin", "kachra"]):
        return CategorizeResponse(
            category_key="garbage_waste",
            confidence=0.91,
            reasoning="Waste and garbage keywords detected",
            suggested_title="Uncollected garbage / waste accumulation"
        )
    elif any(k in text for k in ["light", "dark", "lamp", "pole", "bulb"]):
        return CategorizeResponse(
            category_key="streetlight",
            confidence=0.94,
            reasoning="Streetlight keywords detected",
            suggested_title="Non-functional streetlight"
        )
    elif any(k in text for k in ["drain", "sewage", "gutter", "overflow", "naali"]):
        return CategorizeResponse(
            category_key="sanitation_sewage",
            confidence=0.93,
            reasoning="Drainage / sewage keywords detected",
            suggested_title="Overflowing drain / sewage blockage"
        )
    elif any(k in text for k in ["danger", "electric", "wire", "shock", "collapse", "risk"]):
        return CategorizeResponse(
            category_key="public_safety",
            confidence=0.96,
            reasoning="Hazardous condition detected",
            suggested_title="Urgent public safety hazard"
        )
    else:
        return CategorizeResponse(
            category_key="minor_maintenance",
            confidence=0.60,
            reasoning="General civic maintenance",
            suggested_title="Civic maintenance report"
        )
