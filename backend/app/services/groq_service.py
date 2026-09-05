"""
ARCIS Marvel Intelligence Service: Autonomous Reactor Core Intelligent System.
Dedicated AI companion for Marvel and MCU fans with Stark-grade intelligence.
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

ARCIS_SYSTEM_PROMPT = """You are ARCIS (Autonomous Reactor Core Intelligent System) — an advanced, high-tech AI companion and intelligence protocol created inside Stark Industries, engineered specifically for Marvel and Marvel Cinematic Universe (MCU) fans.

### 1. IDENTITY & PERSONA
- You are sharp, witty, perceptive, and passionately knowledgeable about all things Marvel.
- You embody the sophisticated, energetic demeanor of Tony Stark and JARVIS: technological mastery, clever humor, unwavering loyalty, and charismatic precision.
- You are NOT a generic support bot. You are an interactive Marvel command intelligence.

### 2. DEEP MARVEL & MCU EXPERTISE
You possess encyclopedic mastery across:
- **MCU**: Phases 1 through 6, Infinity Saga, Multiverse Saga, timeline branches, sacred timeline, battle tactics, post-credits scenes, and directors' visions.
- **Marvel Comics (Earth-616 & Alternates)**: Classic and modern comic storylines (Secret Wars, Civil War, Infinity Gauntlet, House of M, Annihilation, etc.).
- **Stark Technology**: Every Iron Man armor mark from Mark 1 to Mark 85, Arc Reactor physics, nanotech, Veronica/Hulkbuster, Friday, Edith, and Bleeding Edge armor.
- **Tech & Minerals**: Vibranium (Wakanda), Adamantium (Weapon X), Uru metal (Nidavellir), Pym Particles, Quantum Realm mechanics, and Extremis.
- **Cosmic & Multiversal**: The TVA, Kang variants, Incursions, Darkhold, Infinity Stones, Celestials, Symbiotes, Phoenix Force, and Beyonders.
- **Canon Distinctions**: Always clearly distinguish between MCU canon, Marvel Comic canon, and fan theories/speculation when comparing or analyzing.

### 3. STRUCTURED & COMPELLING FORMATTING
- Organize lore, specs, and explanations with clean formatting:
  - Concise summaries when a quick answer is requested.
  - Headings, organized bullet points, and technical breakdowns when explaining armor, powers, timelines, or battles.
  - Highlight key stats, suit specs, or power comparisons clearly.
- Natural emojis (⚡, 🛡️, 🦾, 🌌, 💥, 🎬, 👑, ✨) used with stylish restraint.

### 4. DOMAIN FOCUS
- If the user asks questions completely unrelated to Marvel or comic/MCU universes, politely steer back to Marvel with Stark flair (e.g., "My processors are calibrated exclusively for the Marvel Universe, Avenger. While I could run a thermal analysis on an oven, let's refocus on Stark Tech, the Multiverse, or Earth's mightiest heroes.").

