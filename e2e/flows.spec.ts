import { expect, test, type Page, type TestInfo } from '@playwright/test'

// Every person, account, amount and response here is fictional, as in the prototype.

async function shot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot(), contentType: 'image/png' })
}

const pauseDialog = (page: Page) => page.getByRole('alertdialog', { name: 'รายการนี้ยังไม่ถูกโอน' })

async function openScenario(page: Page, amountLabel: RegExp) {
  await page.goto('/')
  await page.getByRole('button', { name: amountLabel }).click()
}

async function reviewAndContinue(page: Page) {
  await page.getByRole('button', { name: 'ตรวจสอบรายการ' }).click()
  await page.getByRole('button', { name: 'ดำเนินการต่อ' }).click()
}

async function saveSettings(page: Page, { confirmIdentity = false } = {}) {
  await page.getByRole('button', { name: 'บันทึกในตัวอย่าง' }).click()
  if (confirmIdentity) await page.getByRole('button', { name: 'ยืนยันตัวตนและบันทึก (จำลอง)' }).click()
}

async function setLevel(page: Page, level: RegExp, options?: { confirmIdentity?: boolean }) {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name: 'ตั้งค่า' }).click()
  await page.getByRole('button', { name: level }).click()
  await saveSettings(page, options)
}

function answer(page: Page, question: string, value: 'ใช่' | 'ไม่ใช่') {
  return page.getByRole('group', { name: question }).getByRole('button', { name: value, exact: true }).click()
}

