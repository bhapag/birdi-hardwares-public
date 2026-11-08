// Site-wide checks for the showroom website: page limit, links, SEO tags, assets, copy rules, search,
// quotation form, navigation, films and accessibility.
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function sitemapPages(request) {
  const xml = await (await request.get('/sitemap.xml')).text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
}

test.describe('site structure', () => {
  test.skip(({ isMobile }) => isMobile, 'structure checks run once')

  // ~500 pages since the product catalogue (26 Oct 2026 the old 30-page cap was lifted for one page per product),
  // so these structural checks read the served HTML instead of driving a browser through every page.
  test('every public content page is well formed', async ({ request }) => {
    test.setTimeout(300000)
    const pages = await sitemapPages(request)
    expect(pages.length, 'content pages').toBeGreaterThanOrEqual(470)
    const titles = new Set(), descs = new Set()
    const attr = (html, re) => (html.match(re) || [])[1]
    for (const p of pages) {
      const res = await request.get(p)
      expect(res.status(), p).toBe(200)
      const html = await res.text()
      const meta = {
        title: attr(html, /<title>([^<]*)<\/title>/),
        desc: attr(html, /<meta name="description" content="([^"]*)"/),
        canonical: attr(html, /<link rel="canonical" href="([^"]*)"/),
        robots: attr(html, /<meta name="robots" content="([^"]*)"/),
        h1: (html.match(/<h1[\s>]/g) || []).length,
        ld: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])['@type']),
      }
      expect(meta.h1, `${p} has one h1`).toBe(1)
      expect(meta.canonical, p).toMatch(new RegExp(`${p.replace(/\//g, '\/')}$`))
      expect(meta.robots, `${p} is indexable on the production host`).toBe('index, follow')
      expect(meta.ld, p).toContain('HardwareStore')
      if (p !== '/') expect(meta.ld, `${p} breadcrumbs`).toContain('BreadcrumbList')
      expect(titles.has(meta.title), `unique title ${meta.title}`).toBe(false)
      expect(descs.has(meta.desc), `unique description on ${p}`).toBe(false)
      titles.add(meta.title); descs.add(meta.desc)
    }
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain('Allow: /')
    expect(robots).toContain('Sitemap: https://birdihardwares.com/sitemap.xml')
    expect(robots).not.toContain('Disallow: /')
    // never indexed: the 404 page, and the search index file is not a page
    expect(await (await request.get('/no-such-page/')).text()).toContain('<meta name="robots" content="noindex, nofollow">')
    expect(pages).not.toContain('/catalogue/search.json')
    // internal prices are never served
    for (const p of ['/internal/catalogue-prices.json', '/catalogue-prices.json']) expect((await request.get(p)).status(), p).toBe(404)
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/)
    expect(xml, 'no query-string or filter URLs').not.toMatch(/<loc>[^<]*\?/)
  })

  test('every internal link, image and video source resolves', async ({ page, request }) => {
    test.setTimeout(900000) // crawls every page (about 500 with the catalogue) and asset; slower against the live host
    const pages = await sitemapPages(request)
    const links = new Set(), assets = new Set()
    for (const p of pages) {
      await page.goto(p)
      const found = await page.evaluate(() => ({
        links: [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)),
        assets: [...document.querySelectorAll('img[src], source[srcset], source[src], video[poster]')].flatMap((el) => [el.getAttribute('src'), el.getAttribute('poster'), ...(el.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(' ')[0])]).filter(Boolean),
        imgs: [...document.querySelectorAll('img')].map((i) => ({ alt: i.getAttribute('alt'), w: i.getAttribute('width'), h: i.getAttribute('height'), src: i.getAttribute('src') })),
      }))
      found.links.forEach((l) => links.add(new URL(l).pathname))
      found.assets.forEach((a) => assets.add(a))
      for (const i of found.imgs) {
        expect(i.alt, `alt attribute on ${i.src} (${p})`).not.toBeNull()
        expect(i.w && i.h, `dimensions on ${i.src} (${p})`).toBeTruthy()
      }
    }
    for (const l of links) expect((await request.get(l)).status(), `link ${l}`).toBe(200)
    for (const a of assets) expect((await request.get(a)).status(), `asset ${a}`).toBe(200)
    for (const v of ['/media/showroom-film.mp4', '/media/showroom-film.webm', '/media/showroom-loop.mp4', '/media/showroom-loop.webm', '/media/showroom-loop-portrait.mp4', '/media/showroom-loop-portrait.webm']) {
      expect((await request.get(v)).status(), v).toBe(200)
    }
  })

  test('copy never shows prices, ratings or unverified business claims', async ({ request }) => {
    test.setTimeout(300000)
    const pages = await sitemapPages(request)
    const banned = [/₹|\bRs\.?\s?\d|\bINR\b|\d\/-|per inch\s*\d/i, /authori[sz]ed (dealer|distributor)|official dealer/i, /\bwarrant(y|ies)\b(?! is| or)/i, /\bcertified\b|ISO 9001/i, /testimonial/i, /since 2004|established in|made in germany|german (engineering|quality)/i, /\b\d(\.\d)? ?(stars|out of 5)\b/i, /same[- ]day delivery/i, /0704177|98155|80540|2724248|9899383139|9811077396/]
    for (const p of pages) {
      const html = await (await request.get(p)).text()
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
      for (const b of banned) {
        if (p === '/terms/' && /warrant/.test(b.source)) continue // the terms say no warranty is claimed
        expect(text, `${p} contains ${b}`).not.toMatch(b)
      }
    }
  })
})