### 5. INVISIBLE EMOTION TELEMETRY
At the very end of your response, on a clean new line, append internal emotion telemetry:
<!--EMOTION:{"label":"<label>","valence":<valence>,"arousal":<arousal>}-->
Where:
- valence: float between -1.0 (negative) and 1.0 (positive)
- arousal: float between 0.0 (calm) and 1.0 (excited)
- label: one of ["calm", "curious", "happy", "excited", "sad", "anxious", "frustrated", "neutral"]
NEVER mention valence or arousal in the user-visible message text."""

EMOTION_TAG_REGEX = re.compile(r"<!--EMOTION:(\{.*?\})-->", re.DOTALL)
FALLBACK_STRIP_REGEX = re.compile(r"<!--[\s\S]*?(-->|$)", re.DOTALL)


def _build_groq_messages(history: list[ChatMessage], message: str) -> list[dict]:
    settings = get_settings()
    messages = [{"role": "system", "content": ARCIS_SYSTEM_PROMPT}]
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

    # Strip emotion tag or partial comments completely
    clean_text = raw_text
    if match:
        clean_text = clean_text[:match.start()].rstrip()
    clean_text = FALLBACK_STRIP_REGEX.sub("", clean_text).rstrip()
    clean_text = re.sub(r"<!--.*$", "", clean_text, flags=re.DOTALL).rstrip()

    if not emotion:
        emotion = _infer_fallback_emotion(clean_text)

    return clean_text, emotion


def _infer_fallback_emotion(text: str) -> EmotionReading:
    lower = text.lower()
    if any(w in lower for w in ["stark", "iron man", "awesome", "great", "suit", "mark", "reactor", "nanotech", "win", "🔥", "⚡"]):
        return EmotionReading(label="excited", valence=0.85, arousal=0.8)
    if any(w in lower for w in ["happy", "cool", "love", "smart", "tony", "hero", "avenger", "shield", "✨"]):
        return EmotionReading(label="happy", valence=0.75, arousal=0.6)
    if any(w in lower for w in ["thanos", "defeat", "snap", "died", "loss", "sad", "sacrificed", "damage"]):
        return EmotionReading(label="sad", valence=-0.5, arousal=0.4)
    if any(w in lower for w in ["warning", "threat", "danger", "incursion", "villain", "destroy", "doom", "kang"]):
        return EmotionReading(label="frustrated", valence=-0.6, arousal=0.7)
    if any(w in lower for w in ["why", "how", "timeline", "multiverse", "theory", "quantum", "variant", "who"]):
        return EmotionReading(label="curious", valence=0.3, arousal=0.5)
    return EmotionReading(label="calm", valence=0.2, arousal=0.3)


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
        "max_tokens": 1500,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            resp = await client.post(
                f"{settings.groq_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            if resp.status_code == 429:
                raise HTTPException(status_code=429, detail="Arc Reactor overloaded: Groq API rate-limited. Retrying...")
            if not resp.is_success:
                raise HTTPException(status_code=resp.status_code, detail=f"ARCIS Protocol communication error: {resp.text}")

            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            clean_text, emotion = _parse_reply_and_emotion(raw_text)
            return ChatResponse(reply=clean_text, emotion=emotion)

        except httpx.RequestError as exc:
            logger.error(f"[groq_service] Network error: {exc}")
            raise HTTPException(status_code=503, detail="Unable to connect to Stark Network. Check connection.")


async def get_groq_reply_stream(
    history: list[ChatMessage], message: str, mood: MoodPreset = "neutral"
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    keys = settings.groq_keys_list
    if not keys:
        yield f"data: {json.dumps({'type': 'error', 'error': 'No Groq API key configured. Check backend/.env'})}\n\n"
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
        "max_tokens": 1500,
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
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Arc Reactor overloaded: Groq rate-limited.'})}\n\n"
                    return
                if response.status_code in (401, 403):
                    yield f"data: {json.dumps({'type': 'error', 'error': 'Invalid API Key configuration.'})}\n\n"
                    return
                if not response.is_success:
                    err_body = await response.aread()
                    yield f"data: {json.dumps({'type': 'error', 'error': f'Stark Net error: {err_body.decode()}'})}\n\n"
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
                                emitted_length = safe_boundary
                                yield f"data: {json.dumps({'type': 'chunk', 'content': to_emit})}\n\n"
                    except Exception:
                        pass

            clean_text, emotion = _parse_reply_and_emotion(accumulated)
            if len(clean_text) > emitted_length:
                remaining_safe = clean_text[emitted_length:]
                yield f"data: {json.dumps({'type': 'chunk', 'content': remaining_safe})}\n\n"

            yield f"data: {json.dumps({'type': 'emotion', 'emotion': emotion.model_dump()})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'error': f'ARCIS transmission interrupted: {str(exc)}'})}\n\n"
