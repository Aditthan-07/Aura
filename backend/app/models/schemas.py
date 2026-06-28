"""
Request/response contracts for the chat API.

The EmotionReading is the core of the project's "unique idea": the LLM
itself reports how it's reading the emotional tone of the conversation,
on the same turn it replies. The frontend uses this to drive the orb's
visual state — no separate sentiment model required.
"""
from typing import Literal
from pydantic import BaseModel, Field

EmotionLabel = Literal[
    "calm", "curious", "happy", "excited", "sad", "anxious", "frustrated", "neutral"
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list)


class EmotionReading(BaseModel):
    label: EmotionLabel
    valence: float = Field(..., ge=-1.0, le=1.0, description="negative <-> positive")
    arousal: float = Field(..., ge=0.0, le=1.0, description="calm <-> energized")


class ChatResponse(BaseModel):
    reply: str
    emotion: EmotionReading
