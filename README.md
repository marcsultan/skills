# marcsultan/skills — Agent Skills Hub

Your complete agent skills catalog: **2,702 skills**, installable by any AI agent.

## Quick install

```bash
# Everything (2,702 skills)
npx skills add marcsultan/skills -g -y

# One skill
npx skills add marcsultan/skills@<skill-name> -g -y

# Sync downloads later
npx skills update
```

Recommended: install the skills you actually work with (`@<skill-name>`) — with 2,700 skills, an install-all floods every agent's context with skill descriptions.

## What's inside

- **`.agents/skills/`** — the full catalog:
  - 18 hand-curated core skills (content, research, marketing, creative, the 11 yt-* YouTube pipeline skills)
  - 2,684 unique skills extracted & deduped from every repo in the `marcsultan` account (legal, engineering patterns, testing, security, homelab, education, finance, and more)
- **`skills-lock.json`** — installer lock file
- Each skill is a folder with a validated `SKILL.md` (name + description frontmatter), ready for the skills CLI ecosystem (OpenCode, Claude, Cursor, Cline, Amp, +20 agents)

## Maintenance

- Add a new skill: create `.agents/skills/<name>/SKILL.md`, commit, push — every machine picks it up via `npx skills update`
- Catalog rebuild: scan every repo for `SKILL.md`, dedupe by name, commit (last full rebuild: 2,684 extracted / 874 duplicates merged / 38 invalid skipped)
