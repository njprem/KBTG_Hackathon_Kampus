# TrustGuard

TrustGuard is a mobile-first banking prototype for first jobbers aged 22–30.
Before money leaves, it checks every transfer against three user-set protections, the **3T**: Trust Zone, Trust Contact and Trust Limit.
When two or more fail, the transfer is held for 30 seconds on a Smart Pause sheet so the sender can stop and think.
Built for the KBTG Kampus Hackathon 2026.

This is an interactive **simulation**.
It does not connect to a bank, move money, send notifications, or collect real account details.
All names, balances, recipients, locations and outcomes are fictional.

## Try it locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.
For a production build, run `npm run build` and then `npm run preview`.

## Prototype paths (v3.0)

Home shows four demo scenarios.
A tap opens the transfer form already filled in; a badge on each card previews what will happen with the current settings.

| Scenario | Default result |
| --- | --- |
| ค่าจองสินค้า ฿18,000 to a new recipient | Paused: Trust Contact and Trust Limit fail |
| โอนแบ่งจ่าย ฿6,000, repeated | First two show a one-line notice; the third is paused once the month total reaches ฿15,000 |
| หมูปิ้งหน้าเซเว่น ฿25 at a place and shop the AI already knows | Passes (they are not counted until confirmed); afterwards the simulated AI suggests adding the place to Trust Zone and the shop as a Trust Contact |
| โอนให้แม่ ฿5,000 (Trust Contact) | Passes and is not counted |

The rules:

- **Trust Zone:** the area where the user usually transfers. Outside fails; unavailable location is not counted as a failure. Simulated in Settings.
- **Trust Contact:** a list of people the user trusts. Transfers to them pass and are not counted. Someone added in the last 7 days is still watched.
- **Trust Limit:** a monthly amount for transfers to people outside Trust Contact, counted per Asia/Bangkok calendar month, so split transfers add up.
- **Decision:** 0 failed checks completes, 1 shows a quiet notice on review, 2 or more opens Smart Pause.
- **Smart Pause:** shows the 3T checklist (✓/✗, tap (i) to expand what each check means), one scam warning line, and two actions. Cancel is primary; continue unlocks after 30 seconds. After continuing, Trust Limit counts again from that point.
- **Settings:** lowering protection (turning TrustGuard off or raising the limit) asks for confirmation, with keeping protection as the primary action.

See [the product decisions](docs/PRODUCT_SPEC.md) for rationale and open questions, and [the design spec](docs/DESIGN_SPEC.md) for the visual system and screen behaviour.

## Tests

```bash
npm test                           # domain unit tests
npx playwright install chromium   # first time only
npm run e2e                        # every flow at phone width, starts its own dev server
npm run e2e:report                 # HTML report with screenshots of each step
```

`e2e/flows.spec.ts` covers the scam-style pause, (i) disclosure, cancel with the AOC 1441 hotline, the 30-second gate (with a fake clock), closing and reopening a pause, split transfers, manual entry matching the Home shortcut, continuing then not re-pausing a small transfer, the laptop purchase, quick transfer from Home, Trust Contact pass and 7-day watch, outside and unavailable Trust Zone, both weakening confirmations, transfers above the balance, Transfer/Review/Smart Pause fitting 360x640, 390x664 and 375x812 screens, the new-user invitation and setup with AI Trust Zone suggestions, and AI suggestions in Settings.

## Tester and hosting notes

Use the reset control (top right) to start over.
A visible demo-only link skips the 30-second wait so a facilitator can show the whole flow quickly; it is not part of the proposed product.

The app is configured for a Vercel SPA deployment, including direct-link fallback.
For external testing, use a protected preview and narrowly shared access.
The competition upload guide requires closing online demo access after mentoring and the event.
No live URL is recorded here until a deployment has been verified.

Keep Vercel Authentication set to **All Deployments**, including production, and use revocable share links only for approved testers.
The `vercel.json` security headers and no-index directives reduce browser and crawler exposure, but they do not replace deployment protection.
Disable access and revoke any share links after the event.
