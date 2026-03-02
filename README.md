# WIMTACH Paramedic Assistant API

This backend uses a **LangChain** agent powered by **OpenReuter** to extract logistics, comfort-care data, and incident details from paramedic voice transcripts.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- A valid `.env` file with `OPENROUTER_API_KEY`

### 2. Installation
```bash
pip install -r requirements.txt

## 🔌 API Endpoints

### 1. Process Transcript
**Endpoint:** `POST /process-transcript`  
**Description:** Sends a raw voice transcript to the AI Agent for form extraction.

#### Request Body (JSON)
| Field | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | The raw text from the Speech-to-Text engine. |
| `thread_id` | `string` | A unique identifier for the session (e.g., "ambulance_101"). |

#### Example Request (JavaScript Fetch)
```javascript
const response = await fetch('[http://127.0.0.1:8000/process-transcript](http://127.0.0.1:8000/process-transcript)', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        text: "We gave a teddy bear to 5-year-old Sarah.",
        thread_id: "session_001"
    })
});
const data = await response.json();
console.log(data);