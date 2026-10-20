# project-session-end — projection for nos-joueurs-en-tournoi

Projected 2026-10-20 from `C:/Dev/skills-templates/project-session-end/` (SKILL.md + README.md,
revision 2026-10-10). Profile: **mature-no-discipline** (rich `CLAUDE.md`, no session-end, memo or
fatigue discipline in the project or its memory).

## Step 0 — project audit (2026-10-20)

| Command (template README, Étape 0) | Result |
|---|---|
| doctrinal feedbacks in memory (`feedback_(session_end_template\|post_task_procedure\|per_task_memory\|diagnostic_first)`) | none |
| overlap keywords in memory (`session end/resume`, `fatigue`, `memo refresh`, `post task`) | none |
| `CLAUDE.md` STANDING PROCEDURE / fatigue | none (one "lire a la reprise" hint on `docs/ISO-AUDIT-2026-04-12.md`) |
| memo pattern in memory (`session_end`, `session_resume`, `project_state`) | none |
| `.claude/instructions.md` (tracked, not auto-loaded) | persona + response format — `ignore` for the memo, designated as persona source (invariant 8) |

Decisions: doctrine file `feedback_session_end_template.md` **not created** (the structure lives in
this SKILL.md; the full doctrine stays canonical in the template — a copy would drift).
`feedback_post_task_procedure_and_fatigue.md` **not created**: the 6-indicator table is inline in
`CLAUDE.md` § STANDING PROCEDURE (`coexist` pattern of the template). `feedback_per_task_memory_updates.md`
**not created**: per-task memory discipline is the harness's auto memory (below).
`feedback_diagnostic_first_doctrine.md` **not created**: no anti-pattern codified yet (no empty stub).

## Step 0 — harness × project matrix (2026-10-20)

Sources: official doc `https://code.claude.com/docs/en/memory` (fetched 2026-10-20: auto memory dir
with `MEMORY.md` index, "first 200 lines of `MEMORY.md`, or the first 25KB … loaded at the start of
every conversation", topic files read on demand and kept outside the transcript retention sweep;
project-root CLAUDE.md "survives compaction"); this session's system prompt (auto memory instructions,
CLAUDE.md global + ancestors + project loaded).

| § / step | Class | Reason |
|---|---|---|
| 1 resume bash | gap → merged into §18 | literal controls with expected values; git alone gives no gate state |
| 2 HEAD + push | gap (minimal) | the HEAD *at memo time* and push state; full history = git |
| 3 deliverables | harnais | `git log` / `git diff --stat` |
| 4 hard signals | harnais | `~/.claude/CLAUDE.md` + project `CLAUDE.md` are loaded every session |
| 5 next options | gap | decisions in suspense are not in git or CLAUDE.md |
| 6 quality status | gap → merged into §18 controls | |
| 7 runtime state | gap | Vercel deployment, Neon store, WAF rule, env vars live outside git |
| 8 commit ↔ deploy | gap | push ≠ deployed (build can fail); Vercel deployment id |
| 9 ship contract | gap | production probe after deploy is not written anywhere else |
| 10 drift check | gap (invariant 9) | |
| 11 anti-pattern counter | hors-projet | no counter file; created the day a first anti-pattern is codified |
| 12 dead code post-pivot | hors-projet | small app, no layered plans; reconsider if a plan leaves orphans |
| 13 layer/phase | hors-projet | no layers / phases |
| 14 read order | gap | selection for the next action |
| 15 remaining critique | gap | |
| 16 open questions | gap | |
| 17 fatigue | gap (invariant 3) | auto summarization does not replace the counted table |
| 18 resume block | gap | what Mode RESUME executes |
| step 9 MEMORY.md entry 0 | harnais → native | one line in the native `MEMORY.md`, no parallel index |
| step 10 history archive | harnais | memo files persist in the memory dir and stay listed in `MEMORY.md` |

Re-audit when Claude Code changes memory, resume or compaction behaviour.

## Markers (21 in the template) — values chosen

project-name `nos-joueurs-en-tournoi` · claude-md `C:/Dev/nos-joueurs-en-tournoi/CLAUDE.md` · memory-dir
`C:/Users/pierr/.claude/projects/C--Dev-nos-joueurs-en-tournoi/memory` · working-dir `cd C:/Dev/nos-joueurs-en-tournoi` ·
test-runner `npx vitest run --reporter=dot` · lint `npx eslint src app --max-warnings 0` · build-check `npx tsc --noEmit` ·
extra-state `curl` prod + Vercel MCP `list_deployments` / `get_runtime_errors` · T4 = push to master (deploy),
DB schema change, FFE parser change · quality tools = the 7 pre-push gates + `npm run test:ffe` ·
runtime = Vercel production + Neon store + WAF · mapping target = Vercel deployment id · contract = gates +
production probe · plans source = `docs/*AUDIT*.md`, `docs/CHECKUP-*.md`, memory `todos.md` ·
layer-phase = hors-projet · hard signals = harnais (CLAUDE.md) · external actions = push, Vercel dashboard /
env / firewall, Neon writes, messages · artefacts = Vercel deployments, `docs/CHECKUP-*.md`.

## Validation

- « reprise » only in Mode RESUME: `grep -n '"reprise"\|« reprise »' CLAUDE.md .claude/skills/project-session-end/SKILL.md`
  — every line found must speak of mode RESUME or say "never … memo".
- Cold-start simulation: see the result appended below after each run.
