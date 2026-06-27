# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

### Project Information

## Commands

```bash
pnpm dev          # Run all apps concurrently
pnpm dev:web      # Frontend only (port 6060)
pnpm dev:api      # API only (port 6061 via Wrangler)
pnpm dev:smpp     # SMPP gateway only (port 9511)
pnpm dev:doc      # Documentation (VitePress)
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Apply migrations to local D1
```

## Architecture

This is a **pnpm + Turborepo monorepo** — an SMPP SMS Gateway for GoIP devices.

```
apps/api    – Cloudflare Worker (Hono + D1) — SMS storage, auth, REST API
apps/smpp   – Node.js SMPP gateway — connects to GoIP devices via SMPP protocol
apps/web    – React 19 frontend — chat-style UI for reading/sending SMS
apps/doc    – VitePress documentation
packages/   – shared libraries (db, sdk, ui, validators)
tooling/    – shared dev config (eslint, prettier, typescript, tailwind)
```

### Key Tech Versions

- React 19, TanStack Start/Router/Query 1.132.x
- Vite 7, TypeScript 5.9, TailwindCSS v4
- Hono 4.7, Drizzle ORM 0.44, Zod 4
- SMPP 0.6.0-rc.4 (smpp npm package)
- Node ≥ 23.7, pnpm ≥ 10.19

### Key Concepts

- **Device**: A GoIP hardware unit with SMPP connection settings
- **Channel**: A SIM card/phone number in a GoIP device
- **Conversation**: Messages grouped by contact number within a channel
- Auth via RS Office (Google OAuth → RS Office JWT)
- SMPP app polls API for queued outbound messages every 3s

---

### Must Haves
When deleting any thing always have a confirmation popup from user. Confirmation popup should be better looking (not browser default).
