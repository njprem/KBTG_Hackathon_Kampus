# TrustGuard Mobile Prototype Design Spec

Status: design direction for the hackathon prototype, 16 October 2026. Use [the product decisions](PRODUCT_SPEC.md) for protection levels, monthly counting, and unresolved rules.

## Design intent

TrustGuard should feel familiar to someone who uses a Thai mobile banking app: a clear account overview, quick access to transfer, prominent amounts, a review step, and a calm transaction result. K PLUS is a reference for this level of familiarity. The interface itself must be recognizably **TrustGuard**.

This is a mobile-first web prototype for testing on a phone through a Vercel link. Every account, person, balance, transfer, risk signal, and response is fictional. Keep a visible but unobtrusive “ต้นแบบสำหรับทดลอง” label and never ask for real banking credentials or show a real transfer as completed.

### Brand boundary

- Use the TrustGuard name and an original wordmark or simple shield motif. Do not place KBank, KBTG, K PLUS, or their logos in the product UI or demo screens.
- Borrow common mobile banking patterns, such as card-based summaries and step-by-step transfer review. Do not reproduce K PLUS screenshots, icons, illustrations, navigation geometry, exact color values, or distinctive arrangements.
- The official upload guide bans those names and logos inside the product, prototype, or demo; it does not state a color ban. The earlier team hand-off advises against copying K PLUS's tone. The palette below keeps the requested green banking feel with a distinct TrustGuard identity.

## Visual system

| Element | Direction |
| --- | --- |
| Primary | Deep teal `#0B5D58` for main actions and the TrustGuard header |
| Accent | Sea green `#087F72` for selected states and small highlights |
| Canvas | Off-white `#F6F9F8` with white `#FFFFFF` surfaces |
| Text | Ink `#17312F`; secondary `#526764` |
| Caution | Amber `#9A5B00` on pale amber `#FFF3D8` |
| High risk | Dark red `#A32828` on pale red `#FDECEC` |
| Shape | Soft cards, 12–16 px corners, subtle borders; avoid heavy shadows |
| Type | Thai-first sans-serif, such as Noto Sans Thai with system fallbacks; tabular numerals for amounts |

Aim for a calm, credible banking feel. Use color to reinforce a written status, never as the only indication of risk. Reserve red for an urgent state rather than filling the whole screen. Keep dense financial details in clean rows instead of decorative graphics.

## Layout and navigation

- Design for 360–430 px phone widths first, then adapt to larger screens. Respect the device safe area and keep the primary action reachable near the bottom.
- Use a short top bar with TrustGuard identity, page title, and back control. A simple bottom navigation can show Home, Transfer, Activity, and Settings in Thai; only prototype destinations need to work.
- Home opens with a fictional account balance card, a clear “โอนเงิน” action, recent activity, and a small TrustGuard status/settings entry. The protective feature should feel like part of everyday banking rather than a separate fraud dashboard.
- Transfer uses a linear sequence: recipient and amount → review → risk evaluation → Smart Pause when triggered → contact review → sender outcome. Show progress and retain entered demo data when moving backward.
- Use one consistent amount format, e.g. `฿18,000.00`, and show recipient name, masked account identifier, and transfer status together at review and outcome steps.

## Required screens

| Screen | Main content and action |
| --- | --- |
| Home | Fictional balance, quick transfer action, recent items, entry to TrustGuard settings. |
| Transfer entry | Recipient, amount, source account, and a clear next step. Use only fictional preset recipients. |
| Transfer review | Summary of recipient and amount before any risk interruption. No real confirmation or payment API. |
| Smart Pause | Most prominent line says the money has **not** been sent. Explain the trigger and amount. In Warn, show the 60-second minimum wait and contact notification. In Approval required, show the pending contact decision and recovery entry. |
| Contact review | A distinct demo view for the chosen contact. Show only the sender name, amount, limited recipient context, reason for concern, and a clear approval or concern response appropriate to the selected level. |
| Sender outcome | Show paused, cancelled, contact-approved, self-confirmed after Warn, or recovery-pending status accurately. Never show a success receipt for a paused transfer. |
| Recovery | Separate simulated bank-assisted review request for Approval required when contact approval cannot be obtained; show a pending status, not instant release. |
| TrustGuard settings | Let the user choose Off, Warn, or Approval required; show the monthly limit, trusted person, what they can see, and how Zone contributes. Mark unresolved rule details as prototype assumptions. |

The first implementation may prioritize **Smart Pause → Contact review → Sender outcome**, with enough Home and Transfer context for a tester to understand how the interruption arose.

## Example Thai microcopy

| Situation | Suggested text |
| --- | --- |
| Paused status | “รายการนี้ยังไม่ถูกโอน” |
| Limit trigger | “ยอดโอนสะสมในรอบนี้ถึงเกณฑ์ที่คุณตั้งไว้ ลองทบทวนก่อนส่งเงิน” |
| Unknown recipient risk | “เรายังไม่มีข้อมูลความเสี่ยงของบัญชีนี้ แต่รายการเข้าเงื่อนไขที่คุณตั้งไว้” |
| Request help | “ขอให้คนที่ไว้ใจช่วยดู” |
| Warn wait | “รออย่างน้อย 1 นาที แล้วตัดสินใจอีกครั้ง” |
| Approval pending | “รอคนที่คุณไว้ใจอนุมัติก่อนส่งเงิน” |
| Recovery | “ติดต่อขอให้ธนาคารช่วยตรวจสอบรายการนี้” |
| Contact advice | “ฉันแนะนำให้หยุดและคุยกันก่อนโอน” |
| Normal transaction | “หากเป็นรายการที่คุณตั้งใจทำ ให้ตรวจชื่อผู้รับและจำนวนเงินอีกครั้ง” |

Keep the message direct and non-accusatory. Do not call a recipient a “บัญชีม้า” or reveal a bank risk classification in the UI. Distinguish advice in Warn from required approval in Approval required.

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
