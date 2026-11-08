import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const ready = (page) => page.waitForFunction(() => document.documentElement.dataset.scene === 'ready')
// The 3D door story sits below the opening screen: tests start with the story at the top of the viewport and
// measure scroll positions from the story's own start.
async function open(page, qs = '') {
  await page.goto('/?debug' + qs)
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo({ top: Math.ceil(document.querySelector('.hero').getBoundingClientRect().top + scrollY), behavior: 'instant' }) })
  await ready(page)
  await page.waitForTimeout(2200) // entrance animation and first settled frame
  // the story hydrates when the page is idle, so its entrance animation can start late on a busy machine
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.target?.closest?.('.hero') && a.effect.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))))
}
// Pixel comparison with an explicit bound: the occlusion pass dithers, so identical states can differ by 1 level in a few pixels.
async function frameDiff(page, a, b) {
  return page.evaluate(async ([A, B]) => {
    const load = async (s) => { const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data }
    const x = await load(A), y = await load(B)
    let px = 0, max = 0
    for (let i = 0; i < x.length; i += 4) { const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])); if (d > 0) { px++; if (d > max) max = d } }
    return { px, max, total: x.length / 4 }
  }, [a.toString('base64'), b.toString('base64')])
}
const instantScroll = (page) => page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
// Back at the start: the story begins at a fractional offset and scroll positions are whole pixels, so "start"
// means less than 1.5 px of story scroll (p x story length), not an exact zero.
const atStart = (page) => page.evaluate(() => { const h = document.querySelector('.hero'); return window.__story.p * (h.offsetHeight - h.querySelector('.stage').offsetHeight) })
const scrollTo = async (page, y, wait = 1800) => { await page.evaluate((v) => window.scrollTo({ top: Math.ceil(document.querySelector('.hero').getBoundingClientRect().top + scrollY) + v, behavior: 'instant' }), y); await page.waitForTimeout(wait) }

// ---------- scroll story ----------
test('scrolling forward then back restores the opening exactly', async ({ page }) => {
  await open(page)
  await instantScroll(page)
  // the CTA row's text can be rasterised on its own layer while its entrance animation fills forwards, which
  // changes antialiasing only; mask it so the check stays about the 3D frame and layout
  const shot = () => page.screenshot({ mask: [page.locator('.hero .actions')], maskColor: '#000' })
  const before = await shot()
  const max = await page.evaluate(() => document.querySelector('.hero').offsetHeight - innerHeight)
  await scrollTo(page, max * 0.3)
  await scrollTo(page, max * 0.6)
  expect(await page.evaluate(() => window.__story.p)).toBeGreaterThan(0.5)
  await scrollTo(page, max * 0.95)
  expect(await page.evaluate(() => window.__story.p)).toBeGreaterThan(0.9)
  await scrollTo(page, max * 0.3)
  await scrollTo(page, 0, 2500)
  expect(await atStart(page), 'px of story left after scrolling back').toBeLessThan(1.5)
  await page.waitForTimeout(1000)
  const after = await shot()
  const d = await frameDiff(page, before, after)
  expect(d.max, 'largest per-channel difference after the round trip').toBeLessThanOrEqual(2)
  expect(d.px / d.total, 'share of pixels that differ at all').toBeLessThan(0.002)
  expect(await page.evaluate(() => [...document.querySelectorAll('.chapter')].map((c) => getComputedStyle(c).visibility))).toEqual(['visible', 'hidden', 'hidden', 'hidden'])
})

test('real mouse wheel drives the story on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel input is a desktop path')
  await open(page)
  for (let i = 0; i < 18; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(40) }
  await page.waitForTimeout(1500)
  const p = await page.evaluate(() => window.__story.p)
  expect(p).toBeGreaterThan(0.1)
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(30) }
  await page.waitForTimeout(1800)
  expect(await atStart(page), 'px of story left after scrolling back').toBeLessThan(1.5)
})