test('range search narrows the published catalogue and filters by group', async ({ page }) => {
  await page.goto('/range/')
  await page.locator('.range-search[data-ready]').waitFor()
  const search = page.getByRole('searchbox', { name: 'Search the range' })
  await search.scrollIntoViewIfNeeded()
  const total = Number((await page.locator('.result-count').innerText()).match(/\d+/)[0])
  await search.fill('hinge')
  await expect(page.locator('.result-title', { hasText: 'Butt hinges' })).toBeVisible()
  const n = Number((await page.locator('.result-count').innerText()).match(/\d+/)[0])
  expect(n).toBeLessThan(total)
  await search.fill('')
  await page.getByRole('button', { name: 'Locks', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Locks', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await page.locator('.result-kind').allInnerTexts()).every((t) => /door locks|digital locks|^category$/i.test(t.trim()))).toBe(true)
  await search.fill('zzzz no such part')
  await expect(page.getByText('Nothing in the published range matches that.')).toBeVisible()
})

const decodeWa = (href) => decodeURIComponent(href.split('?text=')[1])

test('category items ask on WhatsApp with the actual item name, prefilled but never sent', async ({ page }) => {
  await page.goto('/range/hinges/')
  await expect(page.getByText('Price on request').first()).toBeVisible()
  const ask = page.getByRole('link', { name: /^Ask about butt hinges/ })
  await expect(ask).toHaveAttribute('target', '_blank')
  expect(decodeWa(await ask.getAttribute('href'))).toBe('Hi Birdi Hardwares, I’m interested in Butt hinges (Hinges). Please share availability and a quotation.')
  const stageWa = page.locator('.stage-actions').getByRole('link', { name: /WhatsApp us/ })
  expect(decodeWa(await stageWa.getAttribute('href'))).toBe('Hi Birdi Hardwares, I’m interested in Hinges. Please share availability and a quotation.')
  await expect(page.locator('.stage-actions').getByRole('link', { name: 'Call +91 62845 05353' })).toHaveAttribute('href', 'tel:+916284505353')
})

test('quotation form prefills from the page and opens WhatsApp for the visitor to send', async ({ page }) => {
  await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null } })
  let posts = 0
  page.on('request', (r) => { if (r.method() === 'POST') posts++ })
  await page.goto('/enquiry/?category=Hinges&type=Butt%20hinges')
  await expect(page.getByLabel(/Category/)).toHaveValue('Hinges')
  await expect(page.getByLabel(/Item or type/)).toHaveValue('Butt hinges')
  await page.getByRole('button', { name: 'Continue on WhatsApp' }).click()
  await expect(page.getByRole('alert')).toContainText('1 field needs attention')
  await expect(page.locator('#q-name')).toBeFocused()
  await page.locator('#q-name').fill('Test visitor')
  await page.getByLabel(/Door thickness/).fill('40')
  await page.getByRole('button', { name: 'Continue on WhatsApp' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Nothing is sent until you press send there' })).toBeVisible()
  const opened = await page.evaluate(() => window.__opened)
  expect(opened).toHaveLength(1)
  const text = decodeWa(opened[0])
  expect(text.startsWith('Hi Birdi Hardwares, I’m interested in Butt hinges (Hinges). Please share availability and a quotation.')).toBe(true)
  expect(text).toContain('Door thickness: 40 mm')
  expect(text).toContain('Name: Test visitor')
  await expect(page.locator('body')).not.toContainText('Enquiry received')
  expect(posts).toBe(0)
})

test('every call and WhatsApp link uses the confirmed number, and nothing opens on its own', async ({ page, request }) => {
  const wa = []
  page.on('request', (r) => { if (r.url().includes('wa.me') || r.url().includes('whatsapp')) wa.push(r.url()) })
  for (const p of ['/', '/range/', '/range/door-closers/', '/contact/', '/enquiry/', '/faq/']) {
    await page.goto(p)
    await page.waitForTimeout(400)
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]')].map((a) => a.getAttribute('href')))
    expect(links.length, `${p} has contact links`).toBeGreaterThan(0)
    for (const h of links) {
      if (h.startsWith('tel:')) expect(h).toBe('tel:+916284505353')
      else {
        expect(h).toMatch(/^https:\/\/wa\.me\/916284505353\?text=[^\s]+$/)
        expect(decodeWa(h)).toMatch(/^Hi Birdi Hardwares, I’m interested in .+\. Please share availability and a quotation\.$/)
      }
    }
  }
  expect(wa, 'no WhatsApp request without a click').toEqual([])
  await page.goto('/contact/')
  await expect(page.locator('.big-phone')).toHaveText('+91 62845 05353')
  await expect(page.locator('.site-foot')).toContainText('+91 62845 05353')
  const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((j) => j['@type'] === 'HardwareStore'))
  expect(ld.telephone).toBe('+916284505353')
})

