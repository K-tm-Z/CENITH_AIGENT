from fastapi import APIRouter

router = APIRouter()
# Dummy file to test if server is up. Can be expanded later for more comprehensive health checks.
@router.get("/api/health")
async def health():
    return {"status": "ok"}