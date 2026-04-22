from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator
from typing import Optional, List, Annotated
from datetime import datetime, timezone

# Represents an ObjectId field in the database.
# It will be represented as a `str` on the model so that it can be serialized to JSON.
PyObjectId = Annotated[str, BeforeValidator(str)]

class JobBase(BaseModel):
    title: str
    company_name: str
    location: str
    employment_type: str
    remote_type: str
    experience_level: str
    description: str
    responsibilities: str
    requirements: str
    skills: List[str]
    application_fields: List[str]


class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    status: str = "open"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class CandidateBase(BaseModel):
    name: str
    phone: str
    email: str
    resume_url: Optional[str] = None
    extra_fields: Optional[dict] = None
    result: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateResponse(CandidateBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    job_id: str
    status: str = "applied"
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class InterviewStartRequest(BaseModel):
    candidate_ids: List[str]

class InterviewResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    candidate_id: str
    job_id: str

    execution_id: str
    status: str
    transcript: Optional[str] = None
    reasoning: Optional[str] = None
    result: Optional[str] = None
    duration: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class WebhookPayload(BaseModel):
    id: str
    status: str
    transcript: Optional[str] = None
    conversation_duration: Optional[float] = None
    # We can accept extra fields as it's a webhook
    model_config = ConfigDict(extra='allow')

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AdminUser(BaseModel):
    username: str

class AdminUserInDB(AdminUser):
    hashed_password: str

