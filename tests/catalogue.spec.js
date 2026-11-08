// Product catalogue: inventory coverage, search, filters, product pages and variant-aware enquiries.
// Also the phone fixes to the 3D story (short screens, rotation, browser bar). Chrome emulation, not real devices.
import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const products = JSON.parse(fs.readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'))
const decodeWa = (href) => decodeURIComponent(href.split('?text=')[1])
const blockWhatsApp = (context) => context.route(/https:\/\/(wa\.me|api\.whatsapp\.com)\//, (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'intercepted' }))

test.describe('catalogue data', () => {
  test.skip(({ isMobile }) => isMobile, 'data checks run once')

  test('inventory matches the reconciliation and every product has a page in the sitemap', async ({ request }) => {
    expect(products.filter((p) => p.brand === 'FANCY')).toHaveLength(415)
    expect(products.filter((p) => p.brand === 'ROOT')).toHaveLength(37)
    expect(new Set(products.map((p) => p.id)).size, 'unique ids').toBe(products.length)
    for (const p of products) {
      expect(p.source.pdf, p.id).toBeTruthy()
      expect(p.images.length, `${p.id} has a catalogue photo`).toBeGreaterThan(0)
      expect(JSON.stringify(p), `${p.id} carries no price`).not.toMatch(/"price|₹|\d\/-/)
    }
    const xml = await (await request.get('/sitemap.xml')).text()
    for (const p of products) expect(xml, p.url).toContain(`${p.url}<`)
    const cov = fs.readFileSync(new URL('../docs/catalogue-coverage.md', import.meta.url), 'utf8')
    expect(cov).toContain(`| **Total** | **${products.length}** |`)
  })

  test('wardrobe items stay wardrobe accessories, and empty categories make no product claims', async ({ request }) => {
    for (const p of products.filter((x) => x.brand === 'ROOT')) expect(p.category).toBe('wardrobe-accessories')
    for (const slug of ['chimneys', 'safes']) {
      const html = await (await request.get(`/catalogue/${slug}/`)).text()
      expect(html).not.toContain('class="prod-card"')
      expect(html).toContain('Not in the catalogues yet')
    }
    expect((await request.get('/catalogue/knobs/no-such-product/')).status()).toBe(404)
  })
})

test('catalogue search finds by model code, name and brand, and filters by category', async ({ page }) => {
  await page.goto('/catalogue/')
  const q = page.getByRole('searchbox', { name: /Search by name, model code/ })
  await q.fill('1404')
  await expect(page.locator('[data-results] a[href="/catalogue/knobs/fancy-1404/"]')).toBeVisible()
  await q.fill('trouser rack')
  await expect(page.locator('[data-results] .prod-card').first()).toContainText('ROOT')
  await q.fill('')
  await page.getByRole('combobox', { name: 'Brand' }).selectOption('ROOT')
  await expect(page.locator('[data-count]')).toHaveText('37 products')
  await page.getByRole('combobox', { name: 'Brand' }).selectOption('')
  await page.getByRole('combobox', { name: 'Category' }).selectOption('sofa-legs')
  await expect(page.locator('[data-count]')).toHaveText('32 products')
  await q.fill('zzzz')
  await expect(page.locator('[data-count]')).toContainText('No products match')
})

test('search shows the filters in use, removes them one at a time or all at once, and helps when nothing matches', async ({ page }) => {
  await page.goto('/catalogue/?q=antique&b=FANCY')
  await expect(page.getByRole('searchbox', { name: /Search by name, model code/ })).toHaveValue('antique')
  await expect(page.getByRole('combobox', { name: 'Brand' })).toHaveValue('FANCY')
  const chips = page.getByRole('list', { name: 'Active filters' })
  await expect(chips.getByRole('button')).toHaveCount(2)
  await chips.getByRole('button', { name: /FANCY/ }).click()
  await expect(page.getByRole('combobox', { name: 'Brand' })).toHaveValue('')
  await expect(chips.getByRole('button')).toHaveCount(1)
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.locator('[data-active]')).toBeHidden()
  await expect(page.locator('[data-out]')).toBeHidden()
  await page.getByRole('searchbox', { name: /Search by name, model code/ }).fill('zzzz')
  await expect(page.locator('[data-empty]')).toBeVisible()
  await page.locator('[data-empty]').getByRole('button', { name: 'rose gold' }).click()
  await expect(page.locator('[data-count]')).toHaveText(/\d+ products?/)
  await expect(page.locator('[data-empty]')).toBeHidden()
})

test('category filters can be cleared, and an unknown type in the link shows everything', async ({ page }) => {
  await page.goto('/catalogue/cabinet-handles/?sub=no-such-type')
  const all = await page.locator('.prod-card').count()
  await expect(page.locator('.prod-card:visible')).toHaveCount(all)
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeHidden()
  await page.getByRole('button', { name: /Sliding \(recessed\) handles/ }).click()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.locator('.prod-card:visible')).toHaveCount(all)
  await expect(page).not.toHaveURL(/sub=/)
})

test('category type filter narrows the list and survives a reload', async ({ page }) => {
  await page.goto('/catalogue/cabinet-handles/')
  const all = await page.locator('.prod-card').count()
  await page.getByRole('button', { name: /Sliding \(recessed\) handles/ }).click()
  await expect(page).toHaveURL(/sub=sliding-recessed-handles/)
  const shown = await page.locator('.prod-card:visible').count()
  expect(shown).toBeGreaterThan(0)
  expect(shown).toBeLessThan(all)
  await page.reload()
  await expect(page.locator('.prod-card:visible')).toHaveCount(shown)
})

test('product page carries brand, model, finish and size into WhatsApp and the form, never sending anything', async ({ page, context }) => {
  const opened = []
  await blockWhatsApp(context)
  context.on('page', (p) => opened.push(p.url()))
  await page.goto('/catalogue/knobs/fancy-1404/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('1404 drawer knob')
  await expect(page.getByText('Price on request')).toBeVisible()
  await page.getByRole('combobox', { name: 'Finish' }).selectOption('Antique')
  await expect(page.locator('[data-summary]')).toHaveText('FANCY 1404 drawer knob, Antique')
  await page.getByRole('combobox', { name: 'Size' }).selectOption('Big')
  const wa = page.getByRole('link', { name: /Ask on WhatsApp/ })
  await expect(wa).toHaveAttribute('target', '_blank')
  expect(await wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/916284505353\?text=/)
  expect(decodeWa(await wa.getAttribute('href'))).toBe('Hi Birdi Hardwares, I’m interested in FANCY 1404 drawer knob, Antique, Big. Please share availability and a quotation.')
  await page.getByRole('link', { name: 'Quotation form' }).click()
  await expect(page).toHaveURL(/\/enquiry\/\?type=FANCY%201404%20drawer%20knob%2C%20Antique%2C%20Big/)
  expect(opened, 'nothing opened on its own').toEqual([])
})

test('ROOT product gallery switches views', async ({ page }) => {
  await page.goto('/catalogue/wardrobe-accessories/root-leather-drawer-with-password/')
  const main = page.locator('[data-main]')
  const first = await main.getAttribute('src')
  await page.locator('.pdp-thumb').nth(1).click()
  await expect(main).not.toHaveAttribute('src', first)
  await expect(page.locator('.pdp-thumb').nth(1)).toHaveAttribute('aria-pressed', 'true')
})

test.describe('phone story', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone sizes')

  const toHero = async (page) => {
    await page.goto('/?debug')
    await page.waitForFunction(() => document.querySelector('.hero')?.classList.contains('live'))
    await page.waitForTimeout(800) // ScrollTrigger restores its scroll once on start
    return page.evaluate(() => { const h = document.querySelector('.hero'); return { top: Math.ceil(h.getBoundingClientRect().top + scrollY), span: h.offsetHeight - h.querySelector('.stage').offsetHeight } })
  }

  for (const [w, h] of [[320, 568], [844, 390]]) {
    test(`the story reaches its last frame while pinned at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      const { top, span } = await toHero(page)
      await page.evaluate((y) => scrollTo(0, y), top + span)
      await expect.poll(() => page.evaluate(() => window.__story.p)).toBeGreaterThan(0.99)
      // the stage is still on screen at that point, not already scrolled away
      expect(await page.evaluate(() => document.querySelector('.stage').getBoundingClientRect().top)).toBeGreaterThanOrEqual(-1)
    })
  }

  test('rotating mid-story keeps the visitor at the same point of the story', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const { top, span } = await toHero(page)
    await page.evaluate((y) => scrollTo(0, y), top + Math.round(span * 0.6))
    await expect.poll(() => page.evaluate(() => window.__story.p)).toBeCloseTo(0.6, 1)
    await page.setViewportSize({ width: 844, height: 390 })
    await expect.poll(() => page.evaluate(() => window.__story.p), { timeout: 5000 }).toBeCloseTo(0.6, 1)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect.poll(() => page.evaluate(() => window.__story.p), { timeout: 5000 }).toBeCloseTo(0.6, 1)
  })

  test('browser bar showing and hiding does not move the story', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const { top, span } = await toHero(page)
    await page.evaluate((y) => scrollTo(0, y), top + Math.round(span * 0.5))
    await page.waitForTimeout(500)
    const p = await page.evaluate(() => window.__story.p)
    await page.setViewportSize({ width: 390, height: 788 })
    await page.waitForTimeout(600)
    expect(await page.evaluate(() => window.__story.p)).toBeCloseTo(p, 2)
  })

  test('phones in landscape get the light render tier', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await toHero(page)
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.quality)).toBe('lite')
  })
})

test.describe('buying guidance', () => {
  test.skip(({ isMobile }) => isMobile, 'content checks run once')

  test('category pages answer buying questions below the products, without unverified claims', async ({ request }) => {
    for (const [slug, q] of [['cabinet-handles', 'What size cabinet handle do I need?'], ['wardrobe-accessories', 'Which wardrobe pull-out will fit my wardrobe?'], ['door-pull-handles', 'Pair or single piece?'], ['kitchen-accessories', 'Are wardrobe baskets suitable for kitchens?']]) {
      const html = await (await request.get(`/catalogue/${slug}/`)).text()
      expect(html, slug).toContain(`<h3>${q}</h3>`)
      // the catalogue stays first: product cards come before the guidance
      if (slug !== 'kitchen-accessories') expect(html.indexOf('class="prod-card"'), slug).toBeLessThan(html.indexOf('id="choosing"'))
      expect(html, slug).not.toMatch(/centre-to-centre hole spacing unless|warranty|installation service|authori[sz]ed dealer|in stock/i)
    }
    const pdp = await (await request.get('/catalogue/cabinet-handles/fancy-11010/')).text()
    expect(pdp).toContain('/catalogue/cabinet-handles/#choosing')
    expect(pdp).toContain('screw-hole spacing or the overall length')
  })
})
