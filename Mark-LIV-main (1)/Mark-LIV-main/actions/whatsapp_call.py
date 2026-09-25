"""
actions/whatsapp_call.py — JARVIS phones someone on WhatsApp, talks to them, and
reports back what they said.

    "Call Bob and ask what he's doing"
        → WhatsApp Desktop opens, Bob's chat is found, the voice call starts
        → a second, private Gemini Live session holds the conversation with Bob
        → the call is hung up and JARVIS tells you what Bob said

HOW THE AUDIO GETS IN AND OUT OF THE CALL
    WhatsApp only talks to sound devices, so the call is wired through two
    virtual audio cables. Nothing here touches the user's own mic or speakers:
    the main conversation keeps running exactly as before.

        JARVIS voice ──► [voice_to_call_device] ══cable══► WhatsApp microphone
        WhatsApp speaker ══cable══► [audio_from_call_device] ──► JARVIS ears

    Windows: install VB-Audio "VB-CABLE" and "VB-CABLE A+B" (free), then in
             WhatsApp → Settings → Calls (or the in-call audio menu) set
                 Microphone = "CABLE Output (VB-Audio Virtual Cable)"
                 Speaker    = "CABLE-A Input (VB-Audio Cable A)"
    macOS:   install BlackHole 2ch + BlackHole 16ch and pick them the same way.

    The two JARVIS-side devices are found automatically when their names look
    like the above. Anything else can be set explicitly in
    config/api_keys.json:

        "plugin_config": {
            "whatsapp_call": {
                "voice_to_call_device":   "CABLE Input (VB-Audio Virtual Cable)",
                "audio_from_call_device": "CABLE-A Output (VB-Audio Cable A)",
                "max_call_seconds": 240,
                "ring_timeout_seconds": 60
            }
        }

WHY A SECOND LIVE SESSION
    The main session is bound to the user's microphone and speakers. The person
    on the call needs their own listener and their own voice, so the call gets a
    dedicated session with one job (the task), one tool (end_call) and a
    transcript of both sides — which is what the report back is built from.

WHY IT RUNS IN THE BACKGROUND
    A call takes minutes. When JARVIS can speak on its own (the `speak`
    callback), the tool returns at once and the report is injected as a
    [CALL_REPORT] message when the call ends, so the user is never left with a
    frozen assistant. Without that callback it simply blocks and returns the
    report as the tool result.
"""
from __future__ import annotations

import asyncio
import json
import re
import sys
import threading
import time
import webbrowser
from pathlib import Path

try:
    import pyautogui
    _PYAUTOGUI = True
except ImportError:
    _PYAUTOGUI = False


_NS = "whatsapp_call"

SEND_RATE = 16000       # what the Live API expects from us
RECV_RATE = 24000       # what the Live API speaks at
_CHUNK    = 1024

_DEFAULT_MAX_SECONDS  = 240
_DEFAULT_RING_TIMEOUT = 60
_IDLE_HANGUP_SECONDS  = 25   # answered, then nobody said anything for this long

# Device names that are almost certainly the right end of a virtual cable.
# Matched case-insensitively as substrings, first hit wins.
_VOICE_OUT_HINTS = ("cable input (vb-audio virtual", "cable input",
                    "blackhole 2ch", "jarvis_to_call")
_CALL_IN_HINTS   = ("cable-a output", "cable-b output", "blackhole 16ch",
                    "jarvis_from_call", "stereo mix")

# One call at a time — two would fight over the same cables and the same window.
_call_lock = threading.Lock()


# ── config ───────────────────────────────────────────────────────────────────

def _base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


def _config() -> dict:
    try:
        return json.loads((_base_dir() / "config" / "api_keys.json")
                          .read_text(encoding="utf-8"))
    except Exception:
        return {}


def _settings() -> dict:
    pc = _config().get("plugin_config")
    val = pc.get(_NS) if isinstance(pc, dict) else None
    return dict(val) if isinstance(val, dict) else {}


def _int_setting(key: str, default: int) -> int:
    try:
        return max(10, int(_settings().get(key, default)))
    except Exception:
        return default


