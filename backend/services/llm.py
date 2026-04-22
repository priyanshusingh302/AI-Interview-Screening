import os
import httpx
import json

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def generate_evaluation(transcript: str, job_details: dict) -> dict:
    if not transcript:
        return {"result": "failed", "reasoning": "No transcript provided."}
        
    if not OPENAI_API_KEY:
        return {"result": "passed", "reasoning": "Dummy evaluation. Please set OPENAI_API_KEY in backend .env to test real evaluations."}
        
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = f"""
Evaluate the following candidate transcript against the provided job requirements.
Decide if they passed or failed the technical/screening phase.

Job Title: {job_details.get('title')}
Experience Level: {job_details.get('experience_level')}
Requirements: {job_details.get('requirements')}
Skills: {job_details.get('skills')}

Transcript:
{transcript}

Return a valid JSON object strictly matching this format:
{{
  "result": "passed" | "failed",
  "reasoning": "A paragraph explaining exactly why they passed or why they failed based on their answers compared to the job requirements."
}}
"""
    
    payload = {
        "model": "gpt-5-nano",
        "response_format": { "type": "json_object" },
        "messages": [
            {"role": "system", "content": "You are a ruthless expert technical AI recruiter evaluating candidate interviews. You must return parseable JSON."},
            {"role": "user", "content": prompt}
        ],
        "max_completion_tokens": 10000
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"] or ""
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            if not content:
                return {"result": "failed", "reasoning": "Model returned an empty response."}
                
            return json.loads(content)
        except json.JSONDecodeError as je:
            print(f"JSON Parse Error. Raw content: {content}")
            return {"result": "failed", "reasoning": f"Failed to parse generation (JSONDecodeError): {str(je)}"}
        except Exception as e:
            print(f"Error generating evaluation: {str(e)}")
            return {"result": "failed", "reasoning": f"Evaluation failed due to an error: {str(e)}"}