test('exploration can be skipped: range and enquiry are reachable at any point', async ({ page }) => {
  await open(page)
  await instantScroll(page)
  const max = await page.evaluate(() => document.querySelector('.hero').offsetHeight - innerHeight)
  await scrollTo(page, max * 0.5)
  await expect(page.locator('.nav').getByRole('link', { name: 'Enquire', exact: true })).toBeVisible() // header, mid-story
  await page.getByRole('link', { name: 'Skip to content' }).focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  expect(await page.evaluate(() => location.hash)).toBe('#top')
  await page.locator('.nav').getByRole('link', { name: 'Enquire', exact: true }).click()
  await expect(page).toHaveURL(/\/enquiry\/$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Request a quotation.' })).toBeVisible()
})

test('finish control changes the metal and is keyboard operable', async ({ page }) => {
  await open(page)
  await page.getByRole('radio', { name: 'Satin nickel' }).focus()
  await page.keyboard.press('Space')
  expect(await page.evaluate(() => window.__story.finish)).toBe('nickel')
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => window.__story.finish)).toBe('bronze')
})

test('press the lever button moves the lever and releases it', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Press the lever' }).click()
  await page.waitForTimeout(250)
  expect(await page.evaluate(() => window.__story.manual)).toBeGreaterThan(0.5)
  await page.waitForTimeout(1400)
  expect(await page.evaluate(() => window.__story.manual)).toBeLessThan(0.05)
})

// ---------- product showcases ----------
const CATEGORIES = [
  ['Door locks', /satin brass lever handle/],
  ['Digital locks', /digital door lock/],
  ['Door closers', /overhead door closer/],
  ['Door fittings', /pair of brass hinges/],
]
test('pressing the lever, by button or on the handle itself, never stops scrolling from driving the story', async ({ page, isMobile }) => {
  await open(page)
  await instantScroll(page)
  const max = await page.evaluate(() => document.querySelector('.hero').offsetHeight - innerHeight)
  const story = () => page.evaluate(() => ({ p: window.__story.p, manual: window.__story.manual }))
  // 1. the "Press the lever" button, then scroll
  await page.getByRole('button', { name: 'Press the lever' }).click()
  await page.waitForTimeout(1300)
  await scrollTo(page, max * 0.6)
  expect((await story()).p, 'story follows scroll after the button press').toBeGreaterThan(0.5)
  // 2. a direct press on the handle at the top of the page, then scroll
  await scrollTo(page, 0, 2500)
  if (isMobile) await page.touchscreen.tap(260, 462)
  else {
    await page.mouse.move(1100, 375)
    await page.mouse.down()
    await expect.poll(async () => (await story()).manual, 'lever goes down under the pointer').toBe(1)
    await page.mouse.up()
    await expect.poll(async () => (await story()).manual, 'lever springs back on release, even though it moved away from the cursor').toBe(0)
  }
  await page.waitForTimeout(900)
  await scrollTo(page, max * 0.6)
  expect((await story()).p, 'story follows scroll after pressing the handle').toBeGreaterThan(0.5)
  await scrollTo(page, max * 0.95)
  expect((await story()).p).toBeGreaterThan(0.9)
  await scrollTo(page, 0, 2500)
  expect(await atStart(page), 'px of story left after scrolling back').toBeLessThan(1.5)
})

test('four image-led showcases: real images, headings, one sentence, own enquiry button', async ({ page }) => {
  await open(page)
  const cards = page.locator('#range article.show')
  await expect(cards).toHaveCount(4)
  for (const [i, [title, alt]] of CATEGORIES.entries()) {
    const card = cards.nth(i)
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByRole('heading', { level: 3, name: title })).toBeVisible()
    await expect(card.locator('p')).toHaveCount(1)
    const img = card.getByRole('img', { name: alt })
    await expect(img).toBeVisible()
    await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 200 && el.currentSrc.length > 0), `image for ${title} decoded`).toBe(true)
    expect(await img.getAttribute('width'), 'reserved space').toBe('1200')
    await expect(card.getByRole('button', { name: `Enquire about ${title.toLowerCase()}` })).toBeVisible()
  }
  await expect(page.getByText(/not photographs of Birdi/)).toBeVisible()
})

