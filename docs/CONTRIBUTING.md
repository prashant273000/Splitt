# Contributing

## Claiming an issue

Comment on the issue with "I'll take this." A maintainer will assign it. Do not open a PR for an unassigned issue.

## Branch naming

| Type | Format | Example |
|---|---|---|
| Feature | `feature/<short-description>` | `feature/post-ride-form` |
| Bug fix | `fix/<short-description>` | `fix/seat-count-race` |
| Docs | `docs/<short-description>` | `docs/setup-guide` |

## Commit format

This repo uses [Conventional Commits](https://www.conventionalcommits.org/). Commitlint enforces this on every commit.

```
feat: add post-ride form
fix: correct seat decrement on leave
docs: update setup guide
chore: bump eslint to v9
```

## PR process

1. Fork or branch from `main`.
2. Keep PRs small and focused. One feature or fix per PR.
3. All PRs require CI to pass (lint).
4. Request review from a maintainer when ready.

## Issue template

```markdown
## What
[1-2 sentence description]

## Why
[The user-facing benefit]

## Acceptance criteria
- [ ] [Specific, testable item]
- [ ] [Specific, testable item]

## Files likely to touch
- [path/to/file.js]

## Out of scope
- [Things contributors should NOT do in this PR]
```

## Code style

- Plain JavaScript (no TypeScript).
- ESLint and Prettier are enforced via pre-commit hooks.
- No comments that describe *what* the code does. Only write a comment when the *why* is non-obvious.
