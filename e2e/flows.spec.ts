import { expect, test, type Page, type TestInfo } from '@playwright/test'

// TrustGuard v3.0 flows at phone width. Scenarios and "repeat" open the filled transfer form first. Every person, account and amount here is fictional.
// Each test attaches screenshots so the HTML report (`npm run e2e:report`) doubles as a gallery.

async function shot(page: Page, testInfo: TestInfo, name: string) {
  await page.mouse.move(0, 0)
  await testInfo.attach(name, { body: await page.screenshot(), contentType: 'image/png' })
}

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).first()
const pauseSheet = (page: Page) => page.getByRole('dialog', { name: /เงินยังไม่ถูกโอน/ })
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name })
const checkRow = (page: Page, name: string, state: 'ผ่าน' | 'ไม่ผ่าน' | 'ไม่นับ') =>
  pauseSheet(page).getByRole('button', { name: new RegExp(`^${name}\\s*${state}`) })

async function openScenario(page: Page, title: RegExp) {
  await page.goto('/')
  await button(page, title).click()
}

async function review(page: Page) {
  await button(page, 'ตรวจสอบรายการ').click()
  await expect(page.getByRole('heading', { name: 'ตรวจสอบอีกครั้ง' })).toBeVisible()
}

async function confirm(page: Page) {
  await button(page, 'ยืนยันการโอน').click()
}

async function transferManually(page: Page, amount: string) {
  await nav(page, 'โอนเงิน').click()
  await page.getByLabel('จำนวนเงิน (บาท)').fill(amount)
}

async function continuePastPause(page: Page) {
  await button(page, 'ข้ามเวลารอ (เฉพาะการทดลอง)').click()
  await button(page, /^โอนต่อ$/).click()
  await expect(page.getByRole('heading', { name: 'คุณเลือกโอนต่อ (จำลอง)' })).toBeVisible()
}

async function saveSettings(page: Page) {
  await button(page, 'บันทึกการตั้งค่า').click()
}

