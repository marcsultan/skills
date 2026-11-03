---
name: scrape-router
description: "Scrape any public web page to clean markdown at the lowest cost, using a local free-first router: crawl4ai first, ZenRows only when the site blocks it. Use for: scraping pages, extracting site content, competitor research, SEO/content audits, building an LLM corpus, price/data collection, archiving a page. Triggers: scrape, crawler, crawl this site, extract this page, scrape a URL, competitor analysis, site audit, pull content into markdown, ScrapeRouter, ZenRows, crawl4ai"
allowed-tools: Bash(python *)
---

# Scrape Router (crawl4ai -> ZenRows fallback)

The script ships inside this skill folder (`scrape_router.py`, self-contained).
The canonical working copy — and the scrape-output cache — lives in the Voyaggora
workspace:

- Script: `C:\Users\moham\Voyaggora_Site\scrape-router\scrape_router.py`
- Cache/outputs: `C:\Users\moham\Voyaggora_Site\scrape-router\scrape-out\`

If the workspace copy is missing, run the script from this skill folder instead —
same flags, outputs to wherever `--save` points.

For each URL it tries a free local browser crawl first. Only if that is blocked or
empty does it spend ZenRows credits, and then with `mode=auto` (1-25 credits, the
cheapest configuration that succeeds).

## Run it

```powershell
cd C:\Users\moham\Voyaggora_Site\scrape-router
python scrape_router.py --save scrape-out <url1> <url2> ...
```

Options:

| Flag | Effect |
|---|---|
| `--save DIR` | write files, and skip URLs already saved (free + instant) |
| `--force` | re-scrape even if saved |
| `--max-age N` | re-scrape only if the saved copy is older than N days |
| no URLs | runs a small built-in demo list |

## Cost rules (do not break these)

- **Never** use a fixed `js_render=true&premium_proxy=true` request. That is 25 credits
  per page, every page, including pages that need nothing.
- Always use `mode=auto`. It starts at 1 credit and escalates only when a site resists.
- Failed ZenRows attempts are not billed; only the successful configuration is.
- If a page is not protected, it should never touch ZenRows at all. That is the point.

## Credentials

The ZenRows key is read at runtime from the user's credentials file:

```
C:\Users\moham\OneDrive\Documents\GitHub\FireCrawl_Github_Signin.txt
```

Do **not** print, copy, or paste that key into code, chat, or a new file. Read it via
`load_zenrows_key()` or not at all.

## Output layout

```
scrape-out\<YYYY-MM-DD>\<host>_<path>-<hash>.md      clean markdown
scrape-out\<YYYY-MM-DD>\<host>_<path>-<hash>.html    raw HTML (re-parse later for free)
scrape-out\<YYYY-MM-DD>\<host>_<path>-<hash>.json    route, credits, timing, reason
```

The `.html` matters: it lets new fields be extracted later without paying ZenRows twice.
The `.json` records what each page cost and why.

## Reading the result

- `route: free` -> crawl4ai got it, 0 credits.
- `route: paid` -> ZenRows was needed; `credits` shows the cost, `first_attempt` shows why.
- `route: cached` -> already saved, nothing fetched.

Typical costs observed: example.com 1, Crunchbase 25, Zillow 1, Glassdoor 25.
Crunchbase and Glassdoor homepages have been retrievable free via crawl4ai's stealth mode.

## Block detection

Heuristic, tunable at the top of the file: `BLOCK_MARKERS` (challenge-page phrases) and
`MIN_MARKDOWN_CHARS` (250). If a page is wrongly judged blocked or wrongly passed,
adjust those two rather than rewriting the router.

## Limits worth stating to the user

- Not for logged-in content, paywalls, or checkout flows.
- Not for crawls of thousands of pages: the credit bill is the constraint, not the code.
- Free path can fail suddenly when a site changes; the fallback handles it automatically.
- Respect site terms; check whether a site offers an official API before scraping at volume.