test('showcase plates tilt toward the pointer, and stay still with reduced motion', async ({ page, isMobile }) => {
  test.skip(isMobile, 'pointer tilt needs a mouse')
  const transformOf = (pg) => pg.evaluate(() => getComputedStyle(document.querySelector('.show-plate .tilted-card__body')).transform)
  await open(page)
  await page.evaluate(() => document.querySelector('#range').scrollIntoView())
  await page.waitForTimeout(2500)
  const box = await page.locator('.show-plate').first().boundingBox()
  const rest = await transformOf(page)
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.2)
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.75, { steps: 10 })
  await page.waitForTimeout(900)
  expect(await transformOf(page), 'plate tilts under the pointer').not.toBe(rest)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate(() => document.querySelector('#range').scrollIntoView())
  await page.waitForTimeout(2500)
  const box2 = await page.locator('.show-plate').first().boundingBox()
  const still = await transformOf(page)
  await page.mouse.move(box2.x + box2.width * 0.15, box2.y + box2.height * 0.2)
  await page.mouse.move(box2.x + box2.width * 0.85, box2.y + box2.height * 0.75, { steps: 10 })
  await page.waitForTimeout(900)
  expect(await transformOf(page), 'no tilt with reduced motion').toBe(still)
})

test('showcases do not depend on hover and keep their layout stable', async ({ page }) => {
  await open(page)
  const card = page.locator('#range article.show').first()
  await card.scrollIntoViewIfNeeded()
  const before = await card.boundingBox()
  await page.locator('#range img').first().evaluate((el) => el.scrollIntoView())
  await page.waitForTimeout(600)
  const after = await card.boundingBox()
  expect(Math.abs(before.width - after.width)).toBeLessThan(1)
  await expect(card.getByRole('button', { name: /Enquire about/ })).toBeVisible() // visible without hovering
})

test('the range heading is not hidden by the header after using the nav link or skip link', async ({ page, isMobile }) => {
  await open(page)
  await page.locator('.hero').getByRole('link', { name: 'Browse the range' }).first().click()
  await page.waitForTimeout(1800)
  const m = await page.evaluate(() => ({ h: document.querySelector('#range h2').getBoundingClientRect().top, nav: document.querySelector('.nav').getBoundingClientRect().bottom }))
  expect(m.h).toBeGreaterThan(m.nav + 20)
})

// ---------- enquiry dialog ----------
// matches only the mock API request, never the page URL that carries it in its query string
const isMock = (url) => new URL(url).pathname === '/mock-enquiry'
const dlg = (page) => page.getByRole('dialog', { name: 'Enquire about hardware' })
// Touch screens get the title focused (no keyboard thrown up over the form); mouse and keyboard users land in the Name field.
const initialFocus = async (page) => ((await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) ? dlg(page).locator('#enq-h') : dlg(page).locator('#f-name'))
const openDialog = async (page) => { await page.getByRole('button', { name: 'Enquire', exact: true }).first().click(); await expect(dlg(page)).toBeVisible(); await expect(await initialFocus(page)).toBeFocused() }

test('enquiry dialog: focus, labels, Escape and focus return', async ({ page }) => {
  await open(page)
  const opener = page.getByRole('button', { name: 'Enquire', exact: true }).first()
  await opener.click()
  await expect(await initialFocus(page)).toBeFocused()
  for (const [id, name] of [['f-name', 'Name'], ['f-phone', 'Phone'], ['f-email', 'Email'], ['f-cat', 'Interested in'], ['f-biz', 'Business name'], ['f-qty', 'Quantity'], ['f-unit', 'Unit'], ['f-city', 'Delivery city'], ['f-msg', 'Requirements']]) {
    await expect(dlg(page).locator(`label[for="${id}"]`), `persistent label for ${name}`).toContainText(name)
    await expect(dlg(page).locator(`#${id}`)).toBeVisible()
  }
  await expect(dlg(page).getByText('(required)').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dlg(page)).toBeHidden()
  await expect(opener).toBeFocused()
})

test('enquiry dialog: closes from the close button and the backdrop', async ({ page, isMobile }) => {
  await open(page)
  await openDialog(page)
  await page.getByRole('button', { name: 'Close enquiry' }).click()
  await expect(dlg(page)).toBeHidden()
  test.skip(isMobile, 'the sheet fills the screen on phones, so there is no backdrop to tap')
  await openDialog(page)
  await page.mouse.click(5, 5)
  await expect(dlg(page)).toBeHidden()
})

