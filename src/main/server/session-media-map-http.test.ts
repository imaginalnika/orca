import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { emptySessionMediaMap } from '../../shared/session-media-map'
import { SessionMediaMapHttpServer } from './session-media-map-http'

const SESSION_ID = '01a00e89-aaaa-bbbb-cccc-ddddeeeeffff'
let roots: string[] = []
let servers: SessionMediaMapHttpServer[] = []
const previousMediaMap = process.env.ORCA_MEDIA_MAP

afterEach(async () => {
  for (const server of servers) {
    server.stop()
  }
  servers = []
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
  roots = []
  if (previousMediaMap === undefined) {
    delete process.env.ORCA_MEDIA_MAP
  } else {
    process.env.ORCA_MEDIA_MAP = previousMediaMap
  }
})

async function startServer(): Promise<{ root: string; origin: string }> {
  const root = await mkdtemp(join(tmpdir(), 'orca-session-media-http-'))
  roots.push(root)
  process.env.ORCA_MEDIA_MAP = root
  const server = new SessionMediaMapHttpServer(0)
  servers.push(server)
  await server.start()
  return { root, origin: `http://127.0.0.1:${server.boundPort}` }
}

async function writeStatus(root: string, tab: string): Promise<void> {
  await mkdir(join(root, tab), { recursive: true })
  await writeFile(join(root, tab, 'status.json'), `${JSON.stringify({ session_id: SESSION_ID })}\n`)
}

describe('session media map HTTP', () => {
  it('GET creates an empty v1 map and PUT replaces that same file', async () => {
    const { root, origin } = await startServer()
    await writeStatus(root, 'qa09')

    const created = await fetch(`${origin}/session/qa09/media`)
    expect(created.status).toBe(200)
    expect(await created.json()).toEqual(emptySessionMediaMap('qa09', SESSION_ID))

    const next = emptySessionMediaMap('qa09', SESSION_ID)
    next.items.push({
      id: 'qa9-01-red',
      kind: 'image',
      path: '/workspace/spatula/recipes/frame.png',
      label: 'QA9 red',
      created_at: '2026-08-18T01:34:00+09:00',
      source: 'agent'
    })
    const put = await fetch(`${origin}/session/${SESSION_ID}/media`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next)
    })
    expect(put.status).toBe(200)
    expect(await put.json()).toEqual(next)
    expect(JSON.parse(await readFile(join(root, 'qa09', 'media.json'), 'utf8'))).toEqual(next)
  })

  it('returns 404 for a UUID with no wrapper status.json', async () => {
    const { origin } = await startServer()
    const response = await fetch(`${origin}/session/${SESSION_ID}/media`)
    expect(response.status).toBe(404)
  })

  it('rejects an unknown path without touching the document', async () => {
    const { origin } = await startServer()
    const response = await fetch(`${origin}/health`)
    expect(response.status).toBe(404)
  })
})
