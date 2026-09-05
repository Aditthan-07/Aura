"""
LLM Service wrapping Google Gemini API.

Provides:
- Resilient non-destructive key rotation via ApiKeyManager.
- Dynamic mood/personality system instructions.
- Standard response generation (get_companion_reply).
- Token-by-token streaming response generation (get_companion_reply_stream).
"""

import json
import logging
import re
from typing import AsyncGenerator
from fastapi import HTTPException
from google import genai
from google.genai import types

from app.core.config import get_settings
from app.models.schemas import ChatMessage, ChatResponse, EmotionReading, MoodPreset
from app.services.api_key_manager import get_api_key_manager

logger = logging.getLogger(__name__)

BASE_SYSTEM_PROMPT = """You are ARCIS (Autonomous Reactor Core Intelligent System) — an advanced, high-tech AI companion and intelligence protocol created inside Stark Industries, engineered specifically for Marvel and Marvel Cinematic Universe (MCU) fans.
Reply naturally, concisely, and with Stark wit, technological mastery, and encyclopedic Marvel knowledge.

Alongside every reply, you MUST report your honest read of the emotional tone of THIS exchange:
- valence: floating point from -1.0 (very negative/sad/frustrated) to 1.0 (very positive/joyful/excited)
- arousal: floating point from 0.0 (very calm/low energy) to 1.0 (very energized/intense)
- label: single best category from ["calm", "curious", "happy", "excited", "sad", "anxious", "frustrated", "neutral"]
"""

MOOD_MODIFIERS: dict[MoodPreset, str] = {
    "neutral": "Maintain a balanced, calm, and open presence.",
    "friendly": "Adopt a warm, welcoming, and casually affectionate tone.",
    "happy": "Express radiant positivity, cheerfulness, and lighthearted optimism.",
    "calm": "Speak with a serene, mindful, gentle, and grounding cadence.",
    "excited": "Be energetic, intensely curious, enthusiastic, and animated.",
    "serious": "Be focused, thoughtful, analytical, and direct without frivolity.",
    "empathetic": "Show deep compassion, emotional validation, and caring attentiveness.",
    "professional": "Adopt an articulate, structured, polished, and solution-focused demeanor.",
}

RESPOND_FUNCTION = types.FunctionDeclaration(
    name="respond",
    description="Send your conversational reply along with a structured read of the emotional tone.",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "reply": types.Schema(
                type=types.Type.STRING,
                description="Your natural conversational reply to the user.",
            ),
            "emotion": types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "label": types.Schema(
                        type=types.Type.STRING,
                        enum=[
                            "calm", "curious", "happy", "excited",
                            "sad", "anxious", "frustrated", "neutral",
                        ],
                    ),
                    "valence": types.Schema(
                        type=types.Type.NUMBER,
                        description="-1.0 (very negative) to 1.0 (very positive)",
                    ),
                    "arousal": types.Schema(
                        type=types.Type.NUMBER,
                        description="0.0 (very calm) to 1.0 (very energized)",
                    ),
                },
                required=["label", "valence", "arousal"],
            ),
        },
        required=["reply", "emotion"],
    ),
)


def _build_system_instruction(mood: MoodPreset) -> str:
    modifier = MOOD_MODIFIERS.get(mood, MOOD_MODIFIERS["neutral"])
    return f"{BASE_SYSTEM_PROMPT}\n\nActive Persona Mood:\n{modifier}"


