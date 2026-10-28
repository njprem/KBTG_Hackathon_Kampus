# TrustGuard Prototype Product Decisions

Status: v3.0, 20 October 2026, rebuilt after the Prototype 2.0 mentor and user-testing round.
Mentor feedback outweighs tester feedback where they differ, and v3.0 may diverge from the submitted proposal.
Rules marked **Demo value** are prototype choices for testing, not approved policy.

## Goal

Give a first jobber a short, clear pause before a concerning transfer leaves, with the reason stated in plain terms.
The prototype simulates every transfer; nothing is sent to a bank or to another person.

## The 3T checks

Every transfer is checked against three protections the user sets up.
They are always shown in this order and with these names.

| Check | Passes | Fails | Not counted |
| --- | --- | --- | --- |
| **Trust Zone** | The user is in an area where they usually transfer | The user is outside that area | Location unavailable |
| **Trust Contact** | The recipient is on the user's Trust Contact list and the watch period has ended | Anyone else, including someone added in the last 7 days | - |
| **Trust Limit** | This month's counted total, including this transfer, is below the limit | The total reaches the limit | Transfers to a Trust Contact are not counted |

- **Decision:** 0 failed checks completes normally. 1 failed check shows a one-line notice on the review step and the user continues. 2 or more open Smart Pause.
- **Why 2 of 3:** the mentor note "Block ตาม Criteria ที่ไม่ผ่าน" was interpreted to avoid pausing ordinary transfers such as a small first payment to someone new. This is an interpretation; confirm with the mentor.
- **Trust Zone** means where the user usually transfers, learned from their history (mentor), not the address given at sign-up. Being inside never clears another failed check. The prototype simulates the status in Settings and never requests device GPS.
- **Trust Zone map picker (demo interaction):** adding an AI-suggested area or a manual area opens an interactive map. The user taps or drags a pin, names the area, chooses a 300 m–2 km radius, and confirms. The selected point is held only in the running browser session; the prototype still uses the simulated location status or known scenario place for the 3T decision and does not request device GPS. This does not validate real-world location matching.
- **Trust Contact** is a list of several trusted people, such as parents (tester request for a whitelist). Nobody is notified or asked to approve; the mentor removed contact alerts and approval. **Demo value:** 7-day watch period after adding someone, so a scammer cannot simply instruct the victim to add their account.
- **Trust Limit** counts transfers to people outside Trust Contact within an Asia/Bangkok calendar month, so split transfers add up. The user chooses the amount (demo presets ฿5,000-฿20,000; default ฿15,000).

## Smart Pause

- The sheet states that the money has **not** been sent, shows the amount and its share of the demo salary, the 3T checklist, one scam warning line, and two actions.
- Each check row shows ✓ or ✗ and an (i) control; tapping it expands what happened and what the check means (mentor: some people may not understand the terms).
- **Cancel** is the primary action. **Continue** unlocks after a **30-second** wait (**Demo value**; mentor asked to reduce the previous 2 minutes). The timer never sends money by itself.
- Closing the sheet keeps the hold; confirming again reopens it with the same timer.
- After the user continues, Trust Limit counts again from that total, so small follow-up transfers that month are not paused again until another full limit accumulates.
- The cancelled and continued outcomes show the AOC 1441 hotline.
- A clearly labelled demo-only link skips the wait for walkthroughs; it must not be presented as part of a real product.

## Settings

- The user can turn TrustGuard off, set Trust Zone status (simulated), manage Trust Contact and choose Trust Limit.
- Settings are a draft until saved.
- Turning TrustGuard off or raising Trust Limit opens a confirmation whose primary action keeps the current protection, with the line "ถ้ามีคนบอกให้คุณปิดการปกป้องหรือเพิ่มวงเงิน คนนั้นคือมิจฉาชีพ".
- Other changes save immediately.
  A newly added Trust Contact is protected by the 7-day watch period instead of a confirmation.

## Removed in v3.0

All removed for the mentor's comment that the feature set was too large:

- Off / Warn / Approval required levels, contact approval and the recovery route.
- Contact notifications, the contact's view and the contact callback.
- The self-check questions, typed purpose, hold-to-continue and the alarm-then-calm red screen.

## Open questions

- Is 2 of 3 the right pause rule, and is 30 seconds long enough to help?
- How should Trust Zone be learned and explained in a real app, and what is the fallback when location is off?
- Is 7 days the right watch period for a new Trust Contact, and who may remove one?
- Should registered merchants be treated differently? The ฿25 หมูปิ้ง purchase passes because the AI already knows the place and shop (not counted until the user confirms); afterwards the simulated AI suggests trusting the place or the shop, which is offered only after the transfer, never during a pause.

## Pitch and prototype boundary

Keep product explanation in slides; the prototype should read like an ordinary banking flow.
The competition upload guide prohibits KBank, KBTG and K PLUS names and logos inside the proposed product, prototype or demo, and requires limiting online demo access during mentoring and the competition and closing it afterward.
Use fictional data and review AI-generated code for security issues before hosting.