test('enquiry dialog: empty submit explains what to fix and focuses the first problem', async ({ page }) => {
  await open(page)
  await openDialog(page)
  await dlg(page).getByRole('button', { name: 'Continue on WhatsApp' }).click()
  // WhatsApp already gives the shop the visitor's number, so only the name is required on this route
  await expect(dlg(page).getByRole('alert')).toContainText('1 field needs attention')
  await expect(dlg(page).getByText('Enter your name.')).toBeVisible()
  await expect(dlg(page).locator('#f-name')).toBeFocused()
  await expect(dlg(page).locator('#f-name')).toHaveAttribute('aria-invalid', 'true')
})

test('enquiry dialog: phone and email checks accept international numbers and say what is wrong', async ({ page }) => {
  await open(page)
  await openDialog(page)
  const phone = dlg(page).getByLabel('Phone')
  const email = dlg(page).getByLabel('Email')
  await phone.fill('abc')
  await phone.blur()
  await expect(dlg(page).getByText(/Enter 7 to 15 digits/)).toBeVisible()
  await phone.fill('+44 (0)20 7946 0958')
  await phone.blur()
  await expect(dlg(page).getByText(/Enter 7 to 15 digits/)).toHaveCount(0)
  await phone.fill('98765 43210')
  await phone.blur()
  await expect(dlg(page).getByText(/Enter 7 to 15 digits/)).toHaveCount(0)
  await email.fill('not-an-email')
  await email.blur()
  await expect(dlg(page).getByText(/Enter an email like name@example.com/)).toBeVisible()
  await email.fill('buyer@example.in')
  await email.blur()
  await expect(dlg(page).getByText(/Enter an email like name@example.com/)).toHaveCount(0)
})

test('enquiry dialog: a field error appearing on blur never shifts the form', async ({ page }) => {
  await open(page)
  await openDialog(page)
  // The submit bar is sticky, so measure the last field and the form height instead of the button.
  const layout = () => page.evaluate(() => { const f = document.querySelector('.enq'); const top = f.getBoundingClientRect().top; return { h: f.getBoundingClientRect().height, msg: document.querySelector('#f-msg').getBoundingClientRect().top - top, qty: document.querySelector('#f-qty').getBoundingClientRect().top - top } })
  const before = await layout()
  await dlg(page).getByLabel('Phone').fill('abc')
  await dlg(page).getByLabel('Email').fill('nope')
  await dlg(page).getByLabel('Quantity').fill('0')
  await dlg(page).locator('#f-name').focus()
  await expect(dlg(page).getByText(/Enter 7 to 15 digits/)).toBeVisible()
  await expect(dlg(page).getByText(/Enter an email like name@example.com/)).toBeVisible()
  await expect(dlg(page).getByText(/Whole number, 1 to 100000/)).toBeVisible()
  const after = await layout()
  expect(Math.abs(after.h - before.h), 'form height').toBeLessThan(1)
  expect(Math.abs(after.qty - before.qty), 'quantity field position').toBeLessThan(1)
  expect(Math.abs(after.msg - before.msg), 'requirements field position').toBeLessThan(1)
})

test('enquiry dialog: without a server destination it hands off to WhatsApp and never claims success', async ({ page }) => {
  // record window.open instead of leaving for WhatsApp; nothing is ever sent from the test
  await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null } })
  let posts = 0
  page.on('request', (r) => { if (r.method() === 'POST') posts++ })
  await open(page)
  await page.locator('.show').first().getByRole('button', { name: /Enquire about/ }).click()
  await expect(dlg(page)).toBeVisible()
  await dlg(page).locator('#f-name').fill('Demo visitor')
  await dlg(page).getByLabel('Requirements').fill('Two lever sets')
  await dlg(page).getByRole('button', { name: 'Continue on WhatsApp' }).click()
  await expect(dlg(page).getByRole('status')).toContainText('Nothing is sent until you press send there')
  const opened = await page.evaluate(() => window.__opened)
  expect(opened).toHaveLength(1)
  expect(opened[0]).toMatch(/^https:\/\/wa\.me\/916284505353\?text=/)
  const text = decodeURIComponent(opened[0].split('?text=')[1])
  expect(text).toContain('Hi Birdi Hardwares, I’m interested in Door locks. Please share availability and a quotation.')
  expect(text).toContain('Notes: Two lever sets')
  expect(text).toContain('Name: Demo visitor')
  await expect(dlg(page)).not.toContainText(/received|thank you|message sent/i)
  await expect(dlg(page).getByLabel('Requirements')).toHaveValue('Two lever sets') // values are kept
  expect(posts).toBe(0)
})

