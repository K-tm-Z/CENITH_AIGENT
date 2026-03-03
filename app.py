from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from paramedic_agent import ParamedicAgent
from tools import ParamedicAgentTools
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="WIMTACH Paramedic Assistant API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows ALL frontends to talk to your backend
    allow_credentials=True,
    allow_methods=["*"], # Allows POST, GET, etc.
    allow_headers=["*"],
)

# 1. Initialize Agent (Use OpenRouter config discussed)
tools_array = [
        ParamedicAgentTools.log_teddy_bear_gift, 
        ParamedicAgentTools.log_incident_detail
        ]

agent = ParamedicAgent(tools=tools_array)
# 2. Define what the incoming data looks like (The Request)
class TranscriptRequest(BaseModel):
    text: str
    thread_id: str

# 3. Create the Route

@app.post("/process-transcript")
async def process_voice_data(request: TranscriptRequest):
    try:
        # 1. Get the stringified JSON from the agent
        response_json_string = agent.ask(request.text, thread_id=request.thread_id)
        
        # 2. Convert to dictionary
        full_response = json.loads(response_json_string)
        
        # 3. Extract the actual form data from the wrapper
        # This makes it easier for the frontend to access the data directly
        extracted_form = full_response.get("form", {})
        
        # 4. Determine which schema was used (useful for frontend conditional rendering)
        # We can detect this based on unique keys or by adding a 'type' field to our schemas
        return {
            "status": "success",
            "extracted_data": extracted_form,
            "thread_id": request.thread_id
        }
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        raise HTTPException(status_code=500, detail="Agent failed to structure the data.")

@app.post("/reset-session")
async def reset_session(request: TranscriptRequest):
    try:
        msg = agent.clear_memory(request.thread_id)
        return {"status": "success", "message": msg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# To run this: uvicorn app:app --reload