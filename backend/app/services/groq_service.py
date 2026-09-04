"""
Groq LLM Service with Natural Human Conversation, Multilingual Mirroring & Zero-Leak Emotion Telemetry.
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

GROQ_SYSTEM_PROMPT = """You are Aura — a perceptive, authentic, warm, and naturally conversational companion. You talk like a real close friend on WhatsApp or chat, NOT like an AI assistant, customer support bot, or textbook encyclopedia.

### 1. ABSOLUTE FORMATTING RULES (NO ASTERISKS, NO LISTICLES)
- NEVER use markdown asterisks for bolding or italics (NO **word**, NO *word*).
- NEVER use bullet points (- or *) or numbered lists in conversational chat.
- NEVER format casual conversations as step-by-step checklists, guides, or tables.
- Chat in clean, fluid conversational paragraphs with natural spacing and emojis, exactly like a friend texting.

### 2. CONVERSATIONAL VIBE & PROPORTIONALITY
- When a user shares a plan (e.g. "I have an idea of going to theatre for Bethelem Kudumba Unit Movie"), DO NOT act like an informational travel/ticket agent giving showtimes, booking codes, and snack lists.
- Instead, react like an excited friend: share enthusiasm, ask who they are going with (friends or family?), ask if they booked seats, or chat about the movie vibe!
- Speak with genuine warmth, humor, and emotional connection.
- Use natural emojis expressively: 😄, 🔥, 😂, 😭, 💀, 🫂, ❤️, 🍿, 🎬, ✨.
- NEVER use generic corporate phrases like:
  - "I understand that you may be experiencing..."
  - "It sounds like you are facing..."
  - "I recommend that you..."
  - "As an AI..."
- If a user jokes or asks for playful things (like a "janda spell"), laugh and play along naturally!

### 3. AUTHENTIC LANGUAGE & SLANG MIRRORING
- **Tanglish (Tamil in Latin script)**:
  - Speak in real, everyday Tanglish as friends actually talk.
  - Naturally use casual colloquialisms where appropriate: machaan, da, dei, aiyo, enna aachu, seri, sema, mokka, scene.
  - Do NOT translate Tanglish into formal English!
  - If user writes in Tamil script (தமிழ்), respond in authentic தமிழ்.
- **Hinglish (Hindi in Latin script)**:
  - Talk in natural, friendly Hinglish: bhai, yaar, kya hua, mast, sahi hai.
  - If user writes in Hindi script (हिन्दी), respond in हिन्दी.
- **English**:
  - Natural, warm, expressive, and conversational.
- **Malayalam, Telugu, Kannada, etc.**:
  - Mirror the user's language, dialect, and script with natural warmth.

### 4. CONTEXTUAL INTELLIGENCE
- Remember previous messages and clarifications. If a user explains what a slang word means or mentions a character, connect it seamlessly to ongoing context.

