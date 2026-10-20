---
name: trustguard-prototype
description: Design, build, test, or deploy the TrustGuard mobile banking web prototype for first jobbers. Use for its transfer protection flows, user testing, and Vercel release.
---

# TrustGuard prototype

Use this skill when working on TrustGuard's interactive prototype or preparing it for user testing. The deliverable is a mobile-first web app that feels like a banking app and can be opened through a Vercel URL on a phone. It is a hackathon prototype, not a real payment service.

For substantial build work, follow [the agent workflow](../../../docs/AGENT_WORKFLOW.md). It records the requested design, research, and implementation roles and how to use them without duplicating work.

## Product context

Read [the product decisions](../../../docs/PRODUCT_SPEC.md) before changing transfer rules.
v3.0 (20 October 2026) replaced the earlier protection levels and contact approval with three checks.

- Audience: first jobbers aged 22–30 who may be pressured into authorizing a scam transfer.
- The **3T** checks, always in this order and with these names: **Trust Zone** (usual transfer area; unavailable is not a failure), **Trust Contact** (trusted people; new additions are watched for 7 days), **Trust Limit** (monthly amount to non-contacts, Asia/Bangkok calendar month).
- 2 or more failed checks open **Smart Pause**: a compact sheet with a ✓/✗ checklist, (i) explanations, one scam warning line, Cancel, and Continue after 30 seconds. 1 failed check is a note on review only.
- No contact is notified or asked to approve. Do not reintroduce removed features (levels, approval, callbacks, self-check) without the owner's decision.
- Mark unresolved rules as demo values until the team decides them.

## Design and implementation

Use [the design spec](../../../docs/DESIGN_SPEC.md) for the visual direction, screen inventory, and Thai copy when designing or building UI. Treat rules marked open in the product decisions as demo assumptions, not approved policy.

1. Keep the four Home scenarios one tap from review so testers and judges can try each feature without setup friction, and keep the reset control.
2. Show a clear transfer status, the specific reason for a pause, and useful actions such as cancel, wait, or ask for help. Do not describe a simulated transfer as completed or move real money.
3. Make the experience legible on common phone widths, with accessible contrast, readable Thai copy, large touch targets, and keyboard/screen-reader usable controls. Check both Thai and English text wrapping where used.
4. Use fictional accounts, people, balances, risk signals, and contact responses. Make the simulation visible to testers. Do not collect banking credentials, account numbers, or real transaction details.
5. Let users choose their own Trust Contacts rather than assuming a parent.
6. Use the **TrustGuard** identity in the product, prototype, and demo. Do not use KBank, KBTG, or K PLUS names, logos, or visual branding within those surfaces; the pitch can explain the intended integration separately.
7. Keep claims measurable and honest. A cancelled transfer is not automatically a prevented scam. Include an ordinary high-value transfer to test unwanted friction, and a split-transfer scenario to test the accumulated limit.

For the initial demo, consider the hand-off examples: salary ฿28,000, a user-set threshold of ฿15,000, an ฿18,000 transfer to a watched recipient, and three ฿6,000 transfers in one counting period. These are illustrative values, not validated policy. Make mock rules easy to change as the team tests them.

## Build and verify

- Inspect the existing app before choosing a framework. If the repository is still empty, a small React + TypeScript + Vite client app is a practical default for a Vercel-hosted interactive prototype. Add server-side storage only if a tested flow actually needs it.
- Check every flow on phone-sized screens: scam-style pause, split transfers, the ordinary laptop purchase, Trust Contact, outside and unavailable Trust Zone, settings confirmations. Run `npm test`, `npm run build` and `npm run e2e` before sharing a link.
- When collecting feedback, ask whether users understand each T and the warning, whom they would add as a Trust Contact, and how much the pause disrupts an ordinary transfer. Do not treat small walkthrough samples as efficacy proof.

## Vercel hand-off

After the prototype is ready for external testers, connect this GitHub repository to Vercel and use a preview deployment for a phone walkthrough. Confirm the actual deployment URL opens on another device, deep links work if the app uses client-side routes, the demo can be reset, and testers can access the link under the chosen deployment-protection settings. Then publish the tested version for user testing and record the URL and simple test instructions in the README.

Check current platform guidance when implementing deployment: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) and [Git deployments](https://vercel.com/docs/git). If the app uses client-side routes, follow Vercel's SPA rewrite guidance for direct page loads.
