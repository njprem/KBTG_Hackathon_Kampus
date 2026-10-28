# TrustGuard Mobile Prototype Design Spec

Status: v3.0, 20 October 2026.
Use [the product decisions](PRODUCT_SPEC.md) for the 3T rules and open questions.
The mentor's top priority for this round was a beautiful UI.

## Design intent

The prototype should feel like a calm, modern Thai banking app: a clear balance, quick transfer, a short review step and a clear result.
TrustGuard appears only when it has something to say, and its warning stays compact (mentor: the warning does not need to be large).
Keep the TrustGuard name in the header, feature names in English (Trust Zone, Trust Contact, Trust Limit, Smart Pause) and everything else in Thai.
Every account, person, balance and outcome is fictional, and a small "Prototype 4.0" label stays visible.

### Brand boundary

- No KBank, KBTG or K PLUS names, logos, screenshots, icons or distinctive layouts in the product or demo.
- Common mobile banking patterns, such as a balance card and a step-by-step review, are fine.

## Visual system

| Element | Direction |
| --- | --- |
| Brand | Deep teal `#0B5D58` (actions, header, active nav), sea green `#087F72` (selection, focus ring, spinner) |
| Canvas | Light grey-green `#F6F9F8` with white cards; no card borders, soft shadows |
| Text | Ink `#17312F`; secondary `#526764`; faint `#7B8D87` |
| Pass / fail marks | Green `#0F7A4F` check, red `#B3131F` cross, grey dash for "not counted" |
| Red | Reserved for the frame around the 3T checklist and the ✗ marks inside it (mentor reference image). Nothing else on a TrustGuard screen is red. Form validation errors stay red as a general convention. |
| Amber | `#8A5300` on `#FFF3D8` for the scam warning line, the one-check notice, "จะถูกพัก" badges and a Trust Limit ring at 100% |
| Shape | 20-28 px card corners, round icon buttons, pill navigation, 52 px primary buttons; all shadows at 20% of their original strength (owner decision, 21 October 2026) |
| Type | Google Sans (OFL, self-hosted variable font, includes Thai) at weights 400-700; tabular numerals for amounts |

Colour is never the only cue: every check also has a ✓/✗/- mark and screen-reader text, and every state has written status.

## Motion

Motion follows a reference banking app the team chose; durations stay short and all of it respects `prefers-reduced-motion`.

| Moment | Behaviour |
| --- | --- |
| Tap | A soft teal circle blooms from the touch point on any button or selectable item. Pressed buttons scale to 98%. |
| Screen change | New screen fades in, rises 14 px and un-blurs over 0.32 s. There is no exit animation; it stalled the outcome screen under a fake clock. |
| Confirm transfer | The screen blurs behind a white circle with a spinning arc and "กำลังทำรายการ / กรุณารอสักครู่" for 0.6 s, then shows the result or Smart Pause. The copy is an ordinary transaction message, not a TrustGuard message. Reopening an existing pause skips it. |
| Bottom sheets | Slide up with a blurred backdrop and can be swiped down. Smart Pause has a round badge across its top edge with a soft pulse. |
| Outcome | The result card rises in with a badge across its top edge (green check, or teal cross when cancelled). |
| Navigation | The active pill slides between Home, Transfer and Settings. It stays on every page (owner decision, 20 October 2026). |
| Trust Limit ring | Draws from empty to the current share on Home. |
| (i) rows | Expand with a height transition; the mark scales slightly when open. |

## Screens