test.describe('Smart Pause', () => {
  test('scam-style deposit fails 2 of 3 checks and pauses', async ({ page }, testInfo) => {
    await page.clock.install()
    await openScenario(page, /ค่าจองสินค้า/)
    await expect(page.getByLabel('จำนวนเงิน (บาท)')).not.toHaveValue('')
    await shot(page, testInfo, '1 scenario fills the transfer form')
    await review(page)
    await expect(page.getByRole('note')).toHaveCount(0)
    await shot(page, testInfo, '2 review')
    // Hold time still so the 0.6 s processing spinner can be checked reliably, then let it finish.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
    await confirm(page)
    await expect(page.getByRole('status')).toContainText('กำลังทำรายการ')
    await page.clock.resume()
    await expect(pauseSheet(page)).toBeVisible()
    await expect(page.getByRole('status')).not.toContainText('กำลังทำรายการ')
    await expect(pauseSheet(page)).toContainText('ไม่ผ่าน 2 จาก 3 ข้อ')
    await expect(checkRow(page, 'Trust Zone', 'ผ่าน')).toBeVisible()
    await expect(checkRow(page, 'Trust Contact', 'ไม่ผ่าน')).toBeVisible()
    await expect(checkRow(page, 'Trust Limit', 'ไม่ผ่าน')).toBeVisible()
    await expect(pauseSheet(page)).toContainText('ถ้ามีคนบอกให้กดข้ามหน้านี้ คนนั้นคือมิจฉาชีพ')
    await shot(page, testInfo, '3 pause checklist')
  })

  test('tapping (i) expands what a check means, tapping again folds it', async ({ page }, testInfo) => {
    await openScenario(page, /ค่าจองสินค้า/)
    await review(page)
    await confirm(page)
    const limit = checkRow(page, 'Trust Limit', 'ไม่ผ่าน')
    await expect(limit).toHaveAttribute('aria-expanded', 'false')
    await limit.click()
    await expect(limit).toHaveAttribute('aria-expanded', 'true')
    await expect(pauseSheet(page)).toContainText('ยอดเดือนนี้ ฿18,000 ถึงวงเงิน ฿15,000')
    await expect(pauseSheet(page)).toContainText('Trust Limit คือวงเงินที่คุณตั้งเอง')
    await shot(page, testInfo, '1 Trust Limit expanded')
    await limit.click()
    await expect(limit).toHaveAttribute('aria-expanded', 'false')
  })

  test('cancel keeps the money and shows the AOC hotline', async ({ page }, testInfo) => {
    await openScenario(page, /ค่าจองสินค้า/)
    await review(page)
    await confirm(page)
    await button(page, 'ยกเลิกการโอน').click()
    await expect(page.getByRole('heading', { name: 'ยกเลิกการโอนแล้ว' })).toBeVisible()
    await expect(page.getByText('1441')).toBeVisible()
    await shot(page, testInfo, '1 cancelled')
    await nav(page, 'หน้าหลัก').click()
    await expect(page.getByText('฿28,000.00')).toBeVisible()
  })

  test('continue unlocks only after the 30-second wait', async ({ page }, testInfo) => {
    await page.clock.install()
    await openScenario(page, /ค่าจองสินค้า/)
    await review(page)
    // Freeze time so the countdown starts at exactly 0:30 even on a busy machine.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
    await confirm(page)
    await page.clock.runFor(700)
    const proceed = pauseSheet(page).getByRole('button', { name: /^โอนต่อ/ })
    await expect(proceed).toBeDisabled()
    await expect(proceed).toContainText('0:30')
    await shot(page, testInfo, '1 waiting')
    await page.clock.fastForward('00:20')
    await expect(proceed).toBeDisabled()
    await page.clock.fastForward('00:11')
    await expect(proceed).toBeEnabled()
    await expect(proceed).toHaveText('โอนต่อ')
    // Let real time run again so the screen transition animation can finish.
    await page.clock.resume()
    await shot(page, testInfo, '2 continue ready')
    await proceed.click()
    await expect(page.getByRole('heading', { name: 'คุณเลือกโอนต่อ (จำลอง)' })).toBeVisible()
    await nav(page, 'หน้าหลัก').click()
    await expect(page.getByText('฿10,000.00')).toBeVisible()
  })

  test('closing the sheet keeps the hold until the user decides', async ({ page }) => {
    await openScenario(page, /ค่าจองสินค้า/)
    await review(page)
    await confirm(page)
    await pauseSheet(page).getByRole('button', { name: 'ปิดเพื่อกลับไปดูรายการ' }).click()
    await expect(pauseSheet(page)).toBeHidden()
    await button(page, 'กลับไปดูคำเตือน').click()
    await expect(pauseSheet(page)).toBeVisible()
  })
})

