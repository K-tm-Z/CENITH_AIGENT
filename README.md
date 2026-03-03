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
**Description:** Processes paramedic audio transcripts into structured JSON forms.

> **Note for Frontend:** If you are connecting from a different machine, replace `127.0.0.1` with the Backend Host's Local IP (e.g., `192.168.x.x`).

#### Request Body (JSON)
| Field | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | The raw text from the Speech-to-Text engine. |
| `thread_id` | `string` | Unique session ID to maintain conversation memory. |

#### Expected Response (Example: Occurrence Report)
Your frontend will receive a "Status" and a "Data" object containing fields from the `OcurrenceReport` or `TeddyBearForm` schemas.

```json
{
  "status": "success",
  "data": {
    "date": "2026-03-03",
    "time": "10:43",
    "call_number": "12345",
    "police": true,
    "fire_department": false,
    "brief_description": "Paramedic reported PD on scene at Room 302."
  },
  "thread_id": "ambulance_101"
}