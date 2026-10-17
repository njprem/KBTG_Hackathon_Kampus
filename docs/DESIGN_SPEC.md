# TrustGuard Mobile Prototype Design Spec

Status: design direction for the hackathon prototype, 16 October 2026. Use [the product decisions](PRODUCT_SPEC.md) for protection levels, monthly counting, and unresolved rules.

## Design intent

The prototype should feel familiar to someone who uses a Thai mobile banking app: a clear account overview, quick access to transfer, prominent amounts, a review step, and a calm transaction result. K PLUS is a reference for this level of familiarity. Keep the TrustGuard name in the app header and the feature names in English, but leave the why/how pitch explanation in slides.

This is a mobile-first web prototype for testing on a phone through a Vercel link. Every account, person, balance, transfer, risk signal, and response is fictional. Keep a visible but unobtrusive “ต้นแบบสำหรับทดลอง” label and never ask for real banking credentials or show a real transfer as completed.

### Brand boundary

- Use TrustGuard in the app header and preserve the feature names Trusted Limit, Trusted Contact, Trusted Zone, and Smart Pause in English. Keep other banking labels neutral and use an original shield motif where useful. Do not place pitch-style promotional copy or KBank, KBTG, K PLUS names or logos in the product UI or demo screens.
- Borrow common mobile banking patterns, such as card-based summaries and step-by-step transfer review. Do not reproduce K PLUS screenshots, icons, illustrations, navigation geometry, exact color values, or distinctive arrangements.
- The official upload guide bans those names and logos inside the product, prototype, or demo; it does not state a color ban. The earlier team hand-off advises against copying K PLUS's tone. The palette below keeps a distinct green banking feel for ordinary screens and reserves red for danger.

## Visual system

| Element | Direction |
| --- | --- |
| Primary | Deep teal `#0B5D58` for main actions and the TrustGuard header |
| Accent | Sea green `#087F72` for selected states and small highlights |
| Canvas | Off-white `#F6F9F8` with white `#FFFFFF` surfaces |
| Text | Ink `#17312F`; secondary `#526764` |
| Caution | Amber `#9A5B00` on pale amber `#FFF3D8` |
| High risk | Saturated red `#BF1729` with white text in the main danger banner, plus dark red on pale red for supporting warning details |
| Shape | Soft cards, 12–16 px corners, subtle borders; avoid heavy shadows |
| Type | Thai-first sans-serif, such as Noto Sans Thai with system fallbacks; tabular numerals for amounts |

Aim for a calm, credible banking feel during ordinary transactions. Make paused/danger states unmistakable with a vivid red banner and explicit written status; color must never be the only risk cue. Keep dense financial details in clean rows instead of decorative graphics.

## Layout and navigation

- Design for 360–430 px phone widths first, then adapt to larger screens. Respect the device safe area and keep the primary action reachable near the bottom.
- Use a short TrustGuard top bar, page title, and back control. A simple bottom navigation can show Home, Transfer, Activity, and Settings in Thai; only prototype destinations need to work.
- Home opens with a fictional account balance card, a clear “โอนเงิน” action, and a small safety settings entry. The protective feature should feel like part of everyday banking rather than a separate fraud dashboard.
- Transfer uses a linear sequence: recipient and amount → review → risk evaluation → Smart Pause popup when triggered → contact review → sender outcome. Keep the transfer review visible but inactive behind Smart Pause. Show progress and retain entered demo data when moving backward.
- Use one consistent amount format, e.g. `฿18,000.00`, and show recipient name, masked account identifier, and transfer status together at review and outcome steps.

## Required screens

