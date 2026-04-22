import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import jobs, candidates, interviews, webhooks, auth
import logging
import traceback
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from queue_worker import process_queue
    task = asyncio.create_task(process_queue())
    yield
    task.cancel()

app = FastAPI(title="AI Screening SaaS MVP", lifespan=lifespan)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Exception on {request.method} {request.url}")
    logger.error("".join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error(f"Server Error {exc.status_code} on {request.method} {request.url} - {exc.detail}")
    else:
        logger.warning(f"Client Error {exc.status_code} on {request.method} {request.url} - {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.middleware("http")
async def log_requests(request: Request, call_next):
    # start_time = time.time()
    # logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    # process_time = time.time() - start_time
    # logger.info(f"Completed request: {request.method} {request.url} - Status: {response.status_code} - Time: {process_time:.4f}s")
    return response
# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(interviews.router)
app.include_router(webhooks.router)


@app.get("/")
def root():
    return {"message": "AI Screening SaaS API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
