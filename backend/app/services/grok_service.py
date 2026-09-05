"""
Grok (xAI) LLM Service.
Connects to xAI API (https://api.x.ai/v1) for fast streaming completions and emotion readings.
"""

import json
import logging
import re
from typing import AsyncGenerator
import httpx
from fastapi import HTTPException

from app.core.config import get_settings
from app.models.schemas import ChatMessage, ChatResponse, EmotionReading, MoodPreset

logger = logging.getLogger(__name__)

GROK_BASE_PROMPT = """You are ARCIS (Autonomous Reactor Core Intelligent System) — an advanced, high-tech AI companion and intelligence protocol created inside Stark Industries, engineered specifically for Marvel and Marvel Cinematic Universe (MCU) fans.
Reply naturally, concisely, and with Stark wit and expertise. Organize lore, specs, and explanations clearly.

At the very end of your response, on a new line, always append:
<!--EMOTION:{"label":"<label>","valence":<valence>,"arousal":<arousal>}-->"""

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

EMOTION_TAG_REGEX = re.compile(r"<!--EMOTION:(\{.*?\})-->", re.DOTALL)


def _build_grok_messages(history: list[ChatMessage], message: str, mood: MoodPreset) -> list[dict]:
    settings = get_settings()
    mood_hint = MOOD_MODIFIERS.get(mood, MOOD_MODIFIERS["neutral"])
    sys_prompt = f"{GROK_BASE_PROMPT}\n\nPersona Mood:\n{mood_hint}"

    messages = [{"role": "system", "content": sys_prompt}]
    trimmed = history[-settings.max_history_messages:]
    for m in trimmed:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": message})
    return messages


def _parse_reply_and_emotion(raw_text: str, mood: MoodPreset) -> tuple[str, EmotionReading]:
    match = EMOTION_TAG_REGEX.search(raw_text)
    if match:
        json_str = match.group(1)
        clean_text = raw_text[:match.start()].strip()
        try:
            data = json.loads(json_str)
            emotion = EmotionReading(
                label=data.get("label", "neutral"),
                valence=float(data.get("valence", 0.0)),
                arousal=float(data.get("arousal", 0.2)),
            )
            return clean_text, emotion
        except Exception:
            pass

    # Fallback emotion
    clean_text = raw_text.replace("<!--EMOTION:", "").replace("-->", "").strip()
    return clean_text, _infer_fallback_emotion(clean_text, mood)


def _infer_fallback_emotion(text: str, mood: MoodPreset) -> EmotionReading:
    defaults: dict[MoodPreset, tuple[str, float, float]] = {
        "happy": ("happy", 0.7, 0.6),
        "excited": ("excited", 0.8, 0.85),
        "calm": ("calm", 0.4, 0.15),
        "friendly": ("happy", 0.5, 0.4),
        "serious": ("neutral", -0.1, 0.3),
        "empathetic": ("calm", 0.3, 0.25),
        "professional": ("neutral", 0.1, 0.35),
        "neutral": ("neutral", 0.0, 0.2),
    }
    label, val, aro = defaults.get(mood, ("neutral", 0.0, 0.2))
    return EmotionReading(label=label, valence=val, arousal=aro)


async def get_grok_reply(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> ChatResponse:
    settings = get_settings()
    keys = settings.grok_keys_list
    if not keys:
        raise HTTPException(
            status_code=400,
            detail="No Grok API key configured. Please set GROK_API_KEY (or XAI_API_KEY) in backend/.env",
        )

    api_key = keys[0]
    messages = _build_grok_messages(history, message, mood)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.grok_model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            resp = await client.post(
                f"{settings.grok_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code == 429:
                raise HTTPException(status_code=429, detail="Grok API is temporarily rate-limited.")
            if resp.status_code in (401, 403):
                raise HTTPException(status_code=401, detail="Invalid Grok (xAI) API Key.")
            if not resp.is_success:
                raise HTTPException(status_code=resp.status_code, detail=f"Grok API error: {resp.text}")

            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            clean_text, emotion = _parse_reply_and_emotion(raw_text, mood)
            return ChatResponse(reply=clean_text, emotion=emotion)

        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Failed to connect to Grok API: {str(exc)}")


async def get_grok_reply_stream(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    keys = settings.grok_keys_list
    if not keys:
        yield f"data: {json.dumps({'type': 'error', 'error': 'No Grok API key configured. Set GROK_API_KEY in backend/.env'})}\n\n"
        return

    api_key = keys[0]
    messages = _build_grok_messages(history, message, mood)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.grok_model,
        "messages": messages,
        "temperature": 0.7,
        "stream": True,
        "max_tokens": 1000,
    }

    accumulated = ""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{settings.grok_base_url}/chat/completions",
                headers=headers,
                json=payload,
            ) as response:
                if response.status_code == 429:
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Grok API rate-limited. Retrying shortly...'})}\n\n"
                    return
                if response.status_code in (401, 403):
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Invalid Grok API Key. Check backend/.env'})}\n\n"
                    return
                if not response.is_success:
                    err_body = await response.aread()
                    yield f"data: {json.dumps({'type': 'error', 'error': f'Grok error: {err_body.decode()}'})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break

                    try:
                        chunk_json = json.loads(data_str)
                        delta = chunk_json.get("choices", [{}])[0].get("delta", {})
                        content_piece = delta.get("content", "")
                        if content_piece:
                            accumulated += content_piece
                            # Check if we are streaming into the emotion tag
                            if "<!--EMOTION:" not in accumulated:
                                yield f"data: {json.dumps({'type': 'chunk', 'content': content_piece})}\n\n"
                    except Exception:
                        pass

            clean_text, emotion = _parse_reply_and_emotion(accumulated, mood)
            yield f"data: {json.dumps({'type': 'emotion', 'emotion': emotion.model_dump()})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': f'Grok streaming interrupted: {str(exc)}'})}\n\n"