test.describe('Warn level', () => {
  test('limit only: alarm, then calm, with salary context', async ({ page }, testInfo) => {
    await openScenario(page, /฿18,000/)
    await shot(page, testInfo, '1 transfer entry')
    await reviewAndContinue(page)
    const dialog = pauseDialog(page)
    await expect(dialog).toHaveClass(/alarm/)
    await expect(dialog.getByText('TrustGuard Triggered')).toBeVisible()
    await expect(dialog.getByText('ยอดโอนสะสมเดือนนี้ ฿18,000.00 ถึง Trusted Limit ฿15,000.00 ที่คุณตั้งไว้')).toBeVisible()
    await expect(dialog.getByText('64% ของเงินเดือน')).toBeVisible()
    await expect(dialog.getByText('โอนแล้วจะเหลือในบัญชี ฿10,000.00')).toBeVisible()
    await shot(page, testInfo, '2 Smart Pause alarm')
    await expect(dialog).toHaveClass(/calm/, { timeout: 4000 })
    await expect(dialog.getByText('หายใจลึก ๆ ไม่ต้องรีบ เงินยังอยู่กับคุณ')).toBeVisible()
    await shot(page, testInfo, '3 Smart Pause calm')
  })

  test('reopening a held transfer skips the alarm', async ({ page }, testInfo) => {
    await openScenario(page, /฿18,000/)
    await reviewAndContinue(page)
    await expect(pauseDialog(page)).toHaveClass(/calm/, { timeout: 4000 })
    await page.getByRole('button', { name: 'กลับไปตรวจสอบรายการ' }).click()
    await shot(page, testInfo, '1 review behind the held pause')
    await page.getByRole('button', { name: 'กลับไปดูคำเตือน' }).click()
    await expect(pauseDialog(page)).toHaveClass(/calm/)
    await shot(page, testInfo, '2 reopened without shake')
  })

  test('no contact response: wait, warning, hold to continue', async ({ page }, testInfo) => {
    await openScenario(page, /฿18,000/)
    await reviewAndContinue(page)
    const dialog = pauseDialog(page)
    await expect(dialog.getByRole('button', { name: 'ยืนยันดำเนินการต่อ' })).toBeDisabled()
    await dialog.getByRole('button', { name: 'ข้ามเวลารอ 2 นาที (เฉพาะการทดลอง)' }).click()
    await expect(dialog.getByText('ยังไม่ได้รับความเห็นจากมิน')).toBeVisible()
    await shot(page, testInfo, '1 wait over, no response')
    await dialog.getByRole('button', { name: 'ยืนยันดำเนินการต่อ' }).click()
    const confirm = page.getByRole('alertdialog', { name: 'ยังต้องการดำเนินการต่อหรือไม่?' })
    await expect(confirm.getByText('ตอนนี้มินยังไม่ได้ตอบ')).toBeVisible()
    await shot(page, testInfo, '2 second confirmation')
    const hold = confirm.getByRole('button', { name: /กดค้าง 3 วินาที/ })
    await hold.click()
    await expect(confirm).toBeVisible()
    await hold.hover()
    await page.mouse.down()
    await page.waitForTimeout(1500)
    await shot(page, testInfo, '3 holding to continue')
    await page.waitForTimeout(1800)
    await page.mouse.up()
    await expect(page.getByRole('heading', { name: 'คุณเลือกดำเนินการต่อ' })).toBeVisible()
    await shot(page, testInfo, '4 outcome: sender continued')
  })

  test('contact is concerned, sender stops', async ({ page }, testInfo) => {
    await openScenario(page, /฿18,000/)
    await reviewAndContinue(page)
    await pauseDialog(page).getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' }).click()
    await expect(page.getByText('฿XX,XXX')).toBeVisible()
    await expect(page.getByText('฿18,000.00')).toHaveCount(0)
    await expect(page.getByText('ค่าจองสินค้า')).toBeVisible()
    await shot(page, testInfo, '1 contact view, amount masked')
    await page.getByRole('button', { name: 'ฉันกังวล ขอให้หยุดโอนแล้วคุยกันก่อน' }).click()
    await expect(pauseDialog(page).getByText('มินกังวล และขอให้หยุดโอนแล้วคุยกันก่อน')).toBeVisible()
    await shot(page, testInfo, '2 pause shows concern')
    await pauseDialog(page).getByRole('button', { name: 'หยุดการโอนไว้ก่อน' }).click()
    await expect(page.getByRole('heading', { name: 'ยกเลิกรายการแล้ว' })).toBeVisible()
    await shot(page, testInfo, '3 outcome: cancelled')
  })

  test('contact sees no concern', async ({ page }, testInfo) => {
    await openScenario(page, /฿18,000/)
    await reviewAndContinue(page)
    await pauseDialog(page).getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' }).click()
    await page.getByRole('button', { name: 'ยังไม่พบข้อกังวลจากข้อมูลที่เห็น' }).click()
    await expect(pauseDialog(page).getByText('มินยังไม่พบข้อกังวลจากข้อมูลที่เห็น')).toBeVisible()
    await shot(page, testInfo, '1 pause shows advice; wait still applies')
  })

  test('self-check flags a scam signal and the contact calls back', async ({ page }, testInfo) => {
    await openScenario(page, /฿18,000/)
    await reviewAndContinue(page)
    const dialog = pauseDialog(page)
    await answer(page, 'ตอนนี้มีคนอยู่ในสายหรือแชตกับคุณไหม', 'ใช่')
    await answer(page, 'มีคนบอกให้เก็บเรื่องนี้เป็นความลับไหม', 'ไม่ใช่')
    await expect(dialog.getByText('นี่คือสัญญาณที่มิจฉาชีพใช้บ่อย')).toBeVisible()
    await shot(page, testInfo, '1 escalated warning')
    await dialog.getByRole('button', { name: 'ขอให้มินโทรหาฉันตอนนี้' }).click()
    await expect(dialog.getByText('ส่งคำขอให้มินโทรหาคุณแล้ว (จำลอง)')).toBeVisible()
    await shot(page, testInfo, '2 callback requested')
    await dialog.getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' }).click()
    await expect(page.getByText('พลอยขอให้คุณโทรหาตอนนี้')).toBeVisible()
    await expect(page.getByText('มีคนอยู่ในสายหรือแชตกับพลอย')).toBeVisible()
    await shot(page, testInfo, '3 contact sees callback and answers')
    await page.getByRole('button', { name: 'โทรหาพลอย (จำลอง)' }).click()
    await expect(pauseDialog(page).getByText('มินกำลังโทรหาคุณ (จำลอง) · รับสายก่อนตัดสินใจ')).toBeVisible()
    await shot(page, testInfo, '4 sender sees incoming call')
  })

  test('typed purpose reaches the contact', async ({ page }, testInfo) => {
    await openScenario(page, /฿18,000/)
    await page.getByLabel('โอนไปเพื่ออะไร').fill('มัดจำห้องเช่าคอนโด')
    await shot(page, testInfo, '1 sender types purpose')
    await reviewAndContinue(page)
    await pauseDialog(page).getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' }).click()
    await expect(page.getByText('มัดจำห้องเช่าคอนโด')).toBeVisible()
    await shot(page, testInfo, '2 contact sees purpose')
  })
})

