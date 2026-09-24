"""tts.py — one narration clip plus its word timings (used by engine.js to fire each action on its spoken word).

    python tts.py <voice> <rate> <text> <out.mp3>

Writes <out.mp3> and <out.mp3>.words.json = [{"t": seconds_from_clip_start, "w": "word"}, ...]
"""
import asyncio
import json
import sys

import edge_tts


async def main(voice, rate, text, out):
    words = []
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    with open(out, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"t": round(ch["offset"] / 1e7, 3), "w": ch["text"]})
    with open(out + ".words.json", "w", encoding="utf-8") as f:
        json.dump(words, f)


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:5]))
