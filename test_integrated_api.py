import requests
import json

# 1. Configuration
BASE_URL = "http://127.0.0.1:8000"
ENDPOINT = "/api/stt/transcribe"
# Note: You need a valid JWT token from your teammate's login process
# If you haven't implemented login yet, you might need to temporarily
# disable @Depends(require_auth) in routers/stt.py just for this test.
AUTH_TOKEN = "YOUR_JWT_TOKEN_HERE" 

def test_stt_and_extraction():
    print("--- Starting Integrated API Test ---")
    
    # Simulate the multipart/form-data the frontend sends
    with open("audio_sample.wav", "rb") as f:
        audio_data = f.read()
        files = {
            'audio': ('audio_sample.wav', audio_data, 'audio/wav')
        }
    data = {
        'segmentType': 'paramedic_report',
        'threadId': 'integration_test_session_001'
    }
    headers = {
        'Authorization': f'Bearer {AUTH_TOKEN}'
    }

    try:
        print(f"Sending request to {BASE_URL}{ENDPOINT}...")
        response = requests.post(
            f"{BASE_URL}{ENDPOINT}", 
            files=files, 
            data=data, 
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n[SUCCESS] Response Received:")
            print(f"Transcript: {result.get('transcript')}")
            print(f"Structured Data: {json.dumps(result.get('structured_data'), indent=2)}")
        else:
            print(f"\n[FAIL] Status Code: {response.status_code}")
            print(f"Detail: {response.text}")

    except Exception as e:
        print(f"\n[ERROR] Connection failed: {str(e)}")

if __name__ == "__main__":
    test_stt_and_extraction()