| Screen | Content |
| --- | --- |
| Home | Greeting, balance card with hide toggle, **ลองฟีเจอร์ TrustGuard** (four large scenario cards, numbered, with a live badge: จะถูกพัก / มีคำเตือน / โอนผ่าน / ยอดเงินไม่พอ), quick transfer avatar row, TrustGuard 3T card with Trust Limit ring, recent transfers. |
| Transfer | Step 1 of 2. Recipient avatar row (radio group, Trust Contact badge), selected recipient account card, amount field with balance and errors. The action is pinned just above the bottom nav. On phones up to 860 px tall the account row is hidden; review shows it. |
| Review | Step 2 of 2. Amount, from/to rows and simulated location. One failed check adds an amber note here, and the send icon is hidden to make room. The actions are pinned just above the bottom nav, side by side on phones up to 860 px tall. |
| Smart Pause | Badge, "TrustGuard พักรายการนี้ไว้ก่อน" pill, title "เงินยังไม่ถูกโอน", "ไม่ผ่าน N จาก 3 ข้อ · ถ้าโอนแล้วอาจไม่ได้คืน", amount card with salary share, red-framed 3T checklist, amber scam line "ถ้ามีคนบอกให้กดข้ามหน้านี้ คนนั้นคือมิจฉาชีพ", Cancel (primary), Continue with countdown, demo-only skip link. |
| Outcome | Completed, continued or cancelled card with amount and recipient; AOC 1441 hotline when the user was paused; "โอนรายการเดิมอีกครั้ง" reopens the transfer form with the same recipient and amount. |
| Settings | On/off switch, then Trust Zone, Trust Contact and Trust Limit sections in that order, each with an (i) disclosure; save button above the floating nav. |

## New user setup and AI suggestions (20 October 2026)

- The left header button on Home switches between the set-up demo user and a new user who has not turned TrustGuard on.
- The new user's Home shows a "เปิดใช้ TrustGuard ไหม?" card; transfers are not checked until setup ends.
- Setup has four steps: Trust Zone, Trust Contact, Trust Limit, summary.
- Trust Zone shows simulated AI suggestions: the sign-up address turned into an area, and places the user often transfers from. The user adds each one explicitly.
- Tapping Add for a Trust Zone suggestion opens a map sheet centred on a fictional example point. The user can pan/zoom, drag the pin or tap the map, choose a radius and confirm. Setup and Settings also offer “เลือกพื้นที่เองบนแผนที่”. Never request device GPS in the demo; explain that 3T location status remains simulated. Show OpenStreetMap attribution and a privacy note about viewed map tiles.
- People chosen as Trust Contact during first setup count at once; people added later are watched for 7 days.
- After a finished (not cancelled) transfer that the AI recognises (the ฿25 หมูปิ้ง purchase), a small white-and-purple button under the slip reads "ร้านประจำ? เพิ่มเข้า Trust Zone และ Trust List".
  Tapping it opens a bottom sheet with one add button per suggestion; the slip itself stays clean because people screenshot it.
- If the user does not open that button, the same suggestions wait on Home between the transfer card and the TrustGuard 3T card, with × to close and "ไม่แสดงอีก 30 วัน".
- Suggestions are never offered during Smart Pause or after a cancel.
- Settings lists Trust Zone places with their source, and shows people (Trust Contact) and shops (Trust List) as separate cards, each with its own AI suggestions. Both share one trusted list underneath.
- All AI output is fixed demo data; no real address, location or model is used.

## Demo affordances

- Scenario cards and "โอนรายการเดิมอีกครั้ง" open the transfer form already filled in, so the user sees who and how much before tapping "ตรวจสอบรายการ" (owner decision, 20 October 2026).
- The reset control in the header restores the demo state.
- The skip-wait link is labelled "(เฉพาะการทดลอง)".

## Interaction and review checklist

- Touch targets at least 44 px; visible focus ring on every control.
- Thai text wraps cleanly at 360-430 px widths; long recipient names truncate in avatar rows.
- Bottom content clears the floating navigation.
- Transfer, Review and Smart Pause fit one screen without scrolling from 360x640 up, with the bottom nav visible (owner decision, 20 October 2026).
  The `snug` variant (up to 860 px tall) compacts Transfer and Review; `short` (up to 760 px) tightens further and compacts Smart Pause.
- Smart Pause (i) explanations open as a floating card over the list, one at a time, so they never add scrolling.
- Smart Pause scrolls on short screens and traps focus.
- Run `npm run e2e` and look at the screenshots in the report after any visual change.
