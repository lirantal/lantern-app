// Production entrypoint: apply DB migrations, then serve the built app.
// dist/server/server.js exports a web-standard `fetch` handler; dist/client holds static assets.
import './migrate.mjs'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const root = resolve('dist/client')
const { default: app } = await import(pathToFileURL(resolve('dist/server/server.js')).href)
const port = Number(process.env.PORT ?? 3000)

const types = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.map': 'application/json',
}

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const file = normalize(join(root, pathname))
  if (!file.startsWith(root + '/') || !existsSync(file) || !statSync(file).isFile()) return false
  res.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
  })
  if (req.method === 'HEAD') res.end()
  else createReadStream(file).pipe(res)
  return true
}

createServer(async (req, res) => {
  try {
    if (serveStatic(req, res)) return
    const proto = req.headers['x-forwarded-proto'] ?? 'http'
    const url = `${proto}://${req.headers.host}${req.url}`
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
    })
    const response = await app.fetch(request)
    const headers = {}
    for (const [k, v] of response.headers) if (k !== 'set-cookie') headers[k] = v
    const cookies = response.headers.getSetCookie?.() ?? []
    if (cookies.length) headers['set-cookie'] = cookies
    res.writeHead(response.status, headers)
    if (response.body) Readable.fromWeb(response.body).pipe(res)
    else res.end()
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.writeHead(500)
    res.end('Internal Server Error')
  }
}).listen(port, '0.0.0.0', () => console.log(`[lantern] listening on :${port}`))
