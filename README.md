# Birdi Hardwares showroom website

Source of the showroom website for Birdi Hardwares, a hardware shop in Lakkar
Bazar, Ludhiana. Built with Astro 7 and React islands: an interactive 3D door
that opens into a showroom, original 3D films, a searchable product range and
guides.

Published with the business owner's approval so others can read and learn from
it. The live site is at https://birdihardwares.com.

## Run

```bash
npm install
npm run dev       # http://127.0.0.1:5174
npm run build     # static output in dist/
npm run preview   # http://127.0.0.1:5175, serves dist/
```

## Test

```bash
npm run test:unit                        # scroll state, camera and enquiry rules
BASE_URL=http://127.0.0.1:5175 npm test  # Playwright checks against a running site
```

## Where things live

| What | Where |
|---|---|
| Business facts | `src/data/site.js` |
| Product range | `src/data/products.json`, `src/data/catalogue.js` |
| Guides | `src/data/guides.js` |
| 3D scene | `src/scene/` |
| Pages | `src/pages/` |
| Film and still rendering tools | `tools/showroom/` |

The tools that built the catalogue from supplier files, and the shop's internal
price list, are not part of this release. The visual-baseline screenshots are
not included either, so record your own before running that check.

## Licence

The original code is [MIT](LICENSE). See [NOTICE.md](NOTICE.md): the Birdi
Hardwares name, logo and business details, the product images and catalogue data,
and the vendored components are **not** covered by the MIT licence.
