# marcsultan/skills — Agent Skills Hub

Your complete agent skills catalog: **3,457 skills** (previous 3,112 + 345 net-new from the Nov 2026 fork harvest), installable by any AI agent.

## Quick install

```bash
# Everything
npx skills add marcsultan/skills -g -y

# One skill
npx skills add marcsultan/skills@<skill-name> -g -y

# Sync downloads later
npx skills update
```

Recommended: install the skills you actually work with (`@<skill-name>`) — with 3,400+ skills, an install-all floods every agent's context with skill descriptions.

## What's inside

- **`.agents/skills/`** — the full catalog (marcsultan + zaynahsultan1-gif accounts):
  - 18 hand-curated core skills (content, research, marketing, creative, the 11 yt-* YouTube pipeline skills)
  - ~3,000+ unique skills extracted & deduped from every repo in the `marcsultan` account (legal, engineering patterns, testing, security, homelab, education, finance, and more)
  - 431 additional skills harvested from every repo in the `zaynahsultan1-gif` account (ruflo/claude-flow ecosystem, OpenMontage, OmniRoute, deepseek-harness, vllm, media/video tooling)
  - **Nov 2026 harvest**: 539 skills from 28 new forks (ruflo, gstack, supabase, caveman, ccxt, mem0, linkedin-skills, strix, taste-skill, beads, hindsight, agentmemory, context7, playwright-cli, chrome-devtools-mcp, oh-my-claudecode, superpowers, SkillSpector, agency-swarm, and more); 194 same-name skills updated to newer versions, 109 already identical skipped
- **`mcp/`** — 27 reference MCP configs from 10 of those forks (agentmemory, chrome-devtools-mcp, codebase-memory-mcp, context7, hindsight, mem0, oh-my-claudecode, ruflo, supabase)
- **`skills-lock.json`** — installer lock file
- Each skill is a folder with a validated `SKILL.md` (name + description frontmatter), ready for the skills CLI ecosystem (OpenCode, Claude, Cursor, Cline, Amp, +20 agents)

## Maintenance

- Add a new skill: create `.agents/skills/<name>/SKILL.md`, commit, push — every machine picks it up via `npx skills update`
- Catalog rebuild: scan every repo for `SKILL.md`, dedupe by name, commit (last full rebuild: 2,684 extracted / 874 duplicates merged / 38 invalid skipped)