| Screen | Main content and action |
| --- | --- |
| Home | Fictional balance, quick transfer action, prepared demo scenarios, and entry to safety settings. |
| Transfer entry | Recipient, amount, source account, and a clear next step. Use only fictional preset recipients. |
| Transfer review | Summary of recipient and amount before any risk interruption. No real confirmation or payment API. |
| Trusted Zone status | Show “คุณอยู่ใน Trusted Zone”, “คุณอยู่นอก Trusted Zone”, or “ไม่สามารถตรวจสอบ Trusted Zone ได้” on transfer review and Smart Pause. Mark the status as simulated. Inside never clears another trigger; unavailable is not itself a risk signal. |
| Smart Pause | Open as a near-full-screen red, scrollable, focus-trapped popup over the inert transfer review, not a new page (team feedback asked for red across the whole screen). Label it “TrustGuard Triggered” beside the shield. Most prominent line says the money has **not** been sent. Put the actual trigger(s), including the accumulated amount and Trusted Limit when relevant, directly in the red banner; do not require scrolling to learn why the transfer paused. Put the unknown-recipient-risk caveat in the banner description. Show a concise transfer summary, simulated Trusted Zone status, contact state, and wait/approval state. In Warn, show the 2-minute minimum wait and contact notification. After the wait, show a strong no-response warning when relevant. Make sender continuation a subdued grey text action, never the dominant button. A separate confirmation popup defaults to stopping before continuing. In Approval required, show the pending contact decision and recovery entry; do not expose continuation before approval. Dismissing Smart Pause returns to review but retains the evaluated hold, and the review action reopens the popup. |
| Contact review | A distinct demo view for the chosen contact. Show only the sender name, masked amount `฿XX,XXX` (not the exact amount), recipient name, masked recipient account, sender-side transfer description (preset fictional text in this prototype), reason for concern, and a clear approval or concern response appropriate to the selected level. Label the description as sender-side context, not proof that the recipient is trustworthy. If outside Trusted Zone contributed to the pause, show a prominent prompt to contact the sender first, without sharing an address or live location. Do not disclose inside or unavailable Zone status to the contact. |
| Sender outcome | Show paused, cancelled, contact-approved, self-confirmed after Warn, or recovery-pending status accurately. Never show a success receipt for a paused transfer. |
| Recovery | Separate simulated bank-assisted review request for Approval required when contact approval cannot be obtained; show a pending status, not instant release. |
| Safety settings | Let the user choose Off, Warn, or Approval required; show Trusted Limit, Trusted Contact, and a simulated three-state Trusted Zone control. Keep the save action anchored above the bottom navigation while the settings content scrolls, without covering form controls. Do not request real location in this prototype. Keep speculative product rules in team docs rather than pitch-style UI copy. |

The first implementation may prioritize **Smart Pause → Contact review → Sender outcome**, with enough Home and Transfer context for a tester to understand how the interruption arose.

## Attention mechanics (prototype proposals, 18 October 2026)

