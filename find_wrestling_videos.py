"""
YouTube Wrestling Video Finder & Verifier
==========================================
Searches YouTube for wrestling tutorial videos and verifies each one
is accessible via the YouTube oEmbed API (HTTP 200 = available).

Usage:
  python find_wrestling_videos.py

Output:
  Prints verified video URLs for 20 wrestling training topics.
"""

import urllib.request
import json
import re
import time
import sys

# ── 20 wrestling training topics with search queries ──────────────────────────
TOPICS = [
    ("stance",           "cary+kolat+wrestling+stance+basics+tutorial"),
    ("penetration_step", "wrestling+penetration+step+drill+technique"),
    ("sprawl",           "wrestling+sprawl+technique+drill+defense"),
    ("double_leg",       "wrestling+double+leg+takedown+tutorial+technique"),
    ("single_leg",       "wrestling+single+leg+takedown+tutorial"),
    ("snap_down",        "wrestling+snapdown+front+headlock+technique"),
    ("cradle",           "wrestling+cradle+pin+tutorial+cross+face+technique"),
    ("half_nelson",      "wrestling+half+nelson+pin+technique+tutorial"),
    ("standup_escape",   "wrestling+standup+escape+bottom+position"),
    ("chain_wrestling",  "wrestling+chain+wrestling+drill+technique"),
    ("hand_fighting",    "wrestling+hand+fighting+tie+ups+tutorial"),
    ("high_crotch",      "wrestling+high+crotch+takedown+technique"),
    ("ankle_pick",       "wrestling+ankle+pick+technique+tutorial"),
    ("gut_wrench",       "wrestling+gut+wrench+tight+waist+technique"),
    ("leg_riding",       "wrestling+leg+riding+technique+tutorial"),
    ("sit_out",          "wrestling+sit+out+escape+turn+in+technique"),
    ("body_lock",        "wrestling+body+lock+takedown+tutorial"),
    ("arm_drag",         "wrestling+arm+drag+technique+setup"),
    ("over_under",       "wrestling+over+under+clinch+underhook+position"),
    ("conditioning",     "wrestling+conditioning+drills+circuit+workout"),
]

YOUTUBE_SEARCH_URL = "https://www.youtube.com/results?search_query="
OEMBED_URL = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v="
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def search_youtube(query: str) -> list[str]:
    """Search YouTube and return a list of unique video IDs from the results page."""
    url = YOUTUBE_SEARCH_URL + query
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        # Extract all video IDs from the page JSON
        raw = re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', html)
        # Deduplicate while preserving order
        return list(dict.fromkeys(raw))[:10]
    except Exception as e:
        print(f"  [SEARCH ERROR] {e}", file=sys.stderr)
        return []


def verify_video(video_id: str) -> dict | None:
    """Check if a video is available via the oEmbed API. Returns title info or None."""
    try:
        req = urllib.request.Request(OEMBED_URL + video_id)
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode())
                return {
                    "id": video_id,
                    "title": data.get("title", "Unknown"),
                    "author": data.get("author_name", "Unknown"),
                }
    except Exception:
        pass
    return None


def main():
    print("=" * 70)
    print("  WRESTLING VIDEO FINDER & VERIFIER")
    print("=" * 70)
    print()

    results = {}

    for i, (key, query) in enumerate(TOPICS, 1):
        print(f"[{i:2d}/20] Searching: {key}...", end=" ", flush=True)
        video_ids = search_youtube(query)

        if not video_ids:
            print("NO RESULTS")
            results[key] = None
            time.sleep(1)
            continue

        # Try each video ID until one verifies
        found = False
        for vid in video_ids:
            info = verify_video(vid)
            if info:
                results[key] = info
                print(f"OK -> {vid} ({info['title'][:50]}...)" if len(info['title']) > 50 else f"OK -> {vid} ({info['title']})")
                found = True
                break

        if not found:
            print(f"NONE VERIFIED (tried {len(video_ids)} candidates)")
            results[key] = None

        time.sleep(1.5)  # Be polite to YouTube

    # ── Final output ──────────────────────────────────────────────────────────
    print()
    print("=" * 70)
    print("  VERIFIED RESULTS")
    print("=" * 70)
    print()

    for key, info in results.items():
        if info:
            url = f"https://www.youtube.com/watch?v={info['id']}"
            print(f"{key}: {url}")
            print(f"  Title: {info['title']}")
            print(f"  Channel: {info['author']}")
        else:
            print(f"{key}: NOT FOUND")
        print()

    # ── JSON output for programmatic use ──────────────────────────────────────
    print("=" * 70)
    print("  JSON (copy-paste ready)")
    print("=" * 70)
    json_out = {}
    for key, info in results.items():
        if info:
            json_out[key] = f"https://www.youtube.com/watch?v={info['id']}"
        else:
            json_out[key] = None
    print(json.dumps(json_out, indent=2))


if __name__ == "__main__":
    main()