def _live_model() -> str:
    try:
        from core import gemini
        return gemini._live_model()
    except Exception:
        return "models/gemini-3.1-flash-live-preview"


# ── audio devices ────────────────────────────────────────────────────────────

def _pick_device(kind: str, configured: str, hints: tuple[str, ...]):
    """(sounddevice index, name) for the cable end, or (None, '') if absent.

    A configured name wins; otherwise the device list is searched for the usual
    virtual-cable names. Never falls back to the system default — sending
    JARVIS's call voice to the user's speakers would be worse than failing."""
    from core import audio_devices

    names = audio_devices.list_devices(kind)
    wanted = (configured or "").strip()
    if not wanted:
        for hint in hints:
            wanted = next((n for n in names if hint in n.lower()), "")
            if wanted:
                break
    if not wanted:
        return None, ""
    idx = audio_devices.resolve(wanted, kind)
    return (idx, wanted) if idx is not None else (None, wanted)


_SETUP_HELP = (
    "WhatsApp calling needs two virtual audio cables so I can speak into the "
    "call and hear it. On Windows install VB-CABLE and VB-CABLE A+B from "
    "vb-audio.com, then in WhatsApp's call settings set the microphone to "
    "'CABLE Output' and the speaker to 'CABLE-A Input'. On a Mac use BlackHole "
    "2ch and 16ch the same way. {detail}"
)


# ── driving WhatsApp Desktop ─────────────────────────────────────────────────

def _looks_like_number(s: str) -> bool:
    digits = re.sub(r"[^\d]", "", s)
    return len(digits) >= 7 and not re.search(r"[A-Za-z]", s)


def _open_chat(contact: str, phone: str) -> str | None:
    """Bring the contact's chat to the front. Returns an error string or None."""
    from actions import send_message as sm

    number = phone or (contact if _looks_like_number(contact) else "")
    if number:
        digits = re.sub(r"[^\d]", "", number)
        try:
            webbrowser.open(f"whatsapp://send?phone={digits}")
        except Exception as e:
            return f"could not open WhatsApp for {number}: {e}"
        time.sleep(4.0)
        return None

    if not sm._open_app("WhatsApp"):
        return "could not open WhatsApp Desktop"
    time.sleep(1.0)
    sm._search_in_app(contact)
    pyautogui.press("enter")
    time.sleep(1.5)
    return None


def _find(description: str):
    from actions.computer_control import _screen_find
    return _screen_find(description)


def _start_voice_call() -> bool:
    pos = _find(
        "the VOICE call button (a phone-handset icon) in the header at the top "
        "right of the open WhatsApp chat. Not the video-camera button"
    )
    if not pos:
        return False
    pyautogui.click(*pos)
    time.sleep(1.2)
    # Some WhatsApp builds open a small menu instead of calling straight away.
    menu = _find("a menu item labelled 'Voice call' or 'Audio call'")
    if menu:
        pyautogui.click(*menu)
    time.sleep(2.0)
    return True


def _hang_up() -> bool:
    pos = _find("the red 'end call' / hang-up button of the WhatsApp call window")
    if not pos:
        return False
    pyautogui.click(*pos)
    return True


# ── the conversation ─────────────────────────────────────────────────────────

_END_CALL_DECL = {
    "name": "end_call",
    "description": (
        "Hang up the call. Call it after you have said goodbye, or at once if "
        "nobody answers, it is voicemail, or the person does not want to talk."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "outcome": {
                "type": "STRING",
                "description": "answered | no_answer | voicemail | declined",
            },
            "summary": {
                "type": "STRING",
                "description": (
                    "What the person said in answer to the task, faithfully and "
                    "in their words where it matters. Empty if nobody answered."
                ),
            },
        },
        "required": ["outcome", "summary"],
    },
}


