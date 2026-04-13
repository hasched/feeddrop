#!/usr/bin/env python3
"""
feeddrop_scraper.py
====================
Reads cards_new.json (handle + title + tags, no video ID yet),
visits each TikTok profile on the Popular tab,
grabs the first video ID, and writes cards_new_with_ids.json.

Requirements:
  pip install playwright
  python -m playwright install chromium

Usage:
  python feeddrop_scraper.py

Output:
  cards_new_with_ids.json  — ready to paste into cards.json
  cards_new_failed.json    — accounts where no video was found (retry later)
"""

import json
import re
import time
import sys
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    print("Run: pip install playwright && python -m playwright install chromium")
    sys.exit(1)

# ── Config ─────────────────────────────────────────────────
INPUT_FILE   = "cards_new.json"       # your file without IDs
OUTPUT_FILE  = "cards_new_with_ids.json"
FAILED_FILE  = "cards_new_failed.json"
SLEEP        = 2          # seconds between accounts (be polite)
TIMEOUT      = 20_000     # ms per page load

# ── Helpers ────────────────────────────────────────────────

def extract_video_id(html: str, handle: str) -> str | None:
    """Try multiple patterns to extract a video ID from page HTML."""

    # Pattern 1: /video/<id> in href attrs (most reliable)
    matches = re.findall(r'/@' + re.escape(handle) + r'/video/(\d{15,20})', html)
    if matches:
        return matches[0]

    # Pattern 2: generic /video/<id> anywhere
    matches = re.findall(r'/video/(\d{15,20})', html)
    if matches:
        return matches[0]

    # Pattern 3: JSON "id":"<id>" in __NEXT_DATA__ or window.__INITIAL_STATE__
    matches = re.findall(r'"id"\s*:\s*"(\d{15,20})"', html)
    if matches:
        return matches[0]

    return None


def get_first_video(page, handle: str) -> str | None:
    """
    Visit @handle's profile and return the first video ID found.
    Just grabs whatever shows up first — simple and reliable.
    """
    url = f"https://www.tiktok.com/@{handle}"
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT)
        time.sleep(2)

        # Grab first video link — these are always /@handle/video/<id>
        links = page.query_selector_all('a[href*="/video/"]')
        for link in links:
            href = link.get_attribute("href") or ""
            m = re.search(r'/video/(\d{15,20})', href)
            if m:
                return m.group(1)

        # Fallback: scan raw HTML for any video ID
        return extract_video_id(page.content(), handle)

    except PWTimeout:
        print(f"      ⏱  Timeout")
    except Exception as e:
        print(f"      ⚠  Error: {e}")

    return None


# ── Main ───────────────────────────────────────────────────

def main():
    input_path = Path(INPUT_FILE)
    if not input_path.exists():
        print(f"❌  {INPUT_FILE} not found. Make sure it's in the same folder.")
        sys.exit(1)

    cards = json.loads(input_path.read_text(encoding="utf-8"))
    print(f"📋  Loaded {len(cards)} accounts from {INPUT_FILE}")

    # Resume support: skip already-done handles
    out_path = Path(OUTPUT_FILE)
    done = {}
    if out_path.exists():
        existing = json.loads(out_path.read_text(encoding="utf-8"))
        done = {c["handle"]: c for c in existing if c.get("id")}
        print(f"   Resuming — {len(done)} already done, {len(cards) - len(done)} remaining")

    results = list(done.values())
    failed  = []

    remaining = [c for c in cards if c["handle"] not in done]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 900},
        )
        # Block images/media to speed up loading
        context.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}", lambda r: r.abort())

        page = context.new_page()

        total = len(remaining)
        for i, card in enumerate(remaining, start=1):
            handle = card["handle"]
            title  = card["title"]
            print(f"  [{i:>4}/{total}]  @{handle:<30} ... ", end="", flush=True)

            video_id = get_first_video(page, handle)

            if video_id:
                print(f"✓  {video_id}")
                results.append({
                    "id":     video_id,
                    "handle": handle,
                    "title":  title,
                    "tags":   card["tags"],
                })
            else:
                print("✗  skipped")
                failed.append(card)

            # Save progress after every 10 accounts
            if i % 10 == 0:
                out_path.write_text(
                    json.dumps(results, ensure_ascii=False, indent=2),
                    encoding="utf-8"
                )

            time.sleep(SLEEP)

        browser.close()

    # Final save
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    Path(FAILED_FILE).write_text(json.dumps(failed, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅  Done!")
    print(f"   {len(results)} cards written to {OUTPUT_FILE}")
    if failed:
        print(f"   {len(failed)} failed → {FAILED_FILE}  (run again to retry)")
    print(f"\n👉  Copy the contents of {OUTPUT_FILE} and append them to cards.json")


if __name__ == "__main__":
    main()