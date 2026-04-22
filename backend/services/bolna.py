import os
import httpx
import asyncio

BOLNA_API_KEY = os.getenv("BOLNA_API_KEY")
BOLNA_BASE_URL = os.getenv("BOLNA_BASE_URL", "https://api.bolna.ai")

BOLNA_AGENT_ID = os.getenv("BOLNA_AGENT_ID", "")
BOLNA_FROM_PHONE = os.getenv("BOLNA_FROM_PHONE", "")

async def create_call(phone: str, variables: dict[str,str] = None):
    headers = {
        "Authorization": f"Bearer {BOLNA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "agent_id": BOLNA_AGENT_ID,
        "recipient_phone_number": phone,
        "from_phone_number": BOLNA_FROM_PHONE,
        "user_data": variables
    }
    
    async with httpx.AsyncClient() as client:
        # Retry 3 times with exponential backoff
        for attempt in range(3):
            try:
                response = await client.post(
                    f"{BOLNA_BASE_URL}/call",
                    headers=headers,
                    json=payload,
                    timeout=15.0
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                if attempt == 2:
                    raise e
                await asyncio.sleep(2 ** attempt)
