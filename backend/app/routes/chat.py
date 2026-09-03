from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.models.schemas import ChatRequest, ChatResponse
from app.services.groq_service import get_groq_reply, get_groq_reply_stream

router = APIRouter(prefix="/api", tags=["chat"])


@router.get("/health")
async def health_check():
    settings = get_settings()
    return {
        "status": "healthy",
        "active_provider": settings.active_provider,
        "groq_configured": len(settings.groq_keys_list) > 0,
        "model": settings.groq_model,
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    settings = get_settings()
    return await get_groq_reply(history=request.history, message=request.message, mood=request.mood)


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    settings = get_settings()
    stream_gen = get_groq_reply_stream(
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
