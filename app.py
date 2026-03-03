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

# 1. Initialize your Agent (Use the OpenRouter config we discussed)
tools_array = [
        ParamedicAgentTools.log_teddy_bear_gift, 
        ParamedicAgentTools.update_vehicle_inventory, 
        ParamedicAgentTools.log_incident_detail
        ]

# system_msg = "You are a Paramedic Assistant. Extract patient data from the transcript and format it."
agent = ParamedicAgent(tools=tools_array)
# 2. Define what the incoming data looks like (The Request)
class TranscriptRequest(BaseModel):
    text: str
    thread_id: str

# 3. Create the Route
@app.post("/process-transcript")
async def process_voice_data(request: TranscriptRequest):
    try:
        # Call your agent's 'ask' method
        response_json_string = agent.ask(request.text, thread_id=request.thread_id)
        
        structured_data = json.loads(response_json_string)
        # Return the AI's response as a clean JSON object
        return {
            "status": "success",
            "data": structured_data,
            "thread_id": request.thread_id
        }
    except Exception as e:
        print(f"Error processing transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# To run this: uvicorn app:app --reload