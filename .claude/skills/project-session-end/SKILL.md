---
name: project-session-end
description: Use when the user says « reprise » (resume a session), or when a session segment ends — T1 a task longer than 30 min / more than 5 tool calls / at least one commit, T2-T3 a fatigue ALERT or STOP, T4 a production deploy (push to master), a database schema change or an FFE parser change, T5 the user says "session-end", "fin de session", "doc de reprise", "memo update", "STOP" or "pause". Never write a memo on « reprise » alone.
---

# nos-joueurs-en-tournoi — session-end memo / reprise

Projection of `C:/Dev/skills-templates/project-session-end/SKILL.md` (revision 2026-10-10), reduced by
the harness × project matrix of `README.md` (this folder): 11 sections kept out of 18. Doctrine and the
full menu stay in the canonical template; this file only carries what this project needs.

> Stack : Next.js 16 + React 19, Vercel production auto-deployed on push to `master`, Neon Postgres
> (free plan) for club sync, Vercel WAF for rate limiting, FFE pages scraped through `/api/scrape`.
> Ship gates = the 7 pre-push gates + a production probe after deploy.

## Pick the mode first

| Mode | Trigger | Does | Never |
|---|---|---|---|
| **RESUME** | the user's message is « reprise » | § Mode RESUME | write a memo |
| **MEMO** | T1-T5 (description) | § Mode MEMO, steps 1-8 | never fire on « reprise » alone |

## Invariants (from the template, not removable)

1. Re-read from disk (Read, whole file) — never from the copy injected at session start.
2. The resume block lists « À lire en entier » files, absolute or repo-relative paths, memory files
   prefixed by the memory dir; on resume, prove it with a `lines read / total` (`wc -l`) table.
3. Fatigue is counted from the table in `CLAUDE.md` § STANDING PROCEDURE, never estimated; on resume
   the counter restarts at 0.
4. Commit everything, then write the memo last; `HEAD` in the memo is read after the last commit.
5. Every control prints a value compared to an expected value written next to it; a control whose
   output does not depend on the code is a defect.
6. Reference check is a command (step 6), not an inspection.
7. Next action split: local part (run now) / external part (waits for the user's explicit go):
   `git push` (= production deploy), any Vercel dashboard / env var / firewall change, any write to the
   Neon database, any message sent on the user's behalf.
8. Persona = `.claude/instructions.md` (the project has no `CLAUDE.md ## Role`); never copied into the memo.
9. Drift check before writing the memo: statuses in the docs touched this session match reality.
10. The memo names itself in its resume block.

## Mode RESUME — « reprise »

1. Read from disk, whole files: `C:/Users/pierr/.claude/projects/C--Dev-nos-joueurs-en-tournoi/memory/MEMORY.md`,
   the memo it marks CURRENT, `CLAUDE.md`, `.claude/instructions.md`.
2. Run the memo's resume block literally. A failing control (HEAD differs, gate red, dirty tree, prod
   probe off) stops the resume: say so, fix it first; a fix that is a write outside the next action
   (commit or ignore an unexpected file…) is proposed and waits for agreement.
3. Read in full every file of « À lire en entier » (large files: consecutive slices to the last line).
4. Answer with: controls and their outputs; the `lines read / total` table; where work stopped
   (from the memo); the next action and what the files read change about it; every contradiction
   memo ↔ files (files win) including injected copy ↔ disk; fatigue line, counter back to 0.
5. Start the local part of the next action. The external part waits for the explicit go.

## Mode MEMO — steps

### 1. Read the procedure

`CLAUDE.md` § « STANDING PROCEDURE — FIN DE SEGMENT » (triggers + fatigue table), whole file.

### 2. Collect state — every line prints a comparable value

```bash
cd C:/Dev/nos-joueurs-en-tournoi
git rev-parse --short HEAD
git status --short | wc -l                                         # attendu : 0
git rev-list --count origin/master..HEAD                           # commits not pushed (attendu : 0 after a push)
npx tsc --noEmit 2>&1 | grep -c "error TS"                         # attendu : 0
npx eslint src app --max-warnings 0 >/dev/null 2>&1; echo $?       # attendu : 0
npx vitest run --reporter=dot 2>&1 | grep -E "^\s+Tests "          # attendu : "<N> passed", no "failed"
npm run duplication 2>&1 | grep -c "too many duplicates"          # attendu : 0
npm run check:tokens:calibrate >/dev/null 2>&1; echo $?            # attendu : 0
npm audit --omit=dev 2>&1 | tail -1                                # attendu : "found 0 vulnerabilities"
curl -s -o /dev/null -w "%{http_code}\n" https://nos-joueurs-en-tournoi.vercel.app/   # attendu : 200
```