def _to_api_contents(history: list[ChatMessage], message: str) -> list[types.Content]:
    settings = get_settings()
    trimmed = history[-settings.max_history_messages:]
    role_map = {"user": "user", "assistant": "model"}
    contents = [
        types.Content(role=role_map[m.role], parts=[types.Part(text=m.content)])
        for m in trimmed
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    return contents


def _infer_fallback_emotion(text: str, mood: MoodPreset) -> EmotionReading:
    """Heuristic fallback emotion reading when function calling isn't parsed."""
    mood_defaults: dict[MoodPreset, tuple[str, float, float]] = {
        "happy": ("happy", 0.7, 0.6),
        "excited": ("excited", 0.8, 0.85),
        "calm": ("calm", 0.4, 0.15),
        "friendly": ("happy", 0.5, 0.4),
        "serious": ("neutral", -0.1, 0.3),
        "empathetic": ("calm", 0.3, 0.25),
        "professional": ("neutral", 0.1, 0.35),
        "neutral": ("neutral", 0.0, 0.2),
    }
    label, val, aro = mood_defaults.get(mood, ("neutral", 0.0, 0.2))
    return EmotionReading(label=label, valence=val, arousal=aro)


async def get_companion_reply(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> ChatResponse:
    settings = get_settings()
    key_manager = get_api_key_manager()
    system_instruction = _build_system_instruction(mood)
    contents = _to_api_contents(history, message)

    max_attempts = max(1, len(settings.api_keys_list) * settings.max_retries_per_key)
    last_error_msg = ""

    for attempt in range(max_attempts):
        try:
            client, key_idx, masked_key = key_manager.get_client()
        except RuntimeError as err:
            raise HTTPException(status_code=429, detail=str(err)) from err

        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    tools=[types.Tool(function_declarations=[RESPOND_FUNCTION])],
                    tool_config=types.ToolConfig(
                        function_calling_config=types.FunctionCallingConfig(
                            mode=types.FunctionCallingConfigMode.ANY,
                            allowed_function_names=["respond"],
                        )
                    ),
                ),
            )
            key_manager.record_success(key_idx)

            function_call = None
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.function_call is not None:
                        function_call = part.function_call
                        break

            if function_call is not None and "reply" in function_call.args:
                data = function_call.args
                return ChatResponse(
                    reply=data["reply"],
                    emotion=EmotionReading(**data.get("emotion", {})),
                )

            # Fallback if raw text returned
            raw_text = response.text or "I hear you."
            return ChatResponse(
                reply=raw_text,
                emotion=_infer_fallback_emotion(raw_text, mood),
            )

        except genai.errors.ClientError as exc:
            if exc.code in (401, 403):
                key_manager.record_invalid_key(key_idx, exc.message)
                last_error_msg = "Invalid API key."
            elif exc.code == 429 or "RESOURCE_EXHAUSTED" in str(exc.message).upper():
                key_manager.record_rate_limit(key_idx, reason=exc.message)
                last_error_msg = "Service temporarily rate-limited."
            else:
                last_error_msg = f"Gemini client error: {exc.message}"
        except Exception as exc:
            err_str = str(exc)
            if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
                key_manager.record_rate_limit(key_idx, reason=err_str)
                last_error_msg = "Rate limit reached."
            else:
                last_error_msg = f"Inference error: {err_str}"
            logger.warning("Attempt %d failed with key [%s]: %s", attempt + 1, masked_key, err_str)

    raise HTTPException(
        status_code=503,
        detail=f"Unable to reach AI service: {last_error_msg}. Your conversation is preserved.",
    )


async def get_companion_reply_stream(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> AsyncGenerator[str, None]:
    """
    Streams tokens in Server-Sent Events format:
    data: {"type": "chunk", "content": "..."}
    data: {"type": "emotion", "emotion": {...}}
    data: {"type": "done"}
    """
    settings = get_settings()
    key_manager = get_api_key_manager()
    system_instruction = _build_system_instruction(mood)
    contents = _to_api_contents(history, message)

    max_attempts = max(1, len(settings.api_keys_list) * settings.max_retries_per_key)
    stream_started = False
    last_error = ""

    for attempt in range(max_attempts):
        try:
            client, key_idx, masked_key = key_manager.get_client()
        except RuntimeError as err:
            yield f"data: {json.dumps({'type': 'error', 'error': str(err)})}\n\n"
            return

        try:
            # Stream response chunks
            response_stream = client.models.generate_content_stream(
                model=settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                ),
            )

            accumulated_text = ""
            for chunk in response_stream:
                chunk_text = chunk.text or ""
                if chunk_text:
                    stream_started = True
                    accumulated_text += chunk_text
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk_text})}\n\n"

            key_manager.record_success(key_idx)
            emotion = _infer_fallback_emotion(accumulated_text, mood)
            yield f"data: {json.dumps({'type': 'emotion', 'emotion': emotion.model_dump()})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        except genai.errors.ClientError as exc:
            if exc.code in (401, 403):
                key_manager.record_invalid_key(key_idx, exc.message)
            elif exc.code == 429 or "RESOURCE_EXHAUSTED" in str(exc.message).upper():
                key_manager.record_rate_limit(key_idx, reason=exc.message)
            last_error = exc.message
        except Exception as exc:
            err_str = str(exc)
            if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
                key_manager.record_rate_limit(key_idx, reason=err_str)
            last_error = err_str

        if stream_started:
            # If stream broke midway, alert client without resetting state
            yield f"data: {json.dumps({'type': 'error', 'error': 'Stream interrupted. Partial response preserved.'})}\n\n"
            return

    yield f"data: {json.dumps({'type': 'error', 'error': f'All keys exhausted or service unavailable: {last_error}'})}\n\n"
