import urllib.request
import json
import re
import sys
import time

topics = [
    ("stance", "wrestling+stance+basics+tutorial"),
    ("penetration_step", "wrestling+penetration+step+drill"),
    ("sprawl", "wrestling+sprawl+technique+drill"),
    ("double_leg", "wrestling+double+leg+takedown+tutorial"),
    ("single_leg", "wrestling+single+leg+takedown+tutorial"),
    ("snap_down", "wrestling+snap+down+front+headlock+technique"),
    ("cradle", "wrestling+cradle+pin+tutorial+cross+face"),
    ("half_nelson", "wrestling+half+nelson+pin+technique+tutorial"),
    ("standup_escape", "wrestling+stand+up+escape+bottom+position"),
    ("chain_wrestling", "wrestling+chain+wrestling+drill+tutorial"),
    ("hand_fighting", "wrestling+hand+fighting+tie+ups+tutorial"),
    ("high_crotch", "wrestling+high+crotch+takedown+series"),
    ("ankle_pick", "wrestling+ankle+pick+technique+tutorial"),
    ("gut_wrench", "wrestling+tight+waist+gut+wrench+tutorial"),
    ("leg_riding", "wrestling+leg+riding+tutorial"),
    ("sit_out", "wrestling+sit+out+escape+technique"),
    ("body_lock", "wrestling+body+lock+takedown+tutorial"),
    ("arm_drag", "wrestling+arm+drag+technique+tutorial"),
    ("over_under", "wrestling+over+under+wrestling+position"),
    ("conditioning", "wrestling+conditioning+drills+circuit"),
]

results = {}
for key, query in topics:
    url = f"https://www.youtube.com/results?search_query={query}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        ids = re.findall(r'"videoId":"([^"]+)"', html)
        unique_ids = list(dict.fromkeys(ids))[:5]
        results[key] = unique_ids
        print(f"{key}: {unique_ids}", flush=True)
    except Exception as e:
        results[key] = []
        print(f"{key}: ERROR - {e}", flush=True)
    time.sleep(0.5)

print("\n--- DONE ---")
print(json.dumps(results))
