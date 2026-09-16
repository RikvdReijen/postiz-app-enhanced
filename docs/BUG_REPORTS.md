# Shake to report a bug

Shake the phone, describe what just went wrong, and it becomes a GitHub issue —
eventually. The "eventually" is deliberate.

## The path a report takes

```
shake → report screen → host → (countdown) → batch → GitHub issues → Claude Code
```

Each hop exists for a reason:

- **The phone queues first.** The moment you most want to report a bug is the
  moment something is broken, which is often the moment the host is unreachable.
  Reports are written to device storage and sent on the next successful sync.
- **The host holds them.** A report is worth keeping even if it never becomes an
  issue, so nothing downstream can lose one.
- **The countdown batches them.** This is the part that saves money. Ten reports
  from one bad afternoon become one Claude Code run over ten related issues,
  rather than ten runs that each re-read the repository. The window starts at the
  *first* unsent report, so a steady trickle cannot postpone a batch forever.
- **GitHub is where the work happens.** The host never holds an Anthropic key. It
  fires a `repository_dispatch`; the workflow in your repository is what spends
  tokens.

## PostPls bugs vs upstream bugs

Every report is tagged with a scope, because a fork has two kinds of bug and
only one of them is yours:

| Scope | What it means | What happens |
| --- | --- | --- |
| **PostPls** | Something this fork added — Drive sync, the planner, quick access, the app, the rebrand | Becomes a GitHub issue on your repository |
| **Postiz** | Inherited from upstream | Kept in the app with a ready-to-paste body and a link to upstream's tracker |

The report screen guesses from the screen you were on when you shook the phone,
and you can override it — only the reporter knows what actually misbehaved.
Upstream bugs are never filed automatically: this host has no business opening
issues in someone else's repository.

## What a report contains

The description you write, plus automatically: host reachability and which
services are up, Drive sync state and last error, the route you were on, and
device details (user agent, viewport, timezone).

**No post content, no tokens, no account identifiers.** A report should be safe
to paste into a public issue tracker, because that is exactly where it goes.

## Setting it up

1. **Settings → Bug Reports → Shake to report a bug.** This alone gets you
   reports collected in the app; everything below is optional.
2. To file issues, give the host a token:
   ```
   POSTPLS_GITHUB_TOKEN="..."          # needs issues:write
   POSTPLS_GITHUB_REPOSITORY="you/postiz-app-enhanced"
   ```
   then switch on **File PostPls bugs as GitHub issues**.
3. To have Claude Code work the batch, add an `ANTHROPIC_API_KEY` secret to the
   repository and switch on **Start a Claude Code run for each batch**. The
   token also needs `contents:write` so the dispatch is accepted.

**Issues must be enabled on the repository.** GitHub answers `410` when they are
not, and the report is marked failed with that message rather than silently
disappearing. A failed batch is retried by the next sweep an hour later.

## Tuning the countdown

The default window is 6 hours. Shorter means fresher issues and more runs;
longer means fewer, larger runs. The floor is 15 minutes because that is how
often the sweep workflow ticks — a shorter window could not be honoured.

**Send batch now** in settings ignores the countdown, which is what you want
when you have just reproduced something and do not fancy waiting.

## Sensitivity

The detector measures rate of change across all three axes rather than raw
acceleration, so holding the phone at an angle never trips it and a slow
movement is correctly ignored — only a fast reversal counts. Lower the threshold
if shaking does nothing; raise it if reports appear from a pocket.

The same detector runs in the web app and the Android app, so a value tuned on
one behaves the same on the other. Its behaviour is pinned by tests
(`libraries/helpers/src/shake/shake.detector.spec.ts`).