Production state that git cannot show (§7) comes from the Vercel MCP tools: `list_deployments`
(target production, limit 1 → deployment id + `githubCommitSha` + state) and `get_runtime_errors`
(since 24h → count). The live FFE canary is `npm run test:ffe` (attendu : "3 passed"; FFE ~10 s/page).

### 3. Task tag

kebab-case, e.g. `checkup-neon-parser-ffe`, `feat-auto-sync-tombstones`, `fix-pairings-markup`,
`incident-2026-10-20-redis-archived`.

### 4. File name

`C:/Users/pierr/.claude/projects/C--Dev-nos-joueurs-en-tournoi/memory/project_session_end_<YYYY-MM-DD>-<tag>.md`
with frontmatter `name`, `description`, `metadata.type: project`.

### 5. Sections (kept by the matrix — none may be left empty; `N/A — <reason>` only if truly empty)

| § | Section | Content |
|---|---|---|
| 2 | HEAD + push state | short HEAD read after the last commit, commits ahead of `origin/master`, tests count |
| 5 | Next decision options A/B/C | cost, ship gate, rollback, recommendation |
| 7 | Runtime state (absolute values) | prod URL + HTTP status; production deployment id + commit + state; Neon store name / region / tables / row counts if measured; WAF rule; env var **names** (never values); runtime errors 24h |
| 8 | Commit ↔ deployment | each commit cited as shipped: deployed YES/NO + Vercel deployment id; `⚠ commit-hash ≠ deployment` when local only |
| 9 | Ship contract | push only on the user's explicit go; the 7 pre-push gates green; after deploy: home 200, `/api/events/sync` + `/api/events/fetch` round trip 200 with the real secret, `default-dev-secret` → 401, 31st `/api/*` call within 60 s → 429 |
| 10 | Drift check (done before writing) | `docs/CHECKUP-*.md`, `docs/ISO-AUDIT-*.md`, `docs/DESIGN-TOKENS-AUDIT-*.md`, `CLAUDE.md`, `README.md`, memory `todos.md`: statuses vs reality; fixed now, or listed with reason |
| 14 | Read order | "Si veut X → lire Y", selection only |
| 15 | Remaining critique | unfinished items, effort, what waits for the user |
| 16 | OPEN QUESTIONS | question + 2-3 hypotheses + default + switch condition |
| 17 | Fatigue | the 6-indicator table of `CLAUDE.md`, counted, + one line |
| 18 | Resume block | memo name; persona `.claude/instructions.md`; step-2 controls with expected values; « À lire en entier »; next action local / external; previous fatigue + "le compteur repart à 0" |

### 6. Checks before writing

Self-contained criteria that apply (§18 literal commands, §7 absolute values, §8 mapping, §14 ordered,
§5 options with cost, §16 explicit) — all PASS, else re-edit. Reference check, draft in the scratchpad:

```bash
cd C:/Dev/nos-joueurs-en-tournoi; MEMORY_DIR=C:/Users/pierr/.claude/projects/C--Dev-nos-joueurs-en-tournoi/memory
grep -o '`[^` ]*\(/\|\.md\|\.ts\|\.tsx\|\.sql\|\.json\)[^` ]*`' <memo> | tr -d '`' | sort -u |
  while read p; do [ -e "$p" ] || [ -e "$MEMORY_DIR/$p" ] || echo "MISSING $p"; done
# attendu : aucune sortie (URLs and glob patterns excluded by hand if they appear)
```

### 7. Write the memo (last)

After the last commit; re-read `git rev-parse --short HEAD` and put it in §2 and §18.

### 8. Memory index (native mechanism — no parallel index, no archive file)

One line in `MEMORY.md` under `## Session courante`: the new memo marked **CURRENT**, ending with
"sur « reprise » : skill project-session-end, mode RESUME". The previous CURRENT line becomes a plain
line under `## Sessions précédentes` (one line each; drop the oldest past ~10). Keep `MEMORY.md`
under 200 lines / 25 KB (Claude Code loads only that much).

## Report to the user

Memo file name + line count + sections; MEMORY.md updated; criteria PASS count; fatigue line;
"Reprise : dire « reprise »".

## Anti-patterns

Writing a memo on « reprise » · resuming from the injected copy · claiming "read" after grep/head ·
copying CLAUDE.md, persona or git log into the memo · memo written before the last commit ·
external action at resume without go · empty / "TBD" section · env var values in the memo.