test.describe('Trust Limit', () => {
  test('split transfers: notice first, pause on the third', async ({ page }, testInfo) => {
    await openScenario(page, /โอนแบ่งจ่าย/)
    await review(page)
    await expect(page.getByRole('note')).toContainText('นิรันดร์ ไม่ใช่ Trust Contact ของคุณ')
    await expect(page.getByRole('note')).toContainText('ไม่ผ่าน 1 จาก 3 ข้อ')
    await shot(page, testInfo, '1 first transfer notice')
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'โอนสำเร็จ (จำลอง)' })).toBeVisible()
    await button(page, 'โอนรายการเดิมอีกครั้ง').click()
    await review(page)
    await confirm(page)
    await nav(page, 'หน้าหลัก').click()
    await expect(page.getByText('฿12,000 / ฿15,000')).toBeVisible()
    await shot(page, testInfo, '2 home meter')
    await button(page, /โอนแบ่งจ่าย/).click()
    await review(page)
    await confirm(page)
    await expect(pauseSheet(page)).toBeVisible()
    await expect(checkRow(page, 'Trust Limit', 'ไม่ผ่าน')).toBeVisible()
    await shot(page, testInfo, '3 third transfer pauses')
  })

  test('typing 6,000 by hand counts the same as the Home shortcut', async ({ page }, testInfo) => {
    await openScenario(page, /โอนแบ่งจ่าย/)
    await review(page)
    await confirm(page)
    await button(page, 'โอนรายการเดิมอีกครั้ง').click()
    await review(page)
    await confirm(page)
    await transferManually(page, '6000')
    await review(page)
    await confirm(page)
    await expect(pauseSheet(page)).toBeVisible()
    await checkRow(page, 'Trust Limit', 'ไม่ผ่าน').click()
    await expect(pauseSheet(page)).toContainText('ยอดเดือนนี้ ฿18,000 ถึงวงเงิน ฿15,000')
    await shot(page, testInfo, '1 manual third transfer pauses')
  })

  test('after continuing, a 20-baht transfer is not paused again', async ({ page }, testInfo) => {
    await openScenario(page, /ค่าจองสินค้า/)
    await review(page)
    await confirm(page)
    await continuePastPause(page)
    await transferManually(page, '20')
    await review(page)
    await expect(page.getByRole('note')).toContainText('ไม่ผ่าน 1 จาก 3 ข้อ')
    await shot(page, testInfo, '1 small transfer notice only')
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'โอนสำเร็จ (จำลอง)' })).toBeVisible()
  })

  test('pork at a new place pauses, then AI suggests trusting the place', async ({ page }, testInfo) => {
    await openScenario(page, /หมูปิ้งหน้าเซเว่น/)
    await review(page)
    await expect(page.getByText('หน้าเซเว่น ซอยอารีย์ 1 · อยู่นอก Trust Zone')).toBeVisible()
    await confirm(page)
    await expect(checkRow(page, 'Trust Zone', 'ไม่ผ่าน')).toBeVisible()
    await expect(pauseSheet(page)).toContainText('<1% ของเงินเดือน')
    await shot(page, testInfo, '1 tiny purchase paused')
    await continuePastPause(page)
    const ai = page.getByRole('region', { name: 'AI พบว่าคุณโอนแบบนี้บ่อย' })
    await expect(ai).toBeVisible()
    await shot(page, testInfo, '2 AI suggests the place and the shop')
    await ai.getByRole('button', { name: 'เพิ่ม หน้าเซเว่น ซอยอารีย์ 1 เข้า Trust Zone' }).click()
    await expect(ai.getByRole('button', { name: /เข้า Trust Zone แล้ว/ })).toBeDisabled()
    await button(page, 'กลับหน้าหลัก').click()
    await expect(button(page, /หมูปิ้งหน้าเซเว่น/)).toContainText('มีคำเตือน')
    await button(page, /หมูปิ้งหน้าเซเว่น/).click()
    await review(page)
    await expect(page.getByRole('note')).toContainText('ไม่ผ่าน 1 จาก 3 ข้อ')
    await shot(page, testInfo, '3 next time only a note')
  })
})

test.describe('Trust Contact', () => {
  test('quick transfer from Home picks the recipient', async ({ page }, testInfo) => {
    await page.goto('/')
    await button(page, 'โอนให้ แม่').click()
    await expect(page.getByRole('radio', { name: 'แม่ Trust Contact' })).toBeChecked()
    await page.getByLabel('จำนวนเงิน (บาท)').fill('500')
    await review(page)
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'โอนสำเร็จ (จำลอง)' })).toBeVisible()
    await shot(page, testInfo, '1 quick transfer done')
  })

  test('a Trust Contact passes immediately and is not counted', async ({ page }, testInfo) => {
    await openScenario(page, /โอนให้แม่/)
    await review(page)
    await expect(page.getByRole('note')).toHaveCount(0)
    await shot(page, testInfo, '1 review without notice')
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'โอนสำเร็จ (จำลอง)' })).toBeVisible()
    await nav(page, 'หน้าหลัก').click()
    await expect(page.getByText('฿0 / ฿15,000')).toBeVisible()
    await expect(page.getByText('Trust Contact · ไม่นับยอด')).toBeVisible()
  })

  test('a newly added Trust Contact is still watched for 7 days', async ({ page }, testInfo) => {
    await page.goto('/')
    await nav(page, 'ตั้งค่า').click()
    await button(page, 'นิรันดร์').click()
    await expect(page.getByText('เพิ่งเพิ่ม · ยังนับยอดอีก 7 วัน')).toBeVisible()
    await shot(page, testInfo, '1 contact added')
    await saveSettings(page)
    await button(page, /ค่าจองสินค้า/).click()
    await review(page)
    await confirm(page)
    await checkRow(page, 'Trust Contact', 'ไม่ผ่าน').click()
    await expect(pauseSheet(page)).toContainText('นิรันดร์ เพิ่งถูกเพิ่ม ยังเฝ้าดูอีก 7 วัน')
    await shot(page, testInfo, '2 still watched')
  })
})

