"""
scrape_router.py — free-first scraping router.

Order of operations, per URL:
  1. crawl4ai  (local, free, no credits)  -> stealth-enabled browser
  2. ZenRows   (mode=auto, 1-25 credits)  -> only if step 1 is blocked or empty

ZenRows is never called for a page crawl4ai already got. That is where the
money is saved: hard pages cost 25 credits, easy pages cost 0.

Usage:
    python scrape_router.py https://a.com https://b.com
    python scrape_router.py --save out https://a.com
    python scrape_router.py --save out            (runs the built-in demo list)
    python scrape_router.py --save out --force https://a.com    (re-scrape anyway)
    python scrape_router.py --save out --max-age 7 https://a.com (refresh if >7 days old)
    python scrape_router.py --save out --diff https://a.com      (what changed since last save)

When --save is used, any page already saved is skipped: no browser, no credits.
That makes re-running a list free instead of paying for the same pages twice.

With --save, each page is written to:
    <out>/<YYYY-MM-DD>/<host>_<path>.md      clean markdown
    <out>/<YYYY-MM-DD>/<host>_<path>.html    raw html (re-parse later for free)
    <out>/<YYYY-MM-DD>/<host>_<path>.json    metadata: route, credits, timing

The ZenRows key is read from the key file below, never hardcoded.
"""

import asyncio
import difflib
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator

# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------

KEY_FILE = r"C:\Users\moham\OneDrive\Documents\GitHub\FireCrawl_Github_Signin.txt"

# If a page has less real text than this, it is treated as empty/blocked.
MIN_MARKDOWN_CHARS = 250

# Phrases that mean "you got a challenge page, not the content".
BLOCK_MARKERS = (
    "just a moment",
    "checking your browser",
    "verify you are human",
    "cf-challenge",
    "cf_chl_opt",
    "captcha-delivery",
    "datadome",
    "perimeterx",
    "px-captcha",
    "access denied",
    "attention required",
    "enable javascript and cookies",
    "unusual traffic",
    "request blocked",
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"
    )
}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def load_zenrows_key(path: str = KEY_FILE) -> str:
    """Read the `zenrows = ...` line out of the credentials file."""
    text = open(path, encoding="utf-8", errors="replace").read()
    match = re.search(r"zenrows\s*=\s*(\S+)", text)
    if not match:
        raise RuntimeError(f"No zenrows key found in {path}")
    return match.group(1).strip()


def html_to_markdown(html: str, base_url: str = "") -> str:
    """Convert raw HTML into clean markdown using crawl4ai's own converter."""
    try:
        result = DefaultMarkdownGenerator().generate_markdown(html, base_url=base_url)
        return result.raw_markdown or ""
    except Exception:
        text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
        text = re.sub(r"(?s)<[^>]+>", " ", text)
        return re.sub(r"\s+", " ", text).strip()


def looks_blocked(html: str, markdown: str) -> tuple[bool, str]:
    """Decide whether what we got back is a challenge page instead of content."""
    haystack = (html or "").lower()
    for marker in BLOCK_MARKERS:
        if marker in haystack:
            return True, f"challenge marker: {marker!r}"

    if len(markdown.strip()) < MIN_MARKDOWN_CHARS:
        return True, f"too little text ({len(markdown.strip())} chars)"

    return False, "ok"


def diff_summary(old_text: str, new_text: str, max_samples: int = 10) -> dict:
    """Compare two saved copies. Returns counts plus a few representative lines."""
    old_lines = old_text.splitlines()
    new_lines = new_text.splitlines()

    if old_lines == new_lines:
        return {"changed": False, "added": 0, "removed": 0, "samples": []}

    diff = list(difflib.unified_diff(old_lines, new_lines, lineterm="", n=0))
    body = [line for line in diff if line[:3] not in ("+++", "---")]
    added = sum(1 for line in body if line.startswith("+"))
    removed = sum(1 for line in body if line.startswith("-"))

    samples = [
        line[:160]
        for line in body
        if line.startswith(("+", "-")) and line[1:].strip()
    ][:max_samples]

    return {"changed": True, "added": added, "removed": removed, "samples": samples}


def slug_for(url: str) -> str:
    """Turn a URL into a safe filename like 'crunchbase-com_home-3fa2b1c9'."""
    parsed = urlparse(url)
    host = (parsed.netloc or "unknown").replace("www.", "", 1)
    path = (parsed.path or "/").strip("/").replace("/", "-")
    slug = f"{host}_{path}" if path else f"{host}_home"
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", slug)[:90]

    # Short hash of the full URL so two pages can never share a filename
    # (e.g. /search?q=a and /search?q=b would otherwise collide).
    digest = hashlib.md5(url.encode("utf-8")).hexdigest()[:8]
    return f"{slug}-{digest}"


