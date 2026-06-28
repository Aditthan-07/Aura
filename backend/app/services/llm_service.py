"""
Wraps the Google Gemini API call.

We use forced function-calling (tool_config mode=ANY) so the structured
emotion reading is guaranteed to be valid, parseable data on every turn
rather than something we hope the model formats correctly. This mirrors
the same "forced tool-use" approach Anthropic's API offers.
"""
from google import genai
from google.genai import types
from fastapi import HTTPException

from app.core.config import get_settings
from app.models.schemas import ChatMessage, ChatResponse, EmotionReading

SYSTEM_PROMPT = """You are Aura, a warm and perceptive conversational companion. \
Reply naturally and concisely (1-4 sentences typically, more only if the user's \
message clearly calls for depth). Avoid generic chatbot filler like "I'm here to \
help" or "great question."

Alongside every reply, report your honest read of the emotional tone of THIS \
exchange — not a performance, your actual read of valence (how positive/negative) \
and arousal (how calm/energized) the conversation feels right now, plus the single \
best-fitting label. Let this shift naturally turn to turn as the conversation moves."""

RESPOND_FUNCTION = types.FunctionDeclaration(
    name="respond",
    description=(
        "Send your conversational reply along with a structured read of the "
        "emotional tone of the exchange."
    ),
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

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client


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


async def get_companion_reply(history: list[ChatMessage], message: str) -> ChatResponse:
    settings = get_settings()
    client = _get_client()

    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=_to_api_contents(history, message),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[types.Tool(function_declarations=[RESPOND_FUNCTION])],
                tool_config=types.ToolConfig(
                    function_calling_config=types.FunctionCallingConfig(
                        mode=types.FunctionCallingConfigMode.ANY,
                        allowed_function_names=["respond"],
                    )
                ),
            ),
        )
    except genai.errors.ClientError as exc:
        if exc.code == 401 or exc.code == 403:
            raise HTTPException(status_code=500, detail="Invalid Gemini API key on server.") from exc
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc.message}") from exc
    except genai.errors.ServerError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc.message}") from exc

    function_call = None
    if response.candidates:
        for part in response.candidates[0].content.parts:
            if part.function_call is not None:
                function_call = part.function_call
                break

    if function_call is None:
        raise HTTPException(status_code=502, detail="Model did not return structured output.")

    data = function_call.args
    return ChatResponse(
        reply=data["reply"],
        emotion=EmotionReading(**data["emotion"]),
    )
