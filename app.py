from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from paramedic_agent import ParamedicAgent
from tools import ParamedicAgentTools

app = FastAPI(title="WIMTACH Paramedic Assistant API")

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
        response_text = agent.ask(request.text, thread_id=request.thread_id)
        
        # Return the AI's response as a clean JSON object
        return {
            "status": "success",
            "data": response_text,
            "thread_id": request.thread_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# To run this: uvicorn app:app --reload