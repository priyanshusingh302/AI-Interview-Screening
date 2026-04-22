import asyncio
import logging
from bson import ObjectId
from datetime import datetime, timezone
from database import candidates_collection, jobs_collection, interviews_collection
from services.bolna import create_call

logger = logging.getLogger(__name__)

# The global in-memory queue
interview_queue = asyncio.Queue()

async def process_queue():
    logger.info("Started background interview queue processor.")
    while True:
        try:
            candidate_id = await interview_queue.get()
        except asyncio.CancelledError:
            break
            
        try:
            logger.info(f"Picked up candidate {candidate_id} from queue.")
            
            candidate = await candidates_collection.find_one({"_id": ObjectId(candidate_id)})
            if not candidate:
                logger.error(f"Candidate not found: {candidate_id}")
                continue
                
            job = await jobs_collection.find_one({"_id": ObjectId(candidate["job_id"])})
            if not job:
                logger.error(f"Job not found for candidate {candidate_id}")
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
                
                await candidates_collection.update_one(
                    {"_id": candidate["_id"]},
                    {"$set": {"status": "calling"}}
                )
                logger.info(f"Successfully initiated interview for candidate {candidate_id}")
            except Exception as e:
                logger.error(f"Error initiating call for candidate {candidate_id}: {e}")
            
            # Simple throttle to prevent concurrently overwhelming bolna queue
            await asyncio.sleep(2)
            
        except Exception as e:
            logger.error(f"Unexpected error processing queue item: {e}")
        finally:
            interview_queue.task_done()