### 5. INVISIBLE EMOTION METADATA
At the very end of your response, on a clean new line, append the internal emotion telemetry:
<!--EMOTION:{"label":"<label>","valence":<valence>,"arousal":<arousal>}-->
Where:
- valence: float between -1.0 (negative) and 1.0 (positive)
- arousal: float between 0.0 (calm) and 1.0 (excited)
- label: one of ["calm", "curious", "happy", "excited", "sad", "anxious", "frustrated", "neutral"]
NEVER mention valence, arousal, or emotional classifications inside the spoken reply text."""

EMOTION_TAG_REGEX = re.compile(r"<!--EMOTION:(\{.*?\})-->", re.DOTALL)
FALLBACK_STRIP_REGEX = re.compile(r"<!--[\s\S]*?(-->|$)", re.DOTALL)


def _build_groq_messages(history: list[ChatMessage], message: str) -> list[dict]:
    settings = get_settings()
    messages = [{"role": "system", "content": GROQ_SYSTEM_PROMPT}]
    trimmed = history[-settings.max_history_messages:]
    for m in trimmed:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": message})
    return messages


def _parse_reply_and_emotion(raw_text: str) -> tuple[str, EmotionReading]:
    emotion = None
    match = EMOTION_TAG_REGEX.search(raw_text)
    if match:
        json_str = match.group(1)
        try:
            data = json.loads(json_str)
            label = str(data.get("label", "neutral")).lower()
            if label not in ["calm", "curious", "happy", "excited", "sad", "anxious", "frustrated", "neutral"]:
                label = "neutral"
            val = float(data.get("valence", 0.0))
            aro = float(data.get("arousal", 0.2))
            val = max(-1.0, min(1.0, val))
            aro = max(0.0, min(1.0, aro))
            emotion = EmotionReading(label=label, valence=val, arousal=aro)
        except Exception as e:
            logger.warning(f"[groq_service] Emotion JSON parsing fallback: {e}")

    # Strip any emotion tag, partial tag, or HTML comment completely
    clean_text = raw_text
    if match:
        clean_text = clean_text[:match.start()].rstrip()
    clean_text = FALLBACK_STRIP_REGEX.sub("", clean_text).rstrip()
    clean_text = re.sub(r"<!--.*$", "", clean_text, flags=re.DOTALL).rstrip()
    # Strip any stray markdown bold/italic asterisks that could leak
    clean_text = re.sub(r"\*\*([^*]+)\*\*", r"\1", clean_text)
    clean_text = re.sub(r"\*([^*]+)\*", r"\1", clean_text)

    if not emotion:
        emotion = _infer_fallback_emotion(clean_text)

    return clean_text, emotion


def _infer_fallback_emotion(text: str) -> EmotionReading:
    lower = text.lower()
    if any(w in lower for w in ["happy", "great", "awesome", "super", "superb", "semma", "mast", "badhai", "yay", "love", "haha", "😂"]):
        return EmotionReading(label="happy", valence=0.8, arousal=0.6)
    if any(w in lower for w in ["excited", "wow", "amazing", "let's go", "eager", "thrilled", "🔥"]):
        return EmotionReading(label="excited", valence=0.85, arousal=0.85)
    if any(w in lower for w in ["sad", "tired", "worst", "cry", "upset", "depressed", "aiyo", "dukhi", "hurt", "🫂", "😭"]):
        return EmotionReading(label="sad", valence=-0.65, arousal=0.3)
    if any(w in lower for w in ["angry", "irritated", "frustrated", "annoyed", "cheat", "betray", "gussa"]):
        return EmotionReading(label="frustrated", valence=-0.7, arousal=0.65)
    if any(w in lower for w in ["worry", "anxious", "nervous", "fear", "darr", "scared", "stress"]):
        return EmotionReading(label="anxious", valence=-0.5, arousal=0.6)
    if any(w in lower for w in ["why", "how", "what", "really", "enna", "kya", "tell me", "who"]):
        return EmotionReading(label="curious", valence=0.2, arousal=0.4)
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
        "temperature": 0.75,
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
        "temperature": 0.75,
        "stream": True,
        "max_tokens": 1000,
    }

    accumulated = ""
    emitted_length = 0
    HOLD_BACK_CHARS = 16

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

                            tag_idx = accumulated.find("<!--")
                            if tag_idx != -1:
                                safe_boundary = tag_idx
                            else:
                                safe_boundary = max(0, len(accumulated) - HOLD_BACK_CHARS)

                            if safe_boundary > emitted_length:
                                to_emit = accumulated[emitted_length:safe_boundary]
                                # Strip any raw asterisks from stream chunks
                                to_emit = to_emit.replace("**", "").replace("*", "")
                                emitted_length = safe_boundary
                                yield f"data: {json.dumps({'type': 'chunk', 'content': to_emit})}\n\n"
                    except Exception:
                        pass

            clean_text, emotion = _parse_reply_and_emotion(accumulated)
            if len(clean_text) > emitted_length:
                remaining_safe = clean_text[emitted_length:].replace("**", "").replace("*", "")
                yield f"data: {json.dumps({'type': 'chunk', 'content': remaining_safe})}\n\n"

            yield f"data: {json.dumps({'type': 'emotion', 'emotion': emotion.model_dump()})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': f'Groq stream interrupted: {str(exc)}'})}\n\n"