test('enquiry dialog: real send shows a loading state, blocks duplicates, and confirms only after success', async ({ page }) => {
  let calls = 0, body = null
  await page.route(isMock, async (route) => { calls++; body = route.request().postDataJSON(); await new Promise((r) => setTimeout(r, 700)); await route.fulfill({ status: 200, body: '{}' }) })
  await open(page, '&enquiryEndpoint=/mock-enquiry')
  await openDialog(page)
  await expect(dlg(page).getByRole('note')).toHaveCount(0) // no demo banner when a destination exists
  await dlg(page).locator('#f-name').fill('Real visitor')
  await dlg(page).getByLabel('Phone').fill('+91 98765 43210')
  await dlg(page).getByLabel('Quantity').fill('6')
  const send = dlg(page).getByRole('button', { name: 'Send enquiry' })
  await send.dblclick()
  await expect(dlg(page).getByRole('button', { name: /Sending/ })).toBeDisabled()
  await expect(page.getByRole('dialog', { name: 'Enquiry received' }).getByRole('heading', { name: 'Enquiry received' })).toBeVisible() // the dialog's name follows its heading
  expect(calls, 'exactly one request').toBe(1)
  expect(body).toMatchObject({ name: 'Real visitor', phone: '+91 98765 43210', quantity: '6', unit: 'pieces' })
})

test('enquiry dialog: a failed send keeps the details and allows a retry', async ({ page }) => {
  let n = 0
  await page.route(isMock, (route) => (++n === 1 ? route.fulfill({ status: 500, body: 'no' }) : route.fulfill({ status: 200, body: '{}' })))
  await open(page, '&enquiryEndpoint=/mock-enquiry')
  await openDialog(page)
  await dlg(page).locator('#f-name').fill('Retry visitor')
  await dlg(page).getByLabel('Email').fill('retry@example.com')
  await dlg(page).getByLabel('Delivery city').fill('Ludhiana')
  await dlg(page).getByRole('button', { name: 'Send enquiry' }).click()
  await expect(dlg(page).getByRole('alert')).toContainText('could not be sent')
  await expect(dlg(page)).not.toContainText('Enquiry received')
  await expect(dlg(page).getByLabel('Delivery city')).toHaveValue('Ludhiana')
  await expect(dlg(page).getByRole('button', { name: 'Send enquiry' })).toBeEnabled()
  await dlg(page).getByRole('button', { name: 'Send enquiry' }).click()
  await expect(page.getByRole('dialog', { name: 'Enquiry received' }).getByRole('heading', { name: 'Enquiry received' })).toBeVisible() // the dialog's name follows its heading
})

test('enquiry dialog: a network failure is reported as a failure', async ({ page }) => {
  await page.route(isMock, (route) => route.abort())
  await open(page, '&enquiryEndpoint=/mock-enquiry')
  await openDialog(page)
  await dlg(page).locator('#f-name').fill('Offline visitor')
  await dlg(page).getByLabel('Phone').fill('9876543210')
  await dlg(page).getByRole('button', { name: 'Send enquiry' }).click()
  await expect(dlg(page).getByRole('alert')).toContainText('could not be sent')
})

test('each showcase button pre-selects its own category in the enquiry', async ({ page }) => {
  await open(page)
  for (const [title] of CATEGORIES) {
    const btn = page.getByRole('button', { name: `Enquire about ${title.toLowerCase()}` })
    await btn.scrollIntoViewIfNeeded()
    await btn.click()
    await expect(dlg(page).getByLabel('Interested in')).toHaveValue(title)
    await page.keyboard.press('Escape')
    await expect(dlg(page)).toBeHidden()
  }
})

// ---------- robustness ----------
test('no console errors or page errors', async ({ page }) => {
  const bad = []
  page.on('console', (m) => { if (m.type() === 'error') bad.push(m.text()) })
  page.on('pageerror', (e) => bad.push(e.message))
  await open(page)
  await instantScroll(page)
  await scrollTo(page, 900, 900)
  await scrollTo(page, await page.evaluate(() => document.querySelector('#range').offsetTop), 1200)
  expect(bad).toEqual([])
})

