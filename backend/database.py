import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.ai_screening_db

# Collections
jobs_collection = db.get_collection("jobs")
candidates_collection = db.get_collection("candidates")
interviews_collection = db.get_collection("interviews")
admin_collection = db.get_collection("admin_users")
webhooks_collection = db.get_collection("webhook_events")

# Note: We'll create indexes here if starting from scratch, but for MVP
# creating them implicitly or directly on DB is fine.
async def create_indexes():
    await jobs_collection.create_index("status")
    await jobs_collection.create_index("created_at")
    await candidates_collection.create_index("job_id")
    await candidates_collection.create_index("phone")
    await interviews_collection.create_index("execution_id", unique=True)
    await interviews_collection.create_index("candidate_id")
    await interviews_collection.create_index("job_id")