test.describe('Other scenarios', () => {
  test('split transfers reach the limit together', async ({ page }, testInfo) => {
    await openScenario(page, /฿6,000/)
    await reviewAndContinue(page)
    const dialog = pauseDialog(page)
    await expect(dialog.getByText('ยอดโอนสะสมเดือนนี้ ฿18,000.00 ถึง Trusted Limit ฿15,000.00 ที่คุณตั้งไว้')).toBeVisible()
    await expect(dialog.getByText('21% ของเงินเดือน')).toBeVisible()
    await shot(page, testInfo, '1 third ฿6,000 transfer pauses')
  })

  test('ordinary high-value purchase still pauses (friction check)', async ({ page }, testInfo) => {
    await openScenario(page, /฿22,000/)
    await reviewAndContinue(page)
    const dialog = pauseDialog(page)
    await expect(dialog.getByText('79% ของเงินเดือน')).toBeVisible()
    // Zone comes from Settings, not the scenario's own zoneStatus (existing prototype behavior).
    await expect(dialog.getByText('คุณอยู่ใน Trusted Zone')).toBeVisible()
    await shot(page, testInfo, '1 laptop purchase pause')
  })

  test('outside Trusted Zone asks the contact to call first', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name: 'ตั้งค่า' }).click()
    await page.getByLabel('สถานะตำแหน่งสำหรับการทดลอง').selectOption('outside')
    await saveSettings(page)
    await page.getByRole('button', { name: /฿18,000/ }).click()
    await reviewAndContinue(page)
    await expect(pauseDialog(page).getByText('คุณอยู่นอก Trusted Zone').first()).toBeVisible()
    await shot(page, testInfo, '1 pause outside zone')
    await pauseDialog(page).getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' }).click()
    await expect(page.getByText('ผู้โอนอยู่นอก Trusted Zone')).toBeVisible()
    await shot(page, testInfo, '2 contact prompted to call')
  })
})

test.describe('Approval required', () => {
  test('contact approves, sender continues', async ({ page }, testInfo) => {
    await setLevel(page, /^ต้องได้รับอนุมัติ/)
    await page.getByRole('button', { name: /฿18,000/ }).click()
    await reviewAndContinue(page)
    const dialog = pauseDialog(page)
    await expect(dialog.getByText('ต้องได้รับอนุมัติจากมิน')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'ดำเนินการต่อหลังได้รับอนุมัติ' })).toBeDisabled()
    await shot(page, testInfo, '1 waiting for approval')
    await dialog.getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' }).click()
    await shot(page, testInfo, '2 contact approval view')
    await page.getByRole('button', { name: 'อนุมัติรายการจำลอง' }).click()
    await pauseDialog(page).getByRole('button', { name: 'ดำเนินการต่อหลังได้รับอนุมัติ' }).click()
    await expect(page.getByRole('heading', { name: 'ได้รับอนุมัติในตัวอย่าง' })).toBeVisible()
    await shot(page, testInfo, '3 outcome: approved')
  })

  test('contact rejects, sender requests separate review', async ({ page }, testInfo) => {
    await setLevel(page, /^ต้องได้รับอนุมัติ/)
    await page.getByRole('button', { name: /฿18,000/ }).click()
    await reviewAndContinue(page)
    await pauseDialog(page).getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' }).click()
    await page.getByRole('button', { name: 'ไม่อนุมัติรายการ' }).click()
    await expect(pauseDialog(page).getByText('มินไม่อนุมัติรายการ')).toBeVisible()
    await shot(page, testInfo, '1 rejected')
    await pauseDialog(page).getByRole('button', { name: 'ขอให้ช่วยตรวจสอบผ่านเส้นทางแยก' }).click()
    await shot(page, testInfo, '2 recovery route')
    await page.getByRole('button', { name: 'ส่งคำขอจำลอง' }).click()
    await expect(page.getByRole('heading', { name: 'คำขออยู่ระหว่างรอ' })).toBeVisible()
    await shot(page, testInfo, '3 outcome: recovery pending')
  })
})