test('no horizontal overflow at common widths', async ({ page }) => {
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('/')
    await page.waitForLoadState('load')
    await instantScroll(page)
    const total = await page.evaluate(() => document.documentElement.scrollHeight)
    for (const y of [0, Math.round(total / 2), total]) {
      await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y)
      await page.waitForTimeout(150)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${w}px at ${y}`).toBeLessThanOrEqual(0)
    }
  }
})

test('3D off shows the illustration and keeps the page usable', async ({ page }) => {
  await page.goto('/?3d=off')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hardware for doors, cabinets and wardrobes.')
  await expect(page.getByRole('heading', { level: 2, name: 'Details that define an entrance.' })).toBeAttached()
  await expect(page.locator('.fallback').getByRole('img', { name: /walnut door/ })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByText(/3D preview is not available/)).toBeVisible()
  await page.getByRole('button', { name: 'Enquire', exact: true }).first().click()
  await expect(dlg(page)).toBeVisible()
})

test('reduced motion: static pose, view buttons, no entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  const sizes = await page.evaluate(() => [document.querySelector('.hero').offsetHeight, innerHeight])
  expect(sizes[0]).toBe(sizes[1])
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.rise .w > span')).transform)).toBe('none')
  await page.getByRole('button', { name: 'Door ajar' }).click()
  expect(await page.evaluate(() => window.__story.p)).toBe(0.8)
})

test('keyboard reaches the main controls in a sensible order', async ({ page }) => {
  await open(page)
  const seen = []
  for (let i = 0; i < 80; i++) { // header, opening screen actions and category links, catalogue tiles, then the 3D story controls
    await page.keyboard.press('Tab')
    seen.push(await page.evaluate(() => (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || document.activeElement.value || '').trim().slice(0, 60)))
  }
  expect(seen[0]).toBe('Skip to content')
  expect(seen[1]).toMatch(/^Birdi Hardwares.*home/)
  expect(seen).toContain('Enquire')
  expect(seen).toContain('Press the lever')
})

test('automated accessibility scan: page and open dialog have no serious or critical issues', async ({ page }) => {
  await open(page)
  const scan = async () => (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
  expect(await scan()).toEqual([])
  await openDialog(page)
  await page.evaluate(() => Promise.all(document.querySelector('dialog').getAnimations().map((a) => a.finished))) // axe must not sample the fade-in
  expect(await scan()).toEqual([])
})

// ---------- visual baselines ----------
// The earlier look was rejected. A new baseline is recorded only after the redesign is approved:
//   VISUAL=1 npx playwright test --update-snapshots -g "visual baseline"   (first run, after approval)
//   VISUAL=1 npx playwright test -g "visual baseline"                       (afterwards; STRICT=1 for zero tolerance)
const visual = !!process.env.VISUAL
test.describe('visual baseline (approved look only)', () => {
  test.skip(!visual, 'no approved baseline yet')
  test('hero frames', async ({ page }) => {
    await open(page)
    for (const p of [0, 0.22, 0.48, 0.82, 1]) {
      await page.evaluate((v) => { window.__story.p = v; window.__story.render() }, p)
      await page.waitForTimeout(900)
      await expect(page).toHaveScreenshot(`p${String(Math.round(p * 100)).padStart(3, '0')}.png`)
    }
  })
  test('range section', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }) // the plates' tilt-in is time-based; the layout baseline must not depend on it
    await open(page)
    await page.evaluate(async () => { for (const im of document.images) im.loading = 'eager'; await Promise.all([...document.images].map((im) => im.decode().catch(() => {}))) })
    await page.evaluate(() => document.querySelector('#range').scrollIntoView())
    await page.addStyleTag({ content: '.nav, .skip, .wa-fab { visibility: hidden !important }' }) // fixed header and WhatsApp shortcut would be stitched into the middle of a tall element shot
    await page.waitForTimeout(1500)
    await expect(page.locator('#range')).toHaveScreenshot('range.png')
  })
  test('enquiry dialog', async ({ page }) => {
    await open(page)
    await openDialog(page)
    await page.evaluate(() => Promise.all(document.querySelector('dialog').getAnimations().map((a) => a.finished)))
    await expect(page.locator('dialog.enquiry')).toHaveScreenshot('dialog.png')
  })
})

test('the 3D scene keeps drawing while the story scrolls (both quality tiers)', async ({ page }) => {
  // counts WebGL draw calls: a frozen canvas (nothing redrawn on scroll) once slipped past every screenshot test
  await page.addInitScript(() => {
    window.__draws = 0
    const P = WebGL2RenderingContext.prototype
    for (const k of ['drawElements', 'drawArrays']) { const o = P[k]; P[k] = function (...a) { window.__draws++; return o.apply(this, a) } }
  })
  await open(page)
  await page.waitForTimeout(1500)
  const before = await page.evaluate(() => window.__draws)
  const max = await page.evaluate(() => document.querySelector('.hero').offsetHeight - innerHeight)
  await page.evaluate((y) => window.scrollTo({ top: document.querySelector('.hero').offsetTop + y, behavior: 'instant' }), max * 0.6)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => window.__draws), 'draw calls after scrolling into the story').toBeGreaterThan(before + 50)
})

// ---------- opening screen (above the 3D story) ----------
test('opening screen says what, where and how to ask, with category links and a working motion clip', async ({ page, context }) => {
  await context.route(/https:\/\/(wa\.me|api\.whatsapp\.com)\//, (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'intercepted' }))
  await page.goto('/')
  const intro = page.locator('.intro')
  await expect(intro.getByRole('heading', { level: 1 })).toHaveText('Hardware for doors, cabinets and wardrobes.')
  await expect(intro.getByText('Lakkar Bazar, Ludhiana', { exact: true })).toBeVisible()
  await expect(intro.getByRole('link', { name: 'Browse the catalogue' })).toHaveAttribute('href', '/catalogue/')
  await expect(intro.getByRole('link', { name: /Ask on WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/916284505353\?text=/)
  await expect(intro.getByRole('link', { name: 'Call +91 62845 05353' })).toHaveAttribute('href', 'tel:+916284505353')
  await expect(intro.getByRole('navigation', { name: 'Categories' }).getByRole('link')).toHaveCount(15) // one per catalogue category
  await expect(intro.locator('figcaption')).toContainText('Not a photograph of Birdi')
  // a phone must not be zoomed out by anything wider than the screen (the category row scrolls on its own)
  expect(await page.evaluate(() => innerWidth)).toBe(page.viewportSize().width)
  // the clip loads only once on screen and actually plays (poster stays underneath)
  await expect.poll(() => page.evaluate(() => { const v = document.querySelector('.intro-video'); return v && !v.paused && v.currentTime > 0.2 }), { timeout: 15000 }).toBe(true)
  // looping motion can be paused and resumed (WCAG 2.2.2), and stays paused while scrolled away and back
  const toggle = intro.getByRole('button', { name: 'Pause the lever animation' })
  await toggle.click()
  await expect(intro.getByRole('button', { name: 'Play the lever animation' })).toBeVisible()
  expect(await page.evaluate(() => document.querySelector('.intro-video').paused)).toBe(true)
  await page.evaluate(() => { window.scrollTo({ top: 3000, behavior: 'instant' }) }); await page.waitForTimeout(400)
  await page.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }); await page.waitForTimeout(600)
  expect(await page.evaluate(() => document.querySelector('.intro-video').paused), 'a pause by the visitor sticks').toBe(true)
  await intro.getByRole('button', { name: 'Play the lever animation' }).click()
  await expect.poll(() => page.evaluate(() => !document.querySelector('.intro-video').paused)).toBe(true)
  // no layout shift from the media: the frame keeps its size before and after playback
  const box = await page.locator('.intro-frame').boundingBox()
  expect(box.width).toBeGreaterThan(200)
})

test('opening screen keeps a sharp still when the clip cannot play', async ({ page }) => {
  await page.route(/hero-lever(-600)?\.(webm|mp4)/, (r) => r.abort())
  await page.goto('/')
  await expect(page.locator('.intro-poster')).toBeVisible()
  expect(await page.locator('.intro-poster').evaluate((im) => im.complete && im.naturalWidth)).toBeGreaterThan(800)
  await page.waitForTimeout(2500)
  expect(await page.locator('.intro-video.is-playing').count()).toBe(0)
})

test('reduced motion: the opening clip never starts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.waitForTimeout(2000)
  expect(await page.evaluate(() => { const v = document.querySelector('.intro-video'); return !v || (v.paused && !v.currentSrc) })).toBe(true)
})