test.describe('Trust Zone', () => {
  test('outside Trust Zone pauses even a small transfer to a new person', async ({ page }, testInfo) => {
    await page.goto('/')
    await nav(page, 'ตั้งค่า').click()
    await button(page, 'อยู่นอก Trust Zone').click()
    await saveSettings(page)
    await transferManually(page, '500')
    await review(page)
    await confirm(page)
    await expect(checkRow(page, 'Trust Zone', 'ไม่ผ่าน')).toBeVisible()
    await expect(checkRow(page, 'Trust Limit', 'ผ่าน')).toBeVisible()
    await shot(page, testInfo, '1 outside zone')
  })

  test('unavailable location is not counted as a failure', async ({ page }) => {
    await page.goto('/')
    await nav(page, 'ตั้งค่า').click()
    await button(page, 'ตรวจสอบตำแหน่งไม่ได้').click()
    await saveSettings(page)
    await transferManually(page, '500')
    await review(page)
    await expect(page.getByRole('note')).toContainText('ไม่ผ่าน 1 จาก 3 ข้อ')
  })
})

test.describe('Settings and fixes', () => {
  test('raising Trust Limit asks for confirmation; keeping protection changes nothing', async ({ page }, testInfo) => {
    await page.goto('/')
    await nav(page, 'ตั้งค่า').click()
    await button(page, '฿20,000').click()
    await saveSettings(page)
    const sheet = page.getByRole('dialog', { name: 'ยืนยันก่อนลดการปกป้อง' })
    await expect(sheet).toContainText('Trust Limit ฿15,000 → ฿20,000')
    await shot(page, testInfo, '1 confirm weakening')
    await sheet.getByRole('button', { name: 'คงการปกป้องเดิมไว้' }).click()
    await nav(page, 'หน้าหลัก').click()
    await expect(page.getByText('฿0 / ฿15,000')).toBeVisible()
  })

  test('turning TrustGuard off needs confirmation and then never pauses', async ({ page }) => {
    await page.goto('/')
    await nav(page, 'ตั้งค่า').click()
    await page.getByRole('switch').click()
    await saveSettings(page)
    await page.getByRole('dialog', { name: 'ยืนยันก่อนลดการปกป้อง' }).getByRole('button', { name: 'ยืนยันและบันทึก (จำลอง)' }).click()
    await expect(page.getByText('ปิดอยู่')).toBeVisible()
    await button(page, /ค่าจองสินค้า/).click()
    await review(page)
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'โอนสำเร็จ (จำลอง)' })).toBeVisible()
  })

  test('cannot transfer more than the balance', async ({ page }, testInfo) => {
    await page.goto('/')
    await transferManually(page, '999999')
    await expect(page.getByRole('alert')).toContainText('ยอดเงินในบัญชีไม่พอ')
    await expect(button(page, 'ตรวจสอบรายการ')).toBeDisabled()
    await shot(page, testInfo, '1 over balance')
  })
})

test.describe('Layout', () => {
  // Transfer, review and Smart Pause each fit one screen without scrolling; the bottom nav stays on every page.
  const noScroll = (page: Page, selector: string) =>
    expect.poll(() => page.locator(selector).first().evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(0)

  for (const [width, height] of [[360, 640], [390, 664], [375, 812]] as const) {
    test(`transfer, review and Smart Pause fit a ${width}x${height} screen`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height })
      await page.goto('/')
      await transferManually(page, '500')
      await expect(page.getByRole('navigation', { name: 'เมนูหลัก' })).toBeVisible()
      await noScroll(page, 'main')
      await review(page)
      await expect(page.getByRole('note')).toBeVisible()
      await noScroll(page, 'main')
      await shot(page, testInfo, `1 review with note ${width}x${height}`)
      await nav(page, 'หน้าหลัก').click()
      await button(page, /ค่าจองสินค้า/).click()
      await review(page)
      await confirm(page)
      await expect(pauseSheet(page)).toBeVisible()
      await noScroll(page, '[role="dialog"] .overflow-y-auto')
      await shot(page, testInfo, `2 Smart Pause ${width}x${height}`)
    })
  }
})

