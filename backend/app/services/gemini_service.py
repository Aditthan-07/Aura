"""
Gemini LLM Service with Autonomous Emotion Detection & Multilingual Conversational Mirroring.
"""

import json
import logging
from typing import AsyncGenerator
from fastapi import HTTPException
from google import genai
from google.genai import types

from app.core.config import get_settings
from app.models.schemas import ChatMessage, ChatResponse, EmotionReading, MoodPreset
from app.services.api_key_manager import get_api_key_manager
from app.services.groq_service import GROQ_SYSTEM_PROMPT, _parse_reply_and_emotion

logger = logging.getLogger(__name__)


def _build_contents(history: list[ChatMessage], message: str) -> list[types.Content]:
    settings = get_settings()
    contents = []
    trimmed_history = history[-settings.max_history_messages:]

    for msg in trimmed_history:
        role = "user" if msg.role == "user" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.content)],
            )
        )

    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)],
        )
    )
    return contents


async def get_companion_reply(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> ChatResponse:
    settings = get_settings()
    key_manager = get_api_key_manager()
    contents = _build_contents(history, message)

    for attempt in range(settings.max_retries_per_key * max(len(settings.api_keys_list), 1)):
        try:
            active_key = key_manager.get_active_key()
            client = genai.Client(api_key=active_key)

            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=GROQ_SYSTEM_PROMPT,
                    temperature=0.7,
                ),
            )

            raw_text = response.text or ""
            clean_text, emotion = _parse_reply_and_emotion(raw_text)
            key_manager.report_success(active_key)
            return ChatResponse(reply=clean_text, emotion=emotion)

        except Exception as exc:
            err_str = str(exc)
            is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
            key_manager.report_failure(active_key, error_message=err_str, is_rate_limit=is_rate_limit)

            if attempt == (settings.max_retries_per_key * max(len(settings.api_keys_list), 1)) - 1:
                if is_rate_limit:
                    raise HTTPException(
                        status_code=429,
                        detail="All Gemini API keys are currently rate-limited. Retrying shortly...",
                    )
                raise HTTPException(status_code=500, detail=f"Gemini API error: {err_str}")


async def get_companion_reply_stream(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    key_manager = get_api_key_manager()
    contents = _build_contents(history, message)

    try:
        active_key = key_manager.get_active_key()
    except HTTPException as e:
        yield f"data: {json.dumps({'type': 'error', 'error': e.detail})}\n\n"
        return

    client = genai.Client(api_key=active_key)
    accumulated = ""
    streamed_length = 0

    try:
        response_stream = client.models.generate_content_stream(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=GROQ_SYSTEM_PROMPT,
                temperature=0.7,
            ),
        )

        for chunk in response_stream:
            chunk_text = chunk.text or ""
            accumulated += chunk_text

            if "<!--EMOTION:" in accumulated:
                visible_part = accumulated[:accumulated.index("<!--EMOTION:")].rstrip()
                if len(visible_part) > streamed_length:
                    diff = visible_part[streamed_length:]
                    streamed_length = len(visible_part)
                    yield f"data: {json.dumps({'type': 'chunk', 'content': diff})}\n\n"
            else:
                streamed_length += len(chunk_text)
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_text})}\n\n"

        clean_text, emotion = _parse_reply_and_emotion(accumulated)
        key_manager.report_success(active_key)
        yield f"data: {json.dumps({'type': 'emotion', 'emotion': emotion.model_dump()})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as exc:
        err_str = str(exc)
        is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
        key_manager.report_failure(active_key, error_message=err_str, is_rate_limit=is_rate_limit)
        yield f"data: {json.dumps({'type': 'error', 'error': f'Stream interrupted: {err_str}'})}\n\n"
