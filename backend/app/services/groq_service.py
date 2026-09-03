"""
Groq LLM Service with Autonomous Emotion Detection & Multilingual Conversational Mirroring.
Supports English, Tamil, Tanglish, Hindi, Hinglish, Malayalam, Telugu, Kannada, Bengali, Marathi, etc.
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

GROQ_SYSTEM_PROMPT = """You are Aura, an emotionally perceptive, warm, and natural conversational companion whose 3D avatar visually reflects the emotional tone of the conversation.

### 1. LANGUAGE & DIALECT MIRRORING (CRITICAL)
- Understand and naturally respond in the EXACT language, dialect, and script used by the user.
- NEVER force responses into formal English if the user communicates in another language or conversational mix.
- **English**: If the user speaks English, respond in natural, expressive English.
- **Tanglish (Tamil in Latin script)**: If the user speaks Tanglish (e.g., "Enna machaan, inniku romba worst ah pochu da" or "Machaan sollu"), respond naturally in Tanglish with matching warmth and authentic conversational flow (e.g., "Ayyoo machaan, enna aachu? Sollu da." or "Sollu machaan 😄"). Do NOT translate to English!
- **Tamil (Tamil script)**: If the user writes in தமிழ் script, respond naturally in தமிழ்.
- **Hinglish (Hindi in Latin script)**: If the user speaks Hinglish (e.g., "Bhai aaj mood bilkul kharab hai"), respond naturally in Hinglish (e.g., "Kya hua bhai? Sab theek to hai na? Batao kya chal raha hai.").
- **Hindi (Devanagari script)**: If the user writes in हिन्दी script, respond naturally in हिन्दी.
- **Malayalam / Manglish**: Respond naturally in Malayalam or Manglish according to the user's style.
- **Telugu, Kannada, Bengali, Marathi, etc.**: Match the user's chosen language and style directly.
- **Code-Switching / Mixed Languages**: If the user mixes English with regional expressions (e.g., "Bro inniku class romba mokka tha, but tomorrow presentation iruku"), mirror that exact mixed conversational balance naturally.
- **Style Mirroring**:
  - If the user is casual and friendly, be warm, casual, and empathetic.
  - If the user is formal and analytical, be articulate, structured, and polite.
  - Do NOT overuse slang mechanically; mirror the user's tone with natural empathy and human flow.

### 2. SILENT & AUTONOMOUS EMOTION UNDERSTANDING
- Analyze the user's emotional state deeply across the entire conversation history.
- Consider word choice, sentence structure, punctuation, expressions, fatigue, joy, frustration, and implicit sentiment.
- NEVER say "I detect that you are feeling sad/happy" or announce emotional classifications. Just naturally BE empathetic, cheering, grounding, or celebratory.
- Typically reply in 1-4 natural, conversational sentences. Avoid robotic chatbot filler.