test.describe('Settings', () => {
  test('weakening protection needs identity confirmation; cancelling keeps it', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name: 'ตั้งค่า' }).click()
    await page.getByRole('button', { name: /^ปิด/ }).click()
    await page.getByLabel('วงเงินโอนสะสมต่อเดือน (บาท)').fill('50000')
    await page.getByRole('button', { name: 'บันทึกในตัวอย่าง' }).click()
    const auth = page.getByRole('alertdialog', { name: 'ยืนยันตัวตนก่อนลดการปกป้อง' })
    await expect(auth.getByText('ระดับการปกป้อง: เตือน → ปิด')).toBeVisible()
    await expect(auth.getByText('Trusted Limit: ฿15,000.00 → ฿50,000.00')).toBeVisible()
    await shot(page, testInfo, '1 identity check before weakening')
    await auth.getByRole('button', { name: 'คงการปกป้องเดิมไว้' }).click()
    await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name: 'หน้าหลัก' }).click()
    await expect(page.getByText('TrustGuard · เตือน')).toBeVisible()
    await shot(page, testInfo, '2 protection unchanged')
  })

  test('strengthening saves without a prompt; unsaved edits are discarded', async ({ page }) => {
    await setLevel(page, /^ต้องได้รับอนุมัติ/)
    await expect(page.getByText('TrustGuard · ต้องได้รับอนุมัติ')).toBeVisible()
    await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name: 'ตั้งค่า' }).click()
    await page.getByRole('button', { name: /^ปิด/ }).click()
    await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name: 'หน้าหลัก' }).click()
    await expect(page.getByText('TrustGuard · ต้องได้รับอนุมัติ')).toBeVisible()
  })

  test('Off after identity confirmation: transfer passes without a pause', async ({ page }, testInfo) => {
    await setLevel(page, /^ปิด/, { confirmIdentity: true })
    await page.getByRole('button', { name: /฿18,000/ }).click()
    await reviewAndContinue(page)
    await expect(page.getByRole('heading', { name: 'รายการผ่านขั้นตอนจำลอง' })).toBeVisible()
    await shot(page, testInfo, '1 outcome without Smart Pause')
  })

  test('without contact consent no one is notified', async ({ page }, testInfo) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('button', { name: 'ตั้งค่า' }).click()
    await page.getByLabel('คนนี้ยินยอมรับรายละเอียดจำกัดในตัวอย่าง').uncheck()
    await saveSettings(page, { confirmIdentity: true })
    await page.getByRole('button', { name: /฿18,000/ }).click()
    await reviewAndContinue(page)
    const dialog = pauseDialog(page)
    await expect(dialog.getByText('มินยังไม่ได้ยินยอม จึงไม่มีการแจ้งเตือน')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'เปิดมุมคนที่ไว้ใจ (จำลอง)' })).toHaveCount(0)
    await shot(page, testInfo, '1 pause without contact')
  })
})
