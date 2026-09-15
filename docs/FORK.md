# Keeping PostPls current with Postiz

PostPls is an opinionated fork of [Postiz](https://github.com/gitroomhq/postiz-app).
The whole point is to keep taking upstream's work — new providers, bug fixes,
security patches — while carrying a small set of changes of our own.

This document is about the cost of that, and how to keep it low.

## The conflict surface

Almost everything PostPls adds lives in **new files**, which never conflict.
At the time of writing: 82 new files, 28 modified.

What we actually touch upstream, and why:

| File | Change | Conflict risk |
| --- | --- | --- |
| 16 × `page.tsx` metadata | `'Postiz'` → `BRAND_NAME` | **Low.** One line each, in a `title:` string. |
| `components/new-layout/logo.tsx` | Replaced with the PostPls mark | **Low.** We replace the file wholesale, so take ours. |
| `components/ui/logo-text.component.tsx` | Replaced with the PostPls lockup | **Low.** Same. |
| `components/billing/faq.component.tsx` | Brand name in copy | **Low.** |
| `components/layout/settings.component.tsx` | Four new tabs | **Medium.** Upstream edits this file often. Conflicts are additive and obvious. |
| `components/new-layout/layout.component.tsx` | Host status pill in the top bar | **Medium.** Same reason. |
| `api/api.module.ts` | Registers six controllers | **Medium.** Additive. |
| `database/prisma/database.module.ts` | Registers nine providers | **Medium.** Additive. |
| `database/prisma/schema.prisma` | Three models, three relations | **Medium.** Our models are appended in one block; the relations sit inside `Organization` and `Integration`. |
| `orchestrator/app.module.ts`, `workflows/index.ts` | Register `PlannerActivity` and the v2 workflow | **Low.** One line each. |
| `temporal/infinite.workflow.register.ts` | Starts `missingPostWorkflowV2` instead of v1 | **High.** This is the one place we changed *behaviour* rather than adding to it. |
| `package.json`, `pnpm-lock.yaml` | Capacitor | **Medium.** Lockfile conflicts are resolved by regenerating, never by hand. |

Everything else — `apps/mobile`, `libraries/helpers/src/branding`,
`libraries/helpers/src/sync`, the `drive-sync`, `planner`, `quick-access`,
`host` and `mobile` directories, the new controllers — is ours alone.

**The rule that keeps this true:** when you add something, add a file. When you
must touch an upstream file, touch one line in it and put the substance in a
file of your own. Every table row above that says "Low" is a row that follows
this rule.

## Merging upstream

```bash
git remote add upstream https://github.com/gitroomhq/postiz-app.git   # once
git fetch upstream
git checkout -b chore/upstream-$(date +%Y-%m-%d) main
git merge upstream/main
```

Then, in order:

1. **Resolve conflicts.** Expect them in the Medium/High rows above.
2. **Regenerate, never hand-edit, `pnpm-lock.yaml`:**
   `git checkout --ours pnpm-lock.yaml && pnpm install --lockfile-only`
3. **Regenerate the Prisma client:** `pnpm run prisma-generate`
4. **Typecheck all three:**
   ```bash
   npx tsc -p apps/backend/tsconfig.json --noEmit
   npx tsc -p apps/frontend/tsconfig.json --noEmit
   npx tsc -p apps/orchestrator/tsconfig.json --noEmit
   pnpm --filter ./apps/mobile run typecheck
   ```
   Note that `apps/backend` has **seven pre-existing type errors** on a clean
   upstream checkout (in `wallet.provider.ts`, `agent.graph*.ts`,
   `autopost.service.ts`, `media.repository.ts`, `empty.provider.ts` and
   `short-linking/providers/empty.ts`). They are upstream's, not ours. Count
   them; if there are still seven, you introduced none.
5. **Check the things that break quietly** — see below.

## What breaks quietly

Type errors are the easy case. These are the ones that compile and then
misbehave:

- **Temporal workflows are versioned and frozen.** A running workflow replays
  its original code. Never edit a workflow file that has reached `origin/main`
  and never change an activity's parameters — add a new version alongside, and
  repoint the caller. This is why `missing.post.workflow.v2.ts` exists rather
  than an edit to v1. If upstream changes `postWorkflowV112` to a `V113`,
  `PlannerActivity` must be repointed at it — grep for the version string.
- **The sync bundle is a contract with devices in the field.** A phone that has
  not been updated still writes v1 bundles. `parseSyncBundle` refuses bundles
  newer than it understands rather than silently dropping fields; keep it that
  way, and bump `SYNC_BUNDLE_VERSION` when the shape changes.
- **Prisma migrations.** Our models are additive with defaults, so an existing
  database moves forward without a backfill. Keep any new column nullable or
  defaulted; this instance has real users.
- **`isGeneral`.** Upstream uses it to switch between Postiz and Gitroom
  branding. We replaced the *Postiz* branch with `BRAND_NAME` and left the
  Gitroom branch alone. If upstream adds a third branch, reconcile it in
  `libraries/helpers/src/branding/branding.ts` rather than at the call site.

## Using AI to carry the fork

The merge above is mostly mechanical, which makes it a good fit for an agent —
but only if it is given a way to be *checked*. Four options, cheapest first.
They compose; 1 and 4 together are a sensible starting point.

### 1. Ad-hoc, on conflict only

Merge by hand, and when it conflicts, hand the conflict to an agent with the
table above as context. No setup, no infrastructure.

- **Good when:** you merge upstream every few weeks and can spare an hour.
- **Weak because:** the agent sees the conflict but not the consequence. It will
  resolve `settings.component.tsx` correctly and miss that upstream renamed the
  workflow our activity signals.
- **Cost:** near zero.

### 2. A scheduled merge agent

A GitHub Action on a weekly cron that fetches upstream, merges, runs the
regeneration and typecheck steps above, and opens a PR — green if it worked,
with the conflicts described if it did not. Claude Code runs in CI for exactly
this.

- **Good when:** you want upstream drift to stay measured in days, not months.
- **Weak because:** a green typecheck is not a working app. Pair it with 4.
- **Cost:** one workflow file, plus CI minutes and tokens per run.

### 3. Push the generic half upstream

Several pieces here are not actually opinionated: the host status endpoint, the
configurable planner interval, and arguably the quick-access tags are all things
Postiz proper could want. Contributing them upstream deletes them from our diff
permanently.

- **Good when:** a change is generic and you are willing to maintain a PR.
- **Weak because:** it is on upstream's schedule, not yours, and review may ask
  for a different design.
- **Cost:** the highest effort per change, and the only one that permanently
  *reduces* the fork.

### 4. Make breakage loud instead of relying on anyone to notice

The honest problem with 1 and 2 is that neither knows whether the app still
works. That is a test problem, not an AI problem. The highest-value tests here
are narrow:

- `mergeSyncBundles` — pure, fast, and the thing most likely to corrupt data if
  it regresses. **Done:** `libraries/helpers/src/sync/sync.bundle.spec.ts`,
  run with `pnpm run test:helpers`. Nine cases, including the one that matters
  most — that two devices merging the same conflict independently reach the
  same answer.
- `PlannerService.getOrganizationsDueForScan` — the defaults must keep
  reproducing upstream's hourly/48h behaviour. **Not done.**
- A smoke test that boots the Nest app and asserts the six PostPls routes
  resolve. This catches a missed module registration after a merge, which is
  the single most likely way this fork breaks. **Not done.**

Note that `pnpm test` at the root cannot run anything today: it builds its
project list through `@nx/jest`, which is not an installed dependency. That is
upstream's, and `test:helpers` sidesteps it rather than taking on the fix.

- **Good when:** always. This is what makes the other three trustworthy.
- **Cost:** the remaining two are half a day.

### What I would actually do

Start with **1 + 4**: write the three tests, merge upstream by hand, and let an
agent resolve conflicts with this document in context. Add **2** once the tests
exist and you trust them. Do **3** opportunistically, when a piece of this fork
turns out to be something Postiz wants too.