test('WhatsApp shortcut stays clear of the 3D hero and is keyboard reachable elsewhere', async ({ page }) => {
  await page.goto('/')
  const fab = page.getByRole('link', { name: 'WhatsApp Birdi Hardwares (opens in a new tab)' })
  await page.waitForTimeout(600)
  await expect(fab).toBeHidden() // the hero has its own controls in that corner
  await page.locator('.showroom').scrollIntoViewIfNeeded()
  await expect(fab).toBeVisible()
  expect(decodeWa(await fab.getAttribute('href'))).toBe('Hi Birdi Hardwares, I’m interested in your hardware products. Please share availability and a quotation.')
  await page.goto('/range/')
  await expect(fab).toBeVisible()
  await fab.focus()
  await expect(fab).toBeFocused()
})

test('mobile menu and header enquiry work on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only')
  await page.goto('/guides/')
  await page.locator('.menu summary').click()
  const panel = page.getByRole('navigation', { name: 'Mobile' })
  await expect(panel.getByRole('link', { name: 'Catalogue' })).toBeVisible()
  await expect(panel.getByRole('link', { name: 'Door hardware' })).toBeVisible()
  await panel.getByRole('link', { name: 'Door hardware' }).click()
  await expect(page).toHaveURL(/\/range\/$/)
  await expect(page.locator('.nav').getByRole('link', { name: 'Enquire', exact: true })).toBeVisible()
})

test('showroom film has working play, pause and replay controls', async ({ page }) => {
  await page.goto('/about/')
  const frame = page.locator('.film-frame')
  await frame.scrollIntoViewIfNeeded()
  const video = frame.locator('video')
  // it may already have started on its own once on screen; otherwise press play
  if (await video.evaluate((v) => v.paused)) await frame.getByRole('button', { name: /^Play/ }).first().click()
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime > 0.2), { timeout: 10000 }).toBe(true)
  await page.getByRole('button', { name: 'Pause film' }).click()
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true)
  await page.getByRole('button', { name: 'Replay film from the start' }).click()
  await expect.poll(() => video.evaluate((v) => !v.paused && v.currentTime < 3)).toBe(true)
  expect(await video.evaluate((v) => v.muted)).toBe(true)
  expect(await video.evaluate((v) => Math.round(v.duration))).toBeGreaterThanOrEqual(20)
})

test('reduced motion: the background film stays a still poster and the film does not autoplay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.showroom').scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await expect(page.locator('.showroom video')).toHaveCount(0)
  await expect(page.locator('.showroom .loop-poster img')).toBeVisible()
  await page.locator('.film-frame').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
  expect(await page.locator('.film-frame video').evaluate((v) => v.paused)).toBe(true)
})

test('background film loops muted and pauses when scrolled away', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.locator('.hero.live').waitFor() // the 3D story above takes its scroll length once it hydrates
  await page.locator('.showroom').scrollIntoViewIfNeeded()
  const v = page.locator('.showroom video')
  await expect.poll(() => v.evaluate((el) => !el.paused && el.muted && el.loop), { timeout: 10000 }).toBe(true)
  expect(await v.evaluate((el) => el.currentSrc)).toMatch(isMobile ? /showroom-loop-portrait\.(webm|mp4)$/ : /showroom-loop(-1080)?\.(webm|mp4)$/)
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await expect.poll(() => v.evaluate((el) => el.paused)).toBe(true)
})

