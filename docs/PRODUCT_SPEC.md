# TrustGuard Prototype Product Decisions

Status: working decisions from the project owner, 16 October 2026. Details marked **Proposed** are for the prototype and need team review.

## Goal

Help a first jobber pause a concerning transfer, understand why it was flagged, and involve a person they trust before money leaves. The prototype simulates all transfers and contact responses.

## Protection levels

The user chooses one level during setup. Existing bank-required security controls still apply at every level.

| Level | Behavior when a TrustGuard rule triggers |
| --- | --- |
| **Off** | No additional TrustGuard pause or contact notification. |
| **Warn** | Smart Pause explains the trigger and notifies the pre-consented Trusted Contact. The sender can choose to continue after a minimum 2-minute wait and a second explicit confirmation; the transfer is never auto-confirmed when the timer ends. Show any contact response received before the sender's decision. If none arrives, recommend stopping. |
| **Approval required** | Smart Pause holds the transfer until the Trusted Contact approves it. The sender can cancel at any time. If the contact is unavailable or approval cannot be obtained, the sender can start a **separate recovery route**. There is no instant self-approval path in this level. |

The 2-minute wait is a design hypothesis to test with users, not a proven safety threshold. The contact must consent to the role and to the limited information shared with them before alerts are sent. In this prototype the contact sees `฿XX,XXX` rather than the exact amount, plus the recipient name, masked recipient account, and sender-side transfer description (preset fictional text in the demo). The description is not evidence that the recipient is trustworthy. Test whether the masked amount leaves enough context for an informed approval.

The public prototype includes a clearly labeled facilitator control to skip the wait during a short walkthrough. This is only a simulation convenience and must not be presented as an acceptable bypass in a real banking implementation.

## Separate recovery route

**Decided:** the strong level must have a way forward when the contact cannot approve; it must remain separate from a one-tap sender override.

**Proposed for the prototype:** show a bank-assisted review request with additional identity and scam checks. Simulate its submission and pending outcome. Do not imply that the prototype is connected to a bank or that it has completed a real verification. The team still needs to decide who resolves this route, its timing, what happens after a contact rejects a transfer, and how a user replaces a contact who is no longer safe or available.

## Trusted Limit

- **Decided:** count relevant transfers within a **calendar month** using Asia/Bangkok local dates; reset at the start of the first day of the next month.
- The threshold is chosen by the user. Reaching it can trigger Smart Pause even when there is no recipient-account risk signal.
- **Open:** which recipients and transfers count, how long a recipient remains watched, and whether an additional rule should address transfers split across a month boundary. A first small transfer must not automatically make a recipient trusted.
- The demo amounts of ฿28,000 salary, ฿15,000 threshold, and ฿18,000 transfer are examples, not approved policy.

## Trusted Zone

The prototype lets a tester simulate inside, outside, or unavailable location status in Settings. It does not request or store real coordinates. The transfer review and Smart Pause show the selected status in English feature terminology, with a visible simulation cue. Being inside Trusted Zone never cancels a Trusted Limit or other warning; unavailable location is not itself suspicious. The current demo rule also pauses for outside status on its own. Whether outside status should instead require another signal remains a team decision; this update does not change that rule.

When an outside-Zone status is part of a paused transfer, the Trusted Contact sees a prominent prompt to contact the sender before responding. The contact sees only the coarse outside-Zone status, never an address or live coordinates. Inside and unavailable status are not disclosed to the contact. Zone context does not change the contact's advice/approval authority or the sender's two-minute Warn wait.

## Attention and pressure features (proposed, 18 October 2026)

Added after team feedback and a design review. They are prototype behavior for user testing; confirm with the team before presenting any of them as policy.

- **Self-check answers inform, never decide.** A “yes” strengthens the warning and promotes stopping; it does not add a block, change the 2-minute wait, or alter contact authority. Scammers can coach victims to answer “no”, so treat this as a prompt for reflection, not detection.
- **Self-check answers are shared with the Trusted Contact** (owner decision, 18 October 2026). This is extra sender data leaving the sender's view; the consent text should mention it if the feature stays.
- **Contact callback** is simulated. In a real product it would notify the contact to call the sender, which works even while the sender is on another call (call waiting). An in-app voice call was considered and not chosen.
- **Salary share** is computed from a fictional salary and shown only to the sender.
- **Weakening protection** (lower level, higher limit, consent removed, contact changed) requires a simulated identity confirmation and states that the contact will be notified (simulated). Strengthening saves immediately. A delay before weakening takes effect was considered and not chosen.
- **Hold to continue** (3 seconds) replaces the single tap for the final Warn continuation.
- Rejected for now: purpose-category-specific warnings (scammers can coach the category), scheduling the transfer for tomorrow, device vibration.

Known prototype gap: each scenario defines its own `zoneStatus`, but the app uses the Trusted Zone value from Settings for every scenario, so the laptop scenario's “unavailable” value is not applied.

## Pitch and prototype boundary

Keep pitch-style product explanation in slides, not the in-app transfer journey. The prototype should read like an ordinary mobile banking flow. Use neutral feature labels in the interface while keeping brief transaction status, risk reason, and safety guidance at the decision point. Retain the unobtrusive simulation disclosure.

The earlier submitted proposal described the user as the final decision-maker. **Approval required** changes the per-transfer authority: the contact can prevent the normal approval path. The pitch should describe this level as an explicit user-selected delegation and explain the recovery route. Confirm with the team that this extension remains consistent with the submitted proposal before treating it as the main pitch flow.

The competition upload guide prohibits KBank, KBTG, and K PLUS names and logos inside the proposed product, prototype, or demo. It requires limiting access to an online demo during mentoring and the competition and closing it afterward. Use fictional data and review AI-generated code for security issues before hosting.