def _instructions(contact: str, task: str) -> str:
    cfg = _config()
    me = (cfg.get("assistant_name") or "JARVIS").strip()
    user = (cfg.get("user_name") or "").strip() or "my boss"
    return (
        f"You are {me}, a personal AI assistant, on a WhatsApp voice call you "
        f"placed to {contact} on behalf of {user}.\n\n"
        f"YOUR TASK ON THIS CALL: {task}\n\n"
        "HOW TO RUN THE CALL\n"
        "- The call is ringing when you join. Ringing tones are not a person: "
        "stay completely silent until a human voice speaks.\n"
        f"- When they answer, greet them briefly, say you are {me} calling for "
        f"{user}, then do the task. Keep every sentence short and natural — "
        "this is a phone call.\n"
        "- Listen to the whole answer. Ask one short follow-up only if the "
        "answer is unclear. Do not chat beyond the task.\n"
        "- Never agree to anything, promise anything or share personal details "
        f"on {user}'s behalf; say you will pass the message on.\n"
        "- Speak the language the person answers in.\n"
        "- When the task is done, thank them, say goodbye, and THEN call "
        "end_call with a faithful summary of what they said.\n"
        "- If nobody answers, you reach voicemail, or they do not want to talk, "
        "call end_call right away with the matching outcome."
    )


class _Transcript:
    def __init__(self, me: str, them: str):
        self.me, self.them = me, them
        self.turns: list[list[str]] = []   # [speaker, text]

    def add(self, speaker: str, text: str) -> None:
        text = (text or "").strip()
        if not text:
            return
        if self.turns and self.turns[-1][0] == speaker:
            self.turns[-1][1] += " " + text
        else:
            self.turns.append([speaker, text])

    def heard_them(self) -> bool:
        return any(s == self.them for s, _ in self.turns)

    def text(self) -> str:
        return "\n".join(f"{s}: {' '.join(t.split())}" for s, t in self.turns)


async def _converse(contact: str, task: str, out_idx, in_idx, log) -> dict:
    import numpy as np
    import sounddevice as sd
    from google import genai
    from google.genai import types
    from core import gemini

    try:
        from memory.config_manager import get_voice
        voice = get_voice()
    except Exception:
        voice = None

    me = (_config().get("assistant_name") or "JARVIS").strip()
    transcript = _Transcript(me, contact)
    result = {"outcome": "", "summary": ""}
    done = asyncio.Event()
    state = {"last_activity": time.monotonic(), "answered_at": None}

    cfg = dict(
        response_modalities=["AUDIO"],
        input_audio_transcription={},
        output_audio_transcription={},
        system_instruction=_instructions(contact, task),
        tools=[{"function_declarations": [_END_CALL_DECL]}],
    )
    if voice:
        cfg["speech_config"] = types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)))

    loop = asyncio.get_running_loop()
    mic_q: asyncio.Queue = asyncio.Queue(maxsize=200)
    spk_q: asyncio.Queue = asyncio.Queue()

    def _on_call_audio(indata, _frames, _t, _status):
        data = bytes(indata)
        def _put():
            if not mic_q.full():
                mic_q.put_nowait(data)
        loop.call_soon_threadsafe(_put)

    in_stream = sd.RawInputStream(samplerate=SEND_RATE, channels=1, dtype="int16",
                                  blocksize=_CHUNK, device=in_idx,
                                  callback=_on_call_audio)
    out_stream = sd.RawOutputStream(samplerate=RECV_RATE, channels=1,
                                    dtype="int16", blocksize=_CHUNK, device=out_idx)

    client = genai.Client(api_key=gemini.api_key())
    async with client.aio.live.connect(model=_live_model(),
                                       config=types.LiveConnectConfig(**cfg)) as session:

        async def send_audio():
            while True:
                data = await mic_q.get()
                await session.send_realtime_input(
                    audio=types.Blob(data=data, mime_type=f"audio/pcm;rate={SEND_RATE}"))

        async def play_audio():
            while True:
                chunk = await spk_q.get()
                await asyncio.to_thread(out_stream.write, chunk)

        async def receive():
            while True:
                async for msg in session.receive():
                    if msg.data:
                        spk_q.put_nowait(msg.data)
                        state["last_activity"] = time.monotonic()

                    sc = msg.server_content
                    if sc:
                        if getattr(sc, "interrupted", False):
                            while not spk_q.empty():
                                spk_q.get_nowait()
                        if sc.input_transcription and sc.input_transcription.text:
                            transcript.add(contact, sc.input_transcription.text)
                            state["last_activity"] = time.monotonic()
                            if state["answered_at"] is None:
                                state["answered_at"] = time.monotonic()
                                log(f"{contact} answered")
                        if sc.output_transcription and sc.output_transcription.text:
                            transcript.add(me, sc.output_transcription.text)

                    tc = msg.tool_call
                    if tc and tc.function_calls:
                        responses = []
                        for fc in tc.function_calls:
                            if fc.name == "end_call":
                                args = dict(fc.args or {})
                                result["outcome"] = str(args.get("outcome", "")).strip()
                                result["summary"] = str(args.get("summary", "")).strip()
                            responses.append(types.FunctionResponse(
                                id=fc.id, name=fc.name, response={"result": "ok"}))
                        await session.send_tool_response(function_responses=responses)
                        if result["outcome"]:
                            done.set()

        async def watchdog(max_s: int, ring_s: int):
            start = time.monotonic()
            while not done.is_set():
                await asyncio.sleep(1.0)
                now = time.monotonic()
                if now - start > max_s:
                    result["outcome"] = result["outcome"] or "time_limit"
                    done.set()
                elif state["answered_at"] is None and now - start > ring_s:
                    result["outcome"] = "no_answer"
                    done.set()
                elif (state["answered_at"] is not None and spk_q.empty()
                      and now - state["last_activity"] > _IDLE_HANGUP_SECONDS):
                    result["outcome"] = result["outcome"] or "line_went_quiet"
                    done.set()

        in_stream.start()
        out_stream.start()
        tasks = [asyncio.create_task(c) for c in (
            send_audio(), play_audio(), receive(),
            watchdog(_int_setting("max_call_seconds", _DEFAULT_MAX_SECONDS),
                     _int_setting("ring_timeout_seconds", _DEFAULT_RING_TIMEOUT)),
        )]
        try:
            finished = asyncio.create_task(done.wait())
            tasks.append(finished)
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            # A crashed task (socket closed, device vanished) ends the call too.
            for t in tasks:
                if t.done() and not t.cancelled() and t.exception():
                    log(f"call audio error: {t.exception()}")
                    result["outcome"] = result["outcome"] or "error"
            # Let the goodbye finish playing before the line is cut.
            deadline = time.monotonic() + 8.0
            while not spk_q.empty() and time.monotonic() < deadline:
                await asyncio.sleep(0.2)
            await asyncio.sleep(1.0)
        finally:
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            for s in (in_stream, out_stream):
                try:
                    s.stop(); s.close()
                except Exception:
                    pass

    if not result["outcome"]:
        result["outcome"] = "answered" if transcript.heard_them() else "no_answer"
    result["transcript"] = transcript.text()
    result["heard_them"] = transcript.heard_them()
    return result


