---
name: trustguard-prototype
description: Design, build, test, or deploy the TrustGuard mobile banking web prototype for first jobbers. Use for its transfer protection flows, user testing, and Vercel release.
---

# TrustGuard prototype

Use this skill when working on TrustGuard's interactive prototype or preparing it for user testing. The deliverable is a mobile-first web app that feels like a banking app and can be opened through a Vercel URL on a phone. It is a hackathon prototype, not a real payment service.

For substantial build work, follow [the agent workflow](../../../docs/AGENT_WORKFLOW.md). It records the requested design, research, and implementation roles and how to use them without duplicating work.

## Product context

Read [the product decisions](../../../docs/PRODUCT_SPEC.md) when implementing transfer rules or contact outcomes. It records the user's three protection levels, calendar-month limit, and separate recovery route.

- Audience: first jobbers aged 22–30 who may be pressured into authorizing a scam transfer. Help them understand the risk and reach someone they trust before money leaves.
- Retain the three features in the submitted proposal: **Trusted Limit**, **Trusted Contact**, and **Trusted Zone**. **Smart Pause** is the transfer warning and action screen.
- Trusted Limit can trigger a pause based on transfer amount or accumulated transfers, even if the recipient has no known risk flag. A prior small transfer must not automatically make a recipient trusted. Define the counting window and watched-recipient rule explicitly in the prototype.
- Recipient-account risk is an optional, simulated signal that a bank might provide. Do not present it as a complete scam detector or imply access to real bank data.
- Trusted Zone is additional context that may increase scrutiny. Being at home must not clear other risk signals. Missing location permission needs a usable fallback.
- Trusted Contact advises in Warn and approves in Approval required. The strong level has a separate recovery route when approval cannot be obtained; it does not allow instant self-approval. Do not imply that a contact can override a hold the bank must enforce.
- The 14 October 2026 scope note is a proposal, not proof that the team approved every rule. Mark unresolved rules as prototype assumptions until the team decides them.

## Design and implementation

Use [the design spec](../../../docs/DESIGN_SPEC.md) for the visual direction, screen inventory, and Thai copy when designing or building UI. Treat rules marked open in the product decisions as demo assumptions, not approved policy.

1. Begin with one coherent scenario and the three core views: **Smart Pause → Contact review → Sender outcome**. Let testers restart and explore alternate outcomes without setup friction.
2. Show a clear transfer status, the specific reason for a pause, and useful actions such as cancel, wait, or ask for help. Do not describe a simulated transfer as completed or move real money.
3. Make the experience legible on common phone widths, with accessible contrast, readable Thai copy, large touch targets, and keyboard/screen-reader usable controls. Check both Thai and English text wrapping where used.
4. Use fictional accounts, people, balances, risk signals, and contact responses. Make the simulation visible to testers. Do not collect banking credentials, account numbers, or real transaction details.
5. Let users choose a trusted person rather than assuming a parent. Show what information that person would receive and obtain consent in the setup flow. Limit the mock contact view to information needed to advise.
6. Use the **TrustGuard** identity in the product, prototype, and demo. Do not use KBank, KBTG, or K PLUS names, logos, or visual branding within those surfaces; the pitch can explain the intended integration separately.
7. Keep claims measurable and honest. A cancelled transfer is not automatically a prevented scam. Include an ordinary high-value transfer to test unwanted friction, and a split-transfer scenario to test the accumulated limit.

For the initial demo, consider the hand-off examples: salary ฿28,000, a user-set threshold of ฿15,000, an ฿18,000 transfer to a watched recipient, and three ฿6,000 transfers in one counting period. These are illustrative values, not validated policy. Make mock rules easy to change as the team tests them.

## Build and verify

- Inspect the existing app before choosing a framework. If the repository is still empty, a small React + TypeScript + Vite client app is a practical default for a Vercel-hosted interactive prototype. Add server-side storage only if a tested flow actually needs it.
- Check the complete sender and contact journeys on phone-sized screens. Verify the no-response, contact-warning, sender-continue, split-transfer, normal-transfer, and missing-location paths. Run the project's build and fix failures before sharing a link.
- When collecting feedback, ask whether users understand the warning, whom they would choose as a contact, what they would share, and how much the flow disrupts an ordinary transfer. Do not treat small walkthrough samples as efficacy proof.

## Vercel hand-off

After the prototype is ready for external testers, connect this GitHub repository to Vercel and use a preview deployment for a phone walkthrough. Confirm the actual deployment URL opens on another device, deep links work if the app uses client-side routes, the demo can be reset, and testers can access the link under the chosen deployment-protection settings. Then publish the tested version for user testing and record the URL and simple test instructions in the README.

Check current platform guidance when implementing deployment: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) and [Git deployments](https://vercel.com/docs/git). If the app uses client-side routes, follow Vercel's SPA rewrite guidance for direct page loads.
