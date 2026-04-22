from fastapi import APIRouter, HTTPException, Path, Depends
from models import JobCreate, JobResponse, AdminUserInDB
from database import jobs_collection
from bson import ObjectId
from datetime import datetime, timezone
from routers.auth import get_current_admin

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("", response_model=JobResponse)
async def create_job(job: JobCreate, admin: AdminUserInDB = Depends(get_current_admin)):
    new_job = job.model_dump()
    new_job["status"] = "open"
    new_job["created_at"] = datetime.now(timezone.utc)
    new_job["updated_at"] = datetime.now(timezone.utc)
    
    result = await jobs_collection.insert_one(new_job)
    created_job = await jobs_collection.find_one({"_id": result.inserted_id})
    return created_job

@router.get("", response_model=list[JobResponse])
async def list_jobs():
    jobs = await jobs_collection.find({"status": "open"}).to_list(1000)
    return jobs

@router.get("/admin/all", response_model=list[JobResponse])
async def list_all_jobs(admin: AdminUserInDB = Depends(get_current_admin)):
    jobs = await jobs_collection.find().to_list(1000)
    return jobs

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