test.describe('New user setup', () => {
  async function asNewUser(page: Page) {
    await page.goto('/')
    await button(page, 'สลับเป็นผู้ใช้ใหม่ที่ยังไม่เปิด TrustGuard').click()
    await expect(page.getByRole('heading', { name: 'เปิดใช้ TrustGuard ไหม?' })).toBeVisible()
  }

  test('a new user is invited, transfers are not checked yet', async ({ page }, testInfo) => {
    await asNewUser(page)
    await expect(page.getByRole('heading', { name: 'ลองฟีเจอร์ TrustGuard' })).toHaveCount(0)
    await shot(page, testInfo, '1 invitation on Home')
    await transferManually(page, '18000')
    await review(page)
    await confirm(page)
    await expect(page.getByRole('heading', { name: 'โอนสำเร็จ (จำลอง)' })).toBeVisible()
  })

  test('setup: AI Trust Zone suggestions, Trust Contact counts at once, then TrustGuard is on', async ({ page }, testInfo) => {
    await asNewUser(page)
    await button(page, 'เริ่มตั้งค่า').click()
    await expect(page.getByRole('status').filter({ hasText: 'AI กำลังอ่านที่อยู่' })).toBeVisible()
    await shot(page, testInfo, '1 AI reading address and transfers')
    await button(page, 'เพิ่ม บ้าน ใน Trust Zone').click()
    await button(page, 'เพิ่ม ที่ทำงาน ใน Trust Zone').click()
    await expect(button(page, 'เอาออก บ้าน ใน Trust Zone')).toHaveAttribute('aria-pressed', 'true')
    await shot(page, testInfo, '2 Trust Zone suggestions')
    await button(page, 'ถัดไป').click()
    await button(page, /แม่/).click()
    await shot(page, testInfo, '3 Trust Contact')
    await button(page, 'ถัดไป').click()
    await shot(page, testInfo, '4 Trust Limit')
    await button(page, 'ถัดไป').click()
    await expect(page.getByText('แม่ · ใช้ได้ทันที')).toBeVisible()
    await shot(page, testInfo, '5 summary')
    await button(page, 'เปิด TrustGuard').click()
    await expect(page.getByRole('heading', { name: 'ลองฟีเจอร์ TrustGuard' })).toBeVisible()
    await button(page, /โอนให้แม่/).click()
    await review(page)
    await expect(page.getByRole('note')).toHaveCount(0)
    await shot(page, testInfo, '6 mom passes right after setup')
  })

  test('switching back restores the set-up user', async ({ page }) => {
    await asNewUser(page)
    await button(page, 'สลับเป็นผู้ใช้ที่ตั้งค่า TrustGuard แล้ว').click()
    await expect(page.getByRole('heading', { name: 'ลองฟีเจอร์ TrustGuard' })).toBeVisible()
  })
})

test.describe('AI suggestions in Settings', () => {
  test('Settings lists Trust Zone places and AI suggestions for places and accounts', async ({ page }, testInfo) => {
    await page.goto('/')
    await nav(page, 'ตั้งค่า').click()
    await expect(page.getByText('จากที่อยู่ตอนเปิดบัญชี').first()).toBeVisible()
    await button(page, 'เพิ่ม หน้าเซเว่น ซอยอารีย์ 1 ใน Trust Zone').click()
    await expect(page.getByText('AI พบว่าโอนบ่อย').first()).toBeVisible()
    await shot(page, testInfo, '1 Trust Zone with AI suggestion added')
    await button(page, 'เพิ่มร้านหมูปิ้งป้าแดงเป็น Trust Contact').click()
    await expect(page.getByText(/เพิ่งเพิ่ม · ยังนับยอดอีก 7 วัน/)).toBeVisible()
    await shot(page, testInfo, '2 AI-suggested shop added and watched')
  })
})