# ── report ───────────────────────────────────────────────────────────────────

_OUTCOME_TEXT = {
    "answered":        "{c} answered.",
    "no_answer":       "{c} did not answer.",
    "voicemail":       "The call went to {c}'s voicemail.",
    "declined":        "{c} did not want to talk right now.",
    "time_limit":      "The call hit the time limit and was ended.",
    "line_went_quiet": "The line went quiet, so the call was ended.",
    "error":           "The call was cut off by an audio or connection error.",
}


def _report(contact: str, task: str, r: dict, hung_up: bool) -> str:
    outcome = r.get("outcome", "")
    lines = [
        f"WhatsApp call to {contact} is over. Task was: {task}",
        _OUTCOME_TEXT.get(outcome, f"Outcome: {outcome}.").format(c=contact),
    ]
    if r.get("summary"):
        lines.append(f"What {contact} said: {r['summary']}")
    if r.get("transcript"):
        lines.append("Transcript:\n" + r["transcript"])
    elif r.get("heard_them") is False:
        lines.append(f"Nothing was heard from {contact}.")
    if not hung_up:
        lines.append("I could not find the hang-up button — the WhatsApp call "
                     "may still be open; ask the user to end it.")
    lines.append(f"Tell the user, in one or two sentences, what {contact} said.")
    return "\n".join(lines)


