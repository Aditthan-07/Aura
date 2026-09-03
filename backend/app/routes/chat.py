from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.models.schemas import ChatRequest, ChatResponse
from app.services.api_key_manager import get_api_key_manager
from app.services.gemini_service import get_companion_reply as get_gemini_reply, get_companion_reply_stream as get_gemini_reply_stream
from app.services.grok_service import get_grok_reply, get_grok_reply_stream

router = APIRouter(prefix="/api", tags=["chat"])


@router.get("/health")
async def health_check():
    settings = get_settings()
    key_manager = get_api_key_manager()
    return {
        "status": "healthy",
        "active_provider": settings.active_provider,
        "grok_configured": len(settings.grok_keys_list) > 0,
        "gemini_configured": len(settings.gemini_keys_list) > 0,
        "keys": key_manager.get_status_report(),
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    settings = get_settings()
    if settings.active_provider == "grok":
        return await get_grok_reply(history=request.history, message=request.message, mood=request.mood)
    return await get_gemini_reply(history=request.history, message=request.message, mood=request.mood)


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    settings = get_settings()
    if settings.active_provider == "grok":
        stream_gen = get_grok_reply_stream(
            history=request.history, message=request.message, mood=request.mood
        )
    else:
        stream_gen = get_gemini_reply_stream(
            history=request.history, message=request.message, mood=request.mood
        )

    return StreamingResponse(
        stream_gen,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
