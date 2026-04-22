from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from models import InterviewStartRequest, InterviewResponse, AdminUserInDB
from database import interviews_collection, candidates_collection, jobs_collection
from services.bolna import create_call
from bson import ObjectId
from datetime import datetime, timezone
from routers.auth import get_current_admin

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.post("/start")
async def start_interviews(request: InterviewStartRequest, background_tasks: BackgroundTasks, admin: AdminUserInDB = Depends(get_current_admin)):
    started_count = 0
    errors = []
    
    for c_id in request.candidate_ids:
        if not ObjectId.is_valid(c_id):
            errors.append(f"Invalid candidate id {c_id}")
            continue
            
        candidate = await candidates_collection.find_one({"_id": ObjectId(c_id)})
        if not candidate:
            errors.append(f"Candidate not found {c_id}")
            continue
            
        job = await jobs_collection.find_one({"_id": ObjectId(candidate["job_id"])})
        if not job:
            errors.append(f"Job not found for candidate {c_id}")
            continue
            
        try:
            variables = {
                    "candidate_name": candidate["name"],
                    "job_position": job["title"],
                    "job_company": job["company_name"],
                    "required_skills": ", ".join(job["skills"]),
                    "experience_level": job["experience_level"],
                    "job_requirements": job["requirements"]
                }
            bolna_resp = await create_call(candidate["phone"], variables)
            execution_id = bolna_resp.get("execution_id") or str(ObjectId())
            
            interview_doc = {
                "candidate_id": str(candidate["_id"]),
                "job_id": str(job["_id"]),
                "execution_id": execution_id,
                "status": "calling",
                "started_at": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc),
                "duration": None,
                "transcript": None,
                "summary": None,
                "completed_at": None
            }
            await interviews_collection.insert_one(interview_doc)
            
            # Update candidate status
            await candidates_collection.update_one(
                {"_id": candidate["_id"]},
                {"$set": {"status": "calling"}}
            )
            started_count += 1
            
        except Exception as e:
            errors.append(f"Error for {c_id}: {str(e)}")
            
    return {"started": started_count, "errors": errors}

@router.get("/{candidate_id}", response_model=InterviewResponse)
async def get_interview(candidate_id: str, admin: AdminUserInDB = Depends(get_current_admin)):
    interview = await interviews_collection.find_one({"candidate_id": candidate_id}, sort=[("created_at", -1)])
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview
