from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse
from app.services.api_key_manager import get_api_key_manager
from app.services.llm_service import get_companion_reply, get_companion_reply_stream

router = APIRouter(prefix="/api", tags=["chat"])


@router.get("/health")
async def health_check():
    key_manager = get_api_key_manager()
    return {
        "status": "healthy",
        "keys": key_manager.get_status_report(),
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    return await get_companion_reply(
        history=request.history, message=request.message, mood=request.mood
    )


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    return StreamingResponse(
        get_companion_reply_stream(
            history=request.history, message=request.message, mood=request.mood
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