def _run_call(contact: str, task: str, phone: str, log) -> str:
    """The whole call, start to report. Never raises."""
    out_idx, out_name = _pick_device("output", _settings().get("voice_to_call_device", ""),
                                     _VOICE_OUT_HINTS)
    in_idx, in_name = _pick_device("input", _settings().get("audio_from_call_device", ""),
                                   _CALL_IN_HINTS)
    if out_idx is None or in_idx is None:
        missing = []
        if out_idx is None:
            missing.append(f"no output cable for my voice{f' ({out_name!r} cannot be opened)' if out_name else ''}")
        if in_idx is None:
            missing.append(f"no input cable for the call audio{f' ({in_name!r} cannot be opened)' if in_name else ''}")
        return _SETUP_HELP.format(detail="Missing: " + "; ".join(missing) + ".")
    log(f"call audio: voice → {out_name} | hearing ← {in_name}")

    err = _open_chat(contact, phone)
    if err:
        return f"Could not call {contact}: {err}."
    if not _start_voice_call():
        return (f"I opened WhatsApp but could not find the voice-call button for "
                f"{contact}. Check that the chat is open and try again.")
    log(f"calling {contact}…")

    try:
        r = asyncio.run(_converse(contact, task, out_idx, in_idx, log))
    except Exception as e:
        r = {"outcome": "error", "summary": "", "transcript": "", "error": str(e)}
        log(f"call failed: {e}")

    hung_up = _hang_up()
    if not hung_up and r.get("outcome") in ("no_answer", "declined", "error"):
        hung_up = True   # the other side usually closed the window already
    report = _report(contact, task, r, hung_up)
    if r.get("error"):
        report += f"\n(Error: {r['error']})"
    return report


# ── tool entry point ─────────────────────────────────────────────────────────

def whatsapp_call(parameters: dict, player=None, speak=None) -> str:
    params  = parameters or {}
    contact = str(params.get("contact", "")).strip()
    task    = str(params.get("task", "")).strip()
    phone   = str(params.get("phone_number", "")).strip()

    if not contact and not phone:
        return "Who should I call?"
    contact = contact or phone
    if not task:
        return f"What should I say or ask when {contact} picks up?"
    if not _PYAUTOGUI:
        return "PyAutoGUI is not installed — I cannot drive WhatsApp. Run: pip install pyautogui"

    def log(msg: str) -> None:
        print(f"[WhatsAppCall] {msg}")
        if player:
            try:
                player.write_log(f"[call] {msg}")
            except Exception:
                pass

    if not _call_lock.acquire(blocking=False):
        return "I'm already on a call. I'll report back when it ends."

    def work() -> str:
        try:
            return _run_call(contact, task, phone, log)
        except Exception as e:
            return f"The call to {contact} failed: {e}"
        finally:
            _call_lock.release()

    if speak is None:
        return work()

    def background():
        report = work()
        log(report.splitlines()[0] if report else "call finished")
        try:
            speak("[CALL_REPORT]\n" + report)
        except Exception as e:
            print(f"[WhatsAppCall] could not deliver report: {e}")

    threading.Thread(target=background, daemon=True, name="whatsapp-call").start()
    return (f"[TOOL_STARTING] Calling {contact} on WhatsApp now. Tell the user in "
            f"one short sentence that you're calling and will report back; the "
            f"report arrives by itself as a [CALL_REPORT] message.")


# ── Tool declaration (auto-discovered by core/action_loader.py) ──────────────
TOOL = {
    "name": "whatsapp_call",
    "description": (
        "Places a WhatsApp VOICE CALL to a contact, has a spoken conversation "
        "with them on the user's behalf, then reports back what they said. Use "
        "for 'call Bob and ask what he's doing', 'ring mum and tell her I'll be "
        "late', 'phone Alex and find out if he's free tonight'. For a written "
        "message use send_message instead."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "contact": {
                "type": "STRING",
                "description": "Contact name exactly as saved in WhatsApp",
            },
            "task": {
                "type": "STRING",
                "description": (
                    "What to say or find out on the call, phrased as an "
                    "instruction, e.g. 'Ask what he is doing right now'"
                ),
            },
            "phone_number": {
                "type": "STRING",
                "description": "Optional phone number with country code, if given instead of a saved contact",
            },
        },
        "required": ["contact", "task"],
    },
    "handler": whatsapp_call,
}
