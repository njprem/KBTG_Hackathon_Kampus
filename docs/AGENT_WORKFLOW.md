# TrustGuard Agent Workflow

Status: plan for building the mobile banking prototype. Use this when a task involves substantial design, implementation, or deployment work. Model availability can change; choose the closest available model with the same role and cost profile.

## Goal and constraints

Build an interactive, mobile-first TrustGuard prototype from [the product decisions](PRODUCT_SPEC.md) and [design spec](DESIGN_SPEC.md), verify it on phone-sized screens, and deploy a tested version to Vercel for user walkthroughs. Use fictional data. Treat unresolved product rules as labeled demo assumptions until the team decides them.

The primary agent owns the final decisions, task division, integration, verification, and user-facing result. Subagents receive bounded tasks and return concise findings or code. Do not run several agents on the same files or ask each one to reread the whole project.

## Roles and model choices

| Role | Preferred model and effort | Assignment | Output |
| --- | --- | --- | --- |
| Primary agent | Current capable model; use Astra for difficult product or integration decisions | Set acceptance criteria, reconcile findings, own shared architecture, integrate, test, and deploy | Working prototype and clear status |
| Product and design agent | `gpt-6-sol`, high | Review the hand-off and design spec; decide the screen sequence, interaction details, Thai copy, and explicit demo assumptions | Short design decisions with screen states and open questions |
| Research agent | `gpt-6-luna`, medium | Check only the current external facts needed for the build: relevant banking UX patterns, accessibility, Vercel setup, and any claims intended for the demo | Primary-source links, dates, and actionable implications |
| Implementation agent | `gpt-6-sol`, medium | Build a clearly owned part of the app, such as the transfer and Smart Pause flow | Code, build result, and any integration notes |
| Second implementation agent, if useful | `gpt-6-sol`, medium for complex UI; `gpt-6-luna`, medium for a narrow task | Build a separate feature or asset set with non-overlapping files, such as the contact view after the shared interface is defined | Code and focused verification |

These are starting choices, not fixed quotas. Official OpenAI guidance positions Astra for the hardest work, Sol for complex work with cost awareness, and Luna for focused tasks. The available subagent picker in this workspace currently lists `gpt-6-sol`; use a newer Sol variant only if it becomes available here. Do not assume API token prices directly equal Codex plan credits.

## Sequence for a substantial build

1. Primary agent defines a small, testable milestone from the current spec and identifies file ownership.
2. Run the design and research agents in parallel only when both have independent questions. Ask each for a concise answer and the few sources or decisions that change implementation.
3. Resolve conflicting recommendations against the project documents and user direction. Record any team decision or demo assumption in the appropriate spec before coding depends on it.
4. Give one Sol implementation agent the main flow. Add a second coder only when it can own a separate set of files without blocking or duplicating the first. Keep shared app shell, design tokens, and integration under the primary agent.
5. Primary agent reviews the result in a browser at phone widths, checks the core sender/contact scenarios, runs the build, fixes integration issues, and prepares a Vercel preview. Verify the live link on a phone before using it with testers.

## Spend controls

- Reuse relevant findings from this repository and earlier agent work. Do fresh web research only for facts that may have changed or claims that need a source.
- Give agents the exact question, output format, relevant files, and file ownership. Avoid sending the full conversation when a brief is sufficient.
- Prefer one coder for a small feature or sequential dependency. A second coder should reduce elapsed time or improve a genuinely separate part of the prototype.
- Keep Astra for an ambiguous design decision, a difficult integration, or a final high-stakes review when Sol's result leaves a concrete issue. Do not rerun the same task across models without a reason.
- Stop agents once their bounded deliverable is complete. The primary agent performs one integrated verification pass instead of having every agent repeat the full test suite.

## First proposed milestone

Create a clickable phone prototype for **Home → Transfer review → Smart Pause → Contact review → Sender outcome** using the limit-only example in the design spec. Include a reset control and a role switch for testing. Then add split-transfer, ordinary high-value, no-response, and missing-location branches. The final milestone is a Vercel link that external testers can open and use without a real bank account.
