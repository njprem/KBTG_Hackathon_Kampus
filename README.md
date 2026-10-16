# TrustGuard

TrustGuard is a mobile-first banking prototype for first jobbers aged 22–30. It demonstrates how a concerning transfer can be paused, explained, and reviewed with someone the user trusts before money leaves. Built for the KBTG Kampus Hackathon 2026.

This is an interactive **simulation**. It does not connect to a bank, move money, send notifications, or collect real account details. All names, balances, recipients, risk signals, and contact responses are fictional.

## Try it locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. For a production build, run `npm run build` and then `npm run preview`.

## Prototype paths

Start from Home and choose one of three scenarios: a transfer above the chosen monthly threshold, split transfers that reach it together, or a legitimate high-value purchase. Review the transfer, then explore the Smart Pause and fictional Trusted Contact views. Settings offers three protection levels:

- **Off:** no added TrustGuard interruption.
- **Warn:** notify the chosen contact; the sender can manually confirm after a one-minute minimum pause.
- **Approval required:** the contact must approve, or the sender can request a separate simulated review. This route remains pending in the demo.

The accumulated limit uses the Asia/Bangkok calendar month. Several eligibility and recovery rules are intentionally marked as demo assumptions in [the product decisions](docs/PRODUCT_SPEC.md). See the [design spec](docs/DESIGN_SPEC.md) for the screen behavior and [agent workflow](docs/AGENT_WORKFLOW.md) for how the prototype is developed.

## Tester and hosting notes

Use the reset control to start over. A visible demo control may skip the one-minute wait so a facilitator can show the whole flow quickly; it is separate from the real wait behavior being tested.

The app is configured for a Vercel SPA deployment, including direct-link fallback. For external testing, use a protected preview and narrowly shared access. The competition upload guide requires closing online demo access after mentoring and the event. No live URL is recorded here until a deployment has been verified.