These came from team feedback and a design review. They are demo behavior to test with users, not approved policy. See [the product decisions](PRODUCT_SPEC.md#attention-and-pressure-features-proposed-18-october-2026).

| Mechanic | Behavior in the prototype |
| --- | --- |
| Alarm → calm | Smart Pause opens bright red and shakes once (0.6 s, icon pulses). After 2 s it settles to a steadier deep red and shows “หายใจลึก ๆ ไม่ต้องรีบ เงินยังอยู่กับคุณ”. Reopening the same held transfer skips the alarm. `prefers-reduced-motion` removes shake and transitions. |
| Rotating lead line | The line under “รายการนี้ยังไม่ถูกโอน” rotates through four messages per evaluation to reduce habituation. The main status line never changes. |
| Salary context | Sender-only line: “64% ของเงินเดือน · โอนแล้วจะเหลือในบัญชี ฿10,000.00” from the demo salary/balance (฿28,000). Not shown to the contact because it would reveal the amount. |
| Self-check | Three yes/no questions while waiting: someone on a call/chat, told to keep it secret, given a deadline. Any “yes” shows a red “นี่คือสัญญาณที่มิจฉาชีพใช้บ่อย” alert and makes “หยุดการโอนไว้ก่อน” the first, solid button. Answers are shared with the contact. |
| Contact callback | “ขอให้{ชื่อ}โทรหาฉันตอนนี้” asks the contact to call the sender, so the sender need not hang up on an ongoing call. It becomes the top red button when the sender says someone is on the call. The contact view shows the request and a simulated “โทรหาพลอย” action; the sender then sees an incoming-call status. |
| Contact identity | Coloured initial avatar and the contact's name in status text (“มินยังไม่ได้ตอบ”, “มินกังวล…”) instead of a generic label. |
| Hold to continue | In the final Warn confirmation, continuing requires pressing and holding for 3 s (pointer, Space or Enter); a progress bar fills and releasing early resets it. |
| Typed purpose | Transfer entry has “โอนไปเพื่ออะไร” (max 60 characters); the contact sees it labelled as the sender's own text. |
| Weakening settings | Settings edit a draft; leaving without saving discards it. Lowering the level, raising the limit, removing consent or changing the contact opens “ยืนยันตัวตนก่อนลดการปกป้อง” with stopping as the primary action. Identity confirmation is a simulated button; no PIN or credential is requested. |

## Example Thai microcopy

| Situation | Suggested text |
| --- | --- |
| Paused status | “รายการนี้ยังไม่ถูกโอน” |
| Limit trigger | “ยอดโอนสะสมในรอบนี้ถึงเกณฑ์ที่คุณตั้งไว้ ลองทบทวนก่อนส่งเงิน” |
| Unknown recipient risk | “เรายังไม่มีข้อมูลความเสี่ยงของบัญชีนี้ แต่รายการเข้าเงื่อนไขที่คุณตั้งไว้” |
| Request help | “ขอให้คนที่ไว้ใจช่วยดู” |
| Warn wait | “รออย่างน้อย 2 นาที แล้วตัดสินใจอีกครั้ง” |
| Approval pending | “รอคนที่คุณไว้ใจอนุมัติก่อนส่งเงิน” |
| Recovery | “ติดต่อขอให้ธนาคารช่วยตรวจสอบรายการนี้” |
| Contact advice | “ฉันกังวล ขอให้หยุดโอนแล้วคุยกันก่อน” or “ยังไม่พบข้อกังวลจากข้อมูลที่เห็น” (advice, not approval) |
| Normal transaction | “หากเป็นรายการที่คุณตั้งใจทำ ให้ตรวจชื่อผู้รับและจำนวนเงินอีกครั้ง” |

Keep the message direct and non-accusatory. Do not call a recipient a “บัญชีม้า” or reveal a bank risk classification in the UI. Distinguish advice in Warn from required approval in Approval required.

After a Warn wait ends without a contact response, say “ยังไม่ได้รับความเห็นจากคนที่คุณไว้ใจ” and “เราแนะนำให้หยุดการโอนไว้ก่อน.” The final confirmation repeats “มิจฉาชีพมักเร่งให้โอนเงินทันที”, gives stopping the prominent action, and renders “ยืนยันดำเนินการต่อ” as a readable but subdued grey text action. Do not use the absolute claim that only scammers create urgency.

## Scenarios and states to design

1. **Limit only:** A fictional user with a ฿28,000 salary sets a ฿15,000 threshold and starts an ฿18,000 transfer to a watched recipient. Smart Pause appears even with no recipient risk flag.
2. **Split transfers:** Three ฿6,000 transfers within one counting period reach ฿18,000. The first transfer does not automatically remove the recipient from the watched group.
3. **Ordinary high-value payment:** A laptop purchase or rental deposit tests whether a legitimate transfer can be understood and continued with appropriate safeguards.
4. **Contact response:** Show approval, concern/rejection, and no response. The sender must understand what happened and what options remain under the selected level.
5. **Zone unavailable:** Denying location permission does not make a transfer suspicious by itself and does not block the demo flow.
6. **Recovery:** In Approval required, a missing or unavailable contact leads to a separate pending review, not a one-tap sender override.

The calendar month and three protection levels are chosen. The watched-recipient rule, contact timeout, and recovery resolution remain open. Use clearly labeled demo values until the team agrees on them. A bank-required hold, if represented, cannot be overridden by the sender or contact.

## Interaction and review checklist

- Every actionable control has a text label and visible focus state. Touch targets are at least about 44 px high; body text remains comfortable on a phone.
- Warnings name the cause and current transfer status before asking for a decision. Do not rely on a color change, vibration, or animation alone.
- Preserve readable Thai line breaks and long names at small widths. Test screen-reader order and keyboard navigation for the core flow.
- A tester can restart the scenario and switch between sender and contact views without personal accounts or invitations.
- On the deployed phone link, check Home → transfer → pause → contact → outcome, the alternate scenarios, direct page loads, and the demo reset control.

## Reference and scope

- Product direction: TrustGuard hand-off dated 13 October 2026 and scope proposal dated 14 October 2026. The latter recommends that recipient-account risk be a supporting signal and that the key prototype sequence be Smart Pause → Contact review → Sender outcome.
- Interface reference: [K PLUS product overview](https://www.kasikornbank.com/th/kplus) for broad mobile banking conventions only. No assets or brand elements from that page should be copied into the prototype.
