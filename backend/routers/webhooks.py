from fastapi import APIRouter, BackgroundTasks
from models import WebhookPayload
from database import interviews_collection, candidates_collection, jobs_collection
from services.llm import generate_evaluation
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

async def process_evaluation(execution_id: str, transcript: str, job_id: str):
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        eval_result = {"result": "failed", "reasoning": "Job not found."}
    else:
        eval_result = await generate_evaluation(transcript, job)
        
    await interviews_collection.update_one(
        {"execution_id": execution_id},
        {"$set": {
            "result": eval_result.get("result", "failed"),
            "reasoning": eval_result.get("reasoning", "No reasoning provided.")
        }}
    )
    
    interview = await interviews_collection.find_one({"execution_id": execution_id})
    if interview:
        await candidates_collection.update_one(
            {"_id": ObjectId(interview["candidate_id"])},
            {"$set": {"result": eval_result.get("result", "failed")}}
        )

@router.post("/bolna")
async def bolna_webhook(payload: WebhookPayload, background_tasks: BackgroundTasks):
    # Find matching interview
    interview = await interviews_collection.find_one({"execution_id": payload.id})
    if not interview:
        return {"status": "ignored", "reason": "execution_id not found"}
        
    # Idempotency check 
    # if interview.get("status") == payload.status and payload.status == "completed":
    #     return {"status": "ignored", "reason": "already processed"}
        
    actual_status = payload.status
    if actual_status == "call-disconnected" and payload.transcript and payload.transcript.strip():
        actual_status = "completed"
        
    update_data = {
        "status": actual_status,
        "transcript": payload.transcript,
        "duration": payload.conversation_duration
    }
    
    if actual_status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc)
        
    await interviews_collection.update_one(
        {"execution_id": payload.id},
        {"$set": update_data}
    )
    
    # Update related candidate status
    await candidates_collection.update_one(
        {"_id": ObjectId(interview["candidate_id"])},
        {"$set": {"status": actual_status}}
    )
    
    if actual_status == "completed" and payload.transcript:
        background_tasks.add_task(process_evaluation, payload.id, payload.transcript, str(interview["job_id"]))
        
    return {"status": "success"}
