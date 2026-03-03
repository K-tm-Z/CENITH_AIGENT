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

### 🔄 Session & State Management

Our Paramedic Assistant is designed with **Stateful Intelligence**. It uses a persistent memory layer to ensure data integrity across multi-turn conversations.

#### **Endpoint: POST `/reset-session`**
In a clinical setting, context contamination is a risk. We implemented this endpoint to allow the Paramedic to "wipe the slate clean" without losing their session connection.

* **Use Case:** If the paramedic makes a verbal error or needs to start a completely new report within the same ambulance thread.
* **Technical Implementation:** Calls the `clear_memory` method, which interacts with the `LangGraph` checkpointer to reset the `messages` list to an empty state.
* **Benefit:** Prevents "Sarah's" data from accidentally being injected into "Marco's" shift checklist.

### 🛡️ Data Validation & Integrity
We utilize **Pydantic Discriminated Unions** to enforce strict schema adherence:
- **Zero Hallucination:** If the AI attempts to create a non-standard form type (e.g., `teddy_bear_donation`), the validation layer rejects the input.
- **Persistent Identifiers:** Critical data points like `Badge Number` are stored in the session state and automatically injected into subsequent forms to reduce manual input.