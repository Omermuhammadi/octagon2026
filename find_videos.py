import urllib.request
import json
import re
import sys
import time

searches = {
    "stance": "wrestling+stance+basics+tutorial+kolat",
    "penetration_step": "wrestling+penetration+step+drill+technique",
    "sprawl": "wrestling+sprawl+technique+drill+defense",
    "double_leg": "wrestling+double+leg+takedown+tutorial+technique",
    "single_leg": "wrestling+single+leg+takedown+tutorial+technique",
    "snap_down": "wrestling+snap+down+front+headlock",
    "cradle": "wrestling+cradle+pin+tutorial",
    "half_nelson": "wrestling+half+nelson+pin+technique",
    "standup_escape": "wrestling+standup+escape+bottom+position",
    "chain_wrestling": "wrestling+chain+wrestling+drill",
    "hand_fighting": "wrestling+hand+fighting+tie+ups",
    "high_crotch": "wrestling+high+crotch+takedown",
    "ankle_pick": "wrestling+ankle+pick+technique",
    "gut_wrench": "wrestling+gut+wrench+technique",
    "leg_riding": "wrestling+leg+riding+technique",
    "sit_out": "wrestling+sit+out+escape+technique",
    "body_lock": "wrestling+body+lock+takedown",
    "arm_drag": "wrestling+arm+drag+technique",
    "over_under": "wrestling+over+under+clinch+position",
    "conditioning": "wrestling+conditioning+drills+workout",
}

base = "https://www.youtube.com/results?search_query="
results = {}

for key, query in searches.items():
    try:
        req = urllib.request.Request(
            base + query,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        resp = urllib.request.urlopen(req, timeout=10)
        html = resp.read().decode("utf-8", errors="ignore")
        ids = list(dict.fromkeys(re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', html)))
        results[key] = ids[:5]
        print(f"OK {key}: {ids[:3]}")
    except Exception as e:
        results[key] = []
        print(f"ERR {key}: {e}")
    time.sleep(1)

# Now verify each first video
print("\n=== VERIFICATION ===")
verified = {}
oembed = "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v="

for key, ids in results.items():
    for vid in ids:
        try:
            req = urllib.request.Request(oembed + vid)
            resp = urllib.request.urlopen(req, timeout=5)
            data = json.loads(resp.read().decode())
            verified[key] = {"id": vid, "title": data.get("title", "?")}
            print(f"VERIFIED {key}: {vid} - {data.get('title', '?')}")
            break
        except Exception as e:
            print(f"SKIP {key}/{vid}: {e}")
            continue
    if key not in verified:
        verified[key] = {"id": "NONE", "title": "no valid video found"}

print("\n=== FINAL RESULTS ===")
for key, info in verified.items():
    vid = info["id"]
    title = info["title"]
    url = f"https://www.youtube.com/watch?v={vid}" if vid != "NONE" else "NONE"
    print(f"{key}: {url} | {title}")
