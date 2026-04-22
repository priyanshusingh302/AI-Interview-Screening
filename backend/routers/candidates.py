from fastapi import APIRouter, HTTPException, Depends
from models import CandidateCreate, CandidateResponse, AdminUserInDB
from database import candidates_collection, jobs_collection
from bson import ObjectId
from datetime import datetime, timezone
import re
from routers.auth import get_current_admin

router = APIRouter(prefix="", tags=["Candidates"])

def is_valid_phone(phone: str) -> bool:
    # E.164 simple check: + followed by 1 to 14 digits
    return re.match(r"^\+[1-9]\d{1,14}$", phone) is not None

@router.post("/apply/{job_id}", response_model=CandidateResponse)
async def apply_for_job(job_id: str, candidate: CandidateCreate):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid Job ID")
    
    # Check if job exists
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if not is_valid_phone(candidate.phone):
        raise HTTPException(status_code=400, detail="Phone must be in E.164 format (e.g., +919012345678)")
        
    new_candidate = candidate.model_dump()
    new_candidate["job_id"] = job_id
    new_candidate["status"] = "applied"
    new_candidate["created_at"] = datetime.now(timezone.utc)
    
    result = await candidates_collection.insert_one(new_candidate)
    
    from queue_worker import interview_queue
    interview_queue.put_nowait(str(result.inserted_id))
    
    created = await candidates_collection.find_one({"_id": result.inserted_id})
    return created

@router.get("/candidates", response_model=list[CandidateResponse])
async def get_candidates(job_id: str, admin: AdminUserInDB = Depends(get_current_admin)):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid Job ID")
    
    candidates = await candidates_collection.find({"job_id": job_id}).to_list(1000)
    return candidates

@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
async def get_candidate_by_id(candidate_id: str, admin: AdminUserInDB = Depends(get_current_admin)):
    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(status_code=400, detail="Invalid Candidate ID")
        
    candidate = await candidates_collection.find_one({"_id": ObjectId(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    return candidate
