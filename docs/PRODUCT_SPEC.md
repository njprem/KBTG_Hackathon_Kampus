# TrustGuard Prototype Product Decisions

Status: working decisions from the project owner, 16 October 2026. Details marked **Proposed** are for the prototype and need team review.

## Goal

Help a first jobber pause a concerning transfer, understand why it was flagged, and involve a person they trust before money leaves. The prototype simulates all transfers and contact responses.

## Protection levels

The user chooses one level during setup. Existing bank-required security controls still apply at every level.

| Level | Behavior when a TrustGuard rule triggers |
| --- | --- |
| **Off** | No additional TrustGuard pause or contact notification. |
| **Warn** | Smart Pause explains the trigger and notifies the pre-consented Trusted Contact. The sender can manually confirm after a minimum 60-second wait; the transfer is never auto-confirmed when the timer ends. Show any contact response received before the sender's decision. |
| **Approval required** | Smart Pause holds the transfer until the Trusted Contact approves it. The sender can cancel at any time. If the contact is unavailable or approval cannot be obtained, the sender can start a **separate recovery route**. There is no instant self-approval path in this level. |

The 60-second wait is a design hypothesis to test with users, not a proven safety threshold. The contact must consent to the role and to the limited information shared with them before alerts are sent.

## Separate recovery route

**Decided:** the strong level must have a way forward when the contact cannot approve; it must remain separate from a one-tap sender override.

**Proposed for the prototype:** show a bank-assisted review request with additional identity and scam checks. Simulate its submission and pending outcome. Do not imply that the prototype is connected to a bank or that it has completed a real verification. The team still needs to decide who resolves this route, its timing, what happens after a contact rejects a transfer, and how a user replaces a contact who is no longer safe or available.

## Trusted Limit

- **Decided:** count relevant transfers within a **calendar month** using Asia/Bangkok local dates; reset at the start of the first day of the next month.
- The threshold is chosen by the user. Reaching it can trigger Smart Pause even when there is no recipient-account risk signal.
- **Open:** which recipients and transfers count, how long a recipient remains watched, and whether an additional rule should address transfers split across a month boundary. A first small transfer must not automatically make a recipient trusted.
- The demo amounts of ฿28,000 salary, ฿15,000 threshold, and ฿18,000 transfer are examples, not approved policy.

## Pitch and prototype boundary

The earlier submitted proposal described the user as the final decision-maker. **Approval required** changes the per-transfer authority: the contact can prevent the normal approval path. The pitch should describe this level as an explicit user-selected delegation and explain the recovery route. Confirm with the team that this extension remains consistent with the submitted proposal before treating it as the main pitch flow.

The competition upload guide prohibits KBank, KBTG, and K PLUS names and logos inside the proposed product, prototype, or demo. It requires limiting access to an online demo during mentoring and the competition and closing it afterward. Use fictional data and review AI-generated code for security issues before hosting.
