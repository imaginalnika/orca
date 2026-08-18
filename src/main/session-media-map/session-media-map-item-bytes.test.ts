import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { emptySessionMediaMap } from '../../shared/session-media-map'
import { writeSessionMediaMap } from './session-media-map-document'
import { readSessionMediaItemBytes } from './session-media-map-item-bytes'

const SESSION_ID = '01a00e89-bytes-3333-444444444444'
let roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
  roots = []
})

describe('session media item bytes', () => {
  it('reads the host path named by the map, and recovers when that file is gone', async () => {
    const root = await mkdtemp(join(tmpdir(), 'orca-session-media-bytes-'))
    roots.push(root)
    const env = { ...process.env, ORCA_MEDIA_MAP: root }
    await mkdir(join(root, 'qa01'), { recursive: true })
    await writeFile(
      join(root, 'qa01', 'status.json'),
      `${JSON.stringify({ session_id: SESSION_ID })}\n`
    )
    const take = join(root, 'take.png')
    await writeFile(take, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const map = emptySessionMediaMap('qa01', SESSION_ID)
    map.items.push({
      id: 'still',
      kind: 'image',
      path: take,
      label: 'Still',
      created_at: '2026-08-18T01:34:00+09:00',
      source: 'orca'
    })
    await writeSessionMediaMap('qa01', map, env)

    await expect(readSessionMediaItemBytes('qa01', 'still', env)).resolves.toMatchObject({
      ok: true,
      id: 'still',
      mimeType: 'image/png'
    })
    await expect(readSessionMediaItemBytes('qa01', 'missing', env)).resolves.toEqual({
      ok: false,
      id: 'missing',
      reason: 'missing'
    })
  })
})