for (const p of ['/range/', '/range/digital-locks/', '/guides/choosing-a-door-closer/', '/enquiry/', '/contact/', '/faq/']) {
  test(`accessibility scan: ${p}`, async ({ page }) => {
    await page.goto(p)
    await page.waitForTimeout(1200)
    const v = (await new AxeBuilder({ page }).analyze()).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
    expect(v).toEqual([])
  })
}

test('header WhatsApp icon sits beside the number, is keyboard reachable and opens a prepared message', async ({ page, context, isMobile }) => {
  // never reach WhatsApp from a test: answer wa.me locally instead
  await context.route(/https:\/\/(wa\.me|api\.whatsapp\.com)\//, (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: 'intercepted' }))
  await page.goto('/range/')
  const icon = page.locator('.nav').getByRole('link', { name: 'Chat with Birdi Hardwares on WhatsApp' })
  await expect(icon).toBeVisible()
  const box = await icon.boundingBox()
  expect(box.width, 'comfortable tap target').toBeGreaterThanOrEqual(42)
  expect(box.height).toBeGreaterThanOrEqual(42)
  expect(decodeWa(await icon.getAttribute('href'))).toBe('Hi Birdi Hardwares, I’m interested in your hardware products. Please share availability and a quotation.')
  await expect(icon).toHaveAttribute('href', /^https:\/\/wa\.me\/916284505353\?text=/)
  if (!isMobile) {
    const phone = page.locator('.nav .nav-phone')
    await expect(phone).toHaveText('+91 62845 05353')
    await expect(phone).toHaveAttribute('href', 'tel:+916284505353')
    const p = await phone.boundingBox()
    expect(box.x, 'icon directly after the number').toBeGreaterThan(p.x + p.width)
    expect(box.x - (p.x + p.width)).toBeLessThan(24)
  }
  // keyboard: Tab reaches the icon from the top of the page
  let reached = false
  for (let i = 0; i < 12 && !reached; i++) { await page.keyboard.press('Tab'); reached = await icon.evaluate((el) => el === document.activeElement) }
  expect(reached, 'icon reachable with Tab').toBe(true)
  // activating it opens WhatsApp in a new tab with the message prepared (intercepted here, nothing is sent)
  const popup = page.waitForEvent('popup')
  await page.keyboard.press('Enter')
  const tab = await popup
  expect(tab.url()).toMatch(/^https:\/\/wa\.me\/916284505353\?text=/)
  expect(decodeWa(tab.url())).toContain('I’m interested in your hardware products')
  await tab.close()
  // the logo, Enquire, menu and floating shortcut are all still there
  await expect(page.locator('.brand img')).toBeVisible()
  if (isMobile) await expect(page.locator('.menu summary')).toBeVisible()
  await expect(page.locator('.nav').getByRole('link', { name: 'Enquire', exact: true })).toBeVisible()
  await expect(page.locator('.wa-fab')).toHaveCount(1)
})

test.describe('brand assets', () => {
  test.skip(({ isMobile }) => isMobile, 'asset checks run once')

  test('logo and favicon files load with the right formats and every template references them', async ({ request }) => {
    const types = { '/favicon.ico': /icon/, '/favicon.svg': /svg/, '/favicon-48.png': /png/, '/favicon-96.png': /png/, '/favicon-192.png': /png/, '/favicon-512.png': /png/, '/apple-touch-icon.png': /png/, '/brand/birdi-logo-line.svg': /svg/, '/brand/birdi-logo-stacked-on-dark.svg': /svg/, '/brand/birdi-social-1200x630.png': /png/, '/brand/birdi-logo-stacked.png': /png/ }
    for (const [p, t] of Object.entries(types)) {
      const r = await request.get(p)
      expect(r.status(), p).toBe(200)
      expect(r.headers()['content-type'], p).toMatch(t)
    }
    // the SVG logos are real vector paths, not a raster wrapped in SVG
    expect(await (await request.get('/brand/birdi-logo-line.svg')).text()).not.toMatch(/<image|data:image/)
    for (const p of ['/', '/catalogue/', '/catalogue/knobs/', '/catalogue/knobs/fancy-1404/', '/range/hinges/', '/guides/', '/no-such-page/']) {
      const html = await (await request.get(p)).text()
      expect(html, p).toContain('<link rel="icon" href="/favicon.ico" sizes="48x48">')
      expect(html, p).toContain('href="/favicon.svg" type="image/svg+xml"')
      expect(html, p).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
      expect(html, p).toContain('src="/brand/birdi-logo-line.svg"')
      expect(html, p).toContain('src="/brand/birdi-logo-stacked-on-dark.svg"')
      expect(html, p).not.toMatch(/\/img\/logo\/|\/logo\/birdi-hardwares/)
    }
  })
})