def find_saved(out_dir: str, url: str, max_age_days: float | None = None) -> Path | None:
    """Return the newest already-saved .md for this URL, or None."""
    root = Path(out_dir)
    if not root.exists():
        return None

    slug = slug_for(url)
    matches = sorted(root.glob(f"*/{slug}.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not matches:
        return None

    newest = matches[0]
    if max_age_days is not None:
        age_days = (time.time() - newest.stat().st_mtime) / 86400
        if age_days > max_age_days:
            return None

    return newest


def save_result(url: str, result: dict, out_dir: str) -> list[Path]:
    """Write markdown + html + json for one page. Returns the paths written."""
    day_dir = Path(out_dir) / datetime.now().strftime("%Y-%m-%d")
    day_dir.mkdir(parents=True, exist_ok=True)
    slug = slug_for(url)

    written: list[Path] = []

    md_path = day_dir / f"{slug}.md"
    md_path.write_text(result.get("markdown", ""), encoding="utf-8")
    written.append(md_path)

    html = result.get("html") or ""
    if html:
        html_path = day_dir / f"{slug}.html"
        html_path.write_text(html, encoding="utf-8")
        written.append(html_path)

    meta = {
        "url": url,
        "route": result.get("route"),
        "method": result.get("method"),
        "credits": result.get("credits", 0),
        "reason": result.get("reason"),
        "first_attempt": result.get("first_attempt"),
        "seconds": round(result.get("seconds", 0), 2),
        "markdown_chars": len(result.get("markdown", "")),
        "html_chars": len(html),
        "saved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    json_path = day_dir / f"{slug}.json"
    json_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    written.append(json_path)

    return written


# --------------------------------------------------------------------------
# Attempt 1: crawl4ai (free)
# --------------------------------------------------------------------------

async def via_crawl4ai(url: str) -> dict:
    started = time.perf_counter()
    browser_cfg = BrowserConfig(headless=True, enable_stealth=True, verbose=False)
    run_cfg = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        page_timeout=45000,
        wait_until="domcontentloaded",
    )

    try:
        async with AsyncWebCrawler(config=browser_cfg) as crawler:
            result = await crawler.arun(url=url, config=run_cfg)
    except Exception as exc:
        return {
            "ok": False,
            "method": "crawl4ai",
            "reason": f"{type(exc).__name__}: {exc}",
            "markdown": "",
            "html": "",
            "credits": 0,
            "seconds": time.perf_counter() - started,
        }

    elapsed = time.perf_counter() - started
    html = result.html or ""

    if not result.success:
        return {
            "ok": False,
            "method": "crawl4ai",
            "reason": (result.error_message or "crawl failed")[:120],
            "markdown": "",
            "html": html,
            "credits": 0,
            "seconds": elapsed,
        }

    markdown = result.markdown or ""
    if not isinstance(markdown, str):
        markdown = getattr(markdown, "raw_markdown", "") or str(markdown)

    blocked, reason = looks_blocked(html, markdown)

    return {
        "ok": not blocked,
        "method": "crawl4ai",
        "reason": reason,
        "markdown": markdown,
        "html": html,
        "credits": 0,
        "seconds": elapsed,
    }


# --------------------------------------------------------------------------
# Attempt 2: ZenRows (paid, only when step 1 fails)
# --------------------------------------------------------------------------

def via_zenrows(url: str, api_key: str, timeout: int = 180) -> dict:
    started = time.perf_counter()
    try:
        response = requests.get(
            "https://api.zenrows.com/v1/",
            params={
                "apikey": api_key,
                "url": url,
                "mode": "auto",  # cheapest config that succeeds; 1-25 credits
            },
            headers=HEADERS,
            timeout=timeout,
        )
    except Exception as exc:
        return {
            "ok": False,
            "method": "zenrows",
            "reason": f"{type(exc).__name__}: {exc}",
            "markdown": "",
            "html": "",
            "credits": 0,
            "seconds": time.perf_counter() - started,
        }

    elapsed = time.perf_counter() - started
    try:
        credits = int(response.headers.get("X-Request-Credits", "0"))
    except ValueError:
        credits = 0

    if response.status_code != 200:
        return {
            "ok": False,
            "method": "zenrows",
            "reason": f"HTTP {response.status_code}: {response.text[:120]}",
            "markdown": "",
            "html": "",
            "credits": credits,
            "seconds": elapsed,
        }

    body = response.text or ""
    is_html = "<html" in body.lower()
    markdown = html_to_markdown(body, base_url=url) if is_html else body

    return {
        "ok": True,
        "method": "zenrows",
        "reason": "fetched",
        "markdown": markdown,
        "html": body if is_html else "",
        "credits": credits,
        "seconds": elapsed,
    }


# --------------------------------------------------------------------------
# Router
# --------------------------------------------------------------------------

async def scrape(url: str, api_key: str | None = None) -> dict:
    first = await via_crawl4ai(url)
    if first["ok"]:
        first["route"] = "free"
        return first

    if api_key is None:
        try:
            api_key = load_zenrows_key()
        except Exception as exc:
            first["route"] = "none"
            first["reason"] += f" | no ZenRows fallback: {exc}"
            return first

    second = via_zenrows(url, api_key)
    second["route"] = "paid"
    second["first_attempt"] = first["reason"]
    return second


def parse_args(argv: list[str]) -> tuple[str | None, list[str], bool, float | None, bool]:
    out_dir: str | None = None
    urls: list[str] = []
    force = False
    max_age: float | None = None
    diff = False
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--save":
            out_dir = argv[i + 1] if i + 1 < len(argv) else "scrape-out"
            i += 2
            continue
        if arg.startswith("--save="):
            out_dir = arg.split("=", 1)[1]
            i += 1
            continue
        if arg == "--force":
            force = True
            i += 1
            continue
        if arg == "--diff":
            diff = True
            i += 1
            continue
        if arg == "--max-age":
            max_age = float(argv[i + 1]) if i + 1 < len(argv) else None
            i += 2
            continue
        if arg.startswith("--max-age="):
            max_age = float(arg.split("=", 1)[1])
            i += 1
            continue
        urls.append(arg)
        i += 1
    return out_dir, urls, force, max_age, diff


async def main(
    urls: list[str],
    out_dir: str | None = None,
    force: bool = False,
    max_age: float | None = None,
    diff: bool = False,
) -> None:
    if not urls:
        urls = [
            "https://example.com",
            "https://www.zillow.com/",
            "https://www.crunchbase.com/",
            "https://www.glassdoor.com/",
        ]

    if diff and not out_dir:
        print("--diff needs --save: it compares against the saved copy.")
        return

    if diff:
        force = True  # a diff against yesterday is meaningless without a fresh fetch

    api_key = load_zenrows_key()
    total_credits = 0
    fetched = 0
    skipped = 0
    changes: list[tuple[str, dict, str]] = []

    print(f"{'URL':<38} {'ROUTE':<8} {'CREDITS':>7} {'CHARS':>8} {'SEC':>6}  NOTE")
    print("-" * 96)

    saved = 0
    for url in urls:
        baseline = find_saved(out_dir, url) if (diff and out_dir) else None
        baseline_text = baseline.read_text(encoding="utf-8", errors="replace") if baseline else None

        if out_dir and not force:
            existing = find_saved(out_dir, url, max_age_days=max_age)
            if existing is not None:
                skipped += 1
                print(
                    f"{url[:37]:<38} {'cached':<8} {0:>7} "
                    f"{existing.stat().st_size:>8} {0.0:>6.1f}  skip -> {existing.name}"
                )
                continue

        result = await scrape(url, api_key=api_key)
        total_credits += result.get("credits", 0)
        fetched += 1

        if out_dir:
            try:
                paths = save_result(url, result, out_dir)
                saved += len(paths)
                note = f"saved -> {paths[0].parent.name}/{paths[0].name}"
            except Exception as exc:
                note = f"SAVE FAILED: {type(exc).__name__}"
        else:
            note = result.get("first_attempt") or result.get("reason", "")

        print(
            f"{url[:37]:<38} {result['route']:<8} {result.get('credits', 0):>7} "
            f"{len(result.get('markdown', '')):>8} {result.get('seconds', 0):>6.1f}  {note[:32]}"
        )

        if diff:
            if baseline_text is None:
                changes.append((url, {"changed": None, "added": 0, "removed": 0, "samples": []}, "no baseline"))
            else:
                summary = diff_summary(baseline_text, result.get("markdown", ""))
                changes.append((url, summary, baseline.parent.name))

    print("-" * 96)
    print(f"Total ZenRows credits spent: {total_credits}   (fetched {fetched}, skipped {skipped})")
    if out_dir:
        print(f"Files written: {saved} -> {Path(out_dir).resolve()}")

    if diff:
        print()
        print("=" * 96)
        print("CHANGES SINCE LAST SAVED COPY")
        print("=" * 96)
        for url, summary, baseline_dir in changes:
            if summary["changed"] is None:
                print(f"\n{url}\n  no previous copy saved - this run is the baseline")
            elif not summary["changed"]:
                print(f"\n{url}\n  no change since {baseline_dir}")
            else:
                print(f"\n{url}\n  CHANGED vs {baseline_dir}:  +{summary['added']} -{summary['removed']}")
                for line in summary["samples"]:
                    print(f"    {line}")


if __name__ == "__main__":
    save_dir, targets, do_force, max_age_days, want_diff = parse_args(sys.argv[1:])
    asyncio.run(
        main(targets, out_dir=save_dir, force=do_force, max_age=max_age_days, diff=want_diff)
    )