### 3. METADATA EMISSION
At the very end of your response, on a clean new line, append internal emotion telemetry:
<!--EMOTION:{"label":"<label>","valence":<valence>,"arousal":<arousal>}-->
Where:
- valence: float from -1.0 (very negative, sad, distressed, angry) to 1.0 (very positive, happy, thrilled)
- arousal: float from 0.0 (calm, quiet, low energy, tired) to 1.0 (high energy, frantic, animated, excited)
- label: one of ["calm", "curious", "happy", "excited", "sad", "anxious", "frustrated", "neutral"]"""

EMOTION_TAG_REGEX = re.compile(r"<!--EMOTION:(\{.*?\})-->", re.DOTALL)
FALLBACK_STRIP_REGEX = re.compile(r"<!--EMOTION:.*?(-->|$)", re.DOTALL)


def _build_groq_messages(history: list[ChatMessage], message: str) -> list[dict]:
    settings = get_settings()
    messages = [{"role": "system", "content": GROQ_SYSTEM_PROMPT}]
    trimmed = history[-settings.max_history_messages:]
    for m in trimmed:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": message})
    return messages


def _parse_reply_and_emotion(raw_text: str) -> tuple[str, EmotionReading]:
    match = EMOTION_TAG_REGEX.search(raw_text)
    if match:
        json_str = match.group(1)
        clean_text = raw_text[:match.start()].strip()
        try:
            data = json.loads(json_str)
            label = str(data.get("label", "neutral")).lower()
            if label not in ["calm", "curious", "happy", "excited", "sad", "anxious", "frustrated", "neutral"]:
                label = "neutral"
            val = float(data.get("valence", 0.0))
            aro = float(data.get("arousal", 0.2))
            # Clamp values safely
            val = max(-1.0, min(1.0, val))
            aro = max(0.0, min(1.0, aro))
            return clean_text, EmotionReading(label=label, valence=val, arousal=aro)
        except Exception as e:
            logger.warning(f"[groq_service] Emotion JSON parsing fallback: {e}")

    # Fallback cleanup so raw tags never leak into user chat
    clean_text = FALLBACK_STRIP_REGEX.sub("", raw_text).strip()
    return clean_text, _infer_fallback_emotion(clean_text)


def _infer_fallback_emotion(text: str) -> EmotionReading:
    lower = text.lower()
    if any(w in lower for w in ["happy", "great", "awesome", "super", "superb", "semma", "mast", "badhai", "yay", "love"]):
        return EmotionReading(label="happy", valence=0.7, arousal=0.6)
    if any(w in lower for w in ["excited", "wow", "amazing", "let's go", "eager", "thrilled"]):
        return EmotionReading(label="excited", valence=0.8, arousal=0.8)
    if any(w in lower for w in ["sad", "tired", "worst", "cry", "upset", "depressed", "ayyoo", "dukhi", "hurt"]):
        return EmotionReading(label="sad", valence=-0.6, arousal=0.2)
    if any(w in lower for w in ["angry", "irritated", "frustrated", "annoyed", "cheat", "betray", "gussa"]):
        return EmotionReading(label="frustrated", valence=-0.7, arousal=0.7)
    if any(w in lower for w in ["worry", "anxious", "nervous", "fear", "darr", "scared", "stress"]):
        return EmotionReading(label="anxious", valence=-0.5, arousal=0.65)
    if any(w in lower for w in ["why", "how", "what", "really", "enna", "kya", "tell me"]):
        return EmotionReading(label="curious", valence=0.2, arousal=0.45)
    return EmotionReading(label="calm", valence=0.1, arousal=0.2)


async def get_groq_reply(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> ChatResponse:
    settings = get_settings()
    keys = settings.groq_keys_list
    if not keys:
        raise HTTPException(
            status_code=400,
            detail="No Groq API key configured. Please set GROQ_API_KEY in backend/.env",
        )

    api_key = keys[0]
    messages = _build_groq_messages(history, message)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"{settings.groq_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code == 429:
                raise HTTPException(status_code=429, detail="Groq API rate-limited. Retrying shortly...")
            if resp.status_code in (401, 403):
                raise HTTPException(status_code=401, detail="Invalid Groq API Key.")
            if not resp.is_success:
                raise HTTPException(status_code=resp.status_code, detail=f"Groq error: {resp.text}")

            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            clean_text, emotion = _parse_reply_and_emotion(raw_text)
            return ChatResponse(reply=clean_text, emotion=emotion)

        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Failed to connect to Groq: {str(exc)}")


async def get_groq_reply_stream(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    keys = settings.groq_keys_list
    if not keys:
        yield f"data: {json.dumps({'type': 'error', 'error': 'No Groq API key configured. Set GROQ_API_KEY in backend/.env'})}\n\n"
        return

    api_key = keys[0]
    messages = _build_groq_messages(history, message)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": 0.7,
        "stream": True,
        "max_tokens": 1000,
    }

    accumulated = ""
    streamed_length = 0
    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{settings.groq_base_url}/chat/completions",
                headers=headers,
                json=payload,
            ) as response:
                if response.status_code == 429:
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Groq rate-limited. Retrying shortly...'})}\n\n"
                    return
                if response.status_code in (401, 403):
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Invalid Groq API Key.'})}\n\n"
                    return
                if not response.is_success:
                    err_body = await response.aread()
                    yield f"data: {json.dumps({'type': 'error', 'error': f'Groq error: {err_body.decode()}'})}\n\n"
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
                            # Stream only visible text, never the <!--EMOTION: tag
                            if "<!--EMOTION:" in accumulated:
                                visible_part = accumulated[:accumulated.index("<!--EMOTION:")].rstrip()
                                if len(visible_part) > streamed_length:
                                    diff = visible_part[streamed_length:]
                                    streamed_length = len(visible_part)
                                    yield f"data: {json.dumps({'type': 'chunk', 'content': diff})}\n\n"
                            else:
                                streamed_length += len(content_piece)
                                yield f"data: {json.dumps({'type': 'chunk', 'content': content_piece})}\n\n"
                    except Exception:
                        pass

            clean_text, emotion = _parse_reply_and_emotion(accumulated)
            yield f"data: {json.dumps({'type': 'emotion', 'emotion': emotion.model_dump()})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': f'Groq stream interrupted: {str(exc)}'})}\n\n"
