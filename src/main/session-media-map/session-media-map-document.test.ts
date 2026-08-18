import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { emptySessionMediaMap } from '../../shared/session-media-map'
import {
  readSessionMediaMap,
  SessionMediaMapInvalidError,
  SessionMediaMapNotFoundError,
  writeSessionMediaMap
} from './session-media-map-document'

const SESSION_ID = '01a00e89-1111-2222-3333-444444444444'
let roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
  roots = []
})

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'orca-session-media-map-'))
  roots.push(root)
  return root
}

function envFor(root: string): NodeJS.ProcessEnv {
  return { ...process.env, ORCA_MEDIA_MAP: root }
}

async function writeStatus(root: string, tab: string, sessionId = SESSION_ID): Promise<void> {
  const dir = join(root, tab)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'status.json'), `${JSON.stringify({ session_id: sessionId })}\n`)
}

describe('session media map document', () => {
  it('creates an empty v1 map next to status.json when media.json is missing', async () => {
    const root = await makeRoot()
    await writeStatus(root, 'qa09')

    const map = await readSessionMediaMap('qa09', envFor(root))

    expect(map).toEqual(emptySessionMediaMap('qa09', SESSION_ID))
    expect(JSON.parse(await readFile(join(root, 'qa09', 'media.json'), 'utf8'))).toEqual(map)
  })

  it('resolves a Codex UUID through status.json to the same qaXX file', async () => {
    const root = await makeRoot()
    await writeStatus(root, 'qa03')
    const written = emptySessionMediaMap('qa03', SESSION_ID)
    written.items.push({
      id: 'qa3-01-red',
      kind: 'video',
      path: '/workspace/spatula/recipes/01_initial.mp4',
      label: 'QA3 red',
      created_at: '2026-08-18T01:34:00+09:00',
      source: 'with-spatula'
    })
    await writeSessionMediaMap('qa03', written, envFor(root))

    await expect(readSessionMediaMap(SESSION_ID, envFor(root))).resolves.toEqual(written)
    await expect(readFile(join(root, SESSION_ID, 'media.json'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT'
    })
  })

  it('rejects a UUID that has no wrapper status.json', async () => {
    const root = await makeRoot()
    await expect(readSessionMediaMap(SESSION_ID, envFor(root))).rejects.toBeInstanceOf(
      SessionMediaMapNotFoundError
    )
  })

  it('rejects a PUT whose tab does not match the wrapper folder', async () => {
    const root = await makeRoot()
    await writeStatus(root, 'qa01')
    await expect(
      writeSessionMediaMap('qa01', emptySessionMediaMap('qa09', SESSION_ID), envFor(root))
    ).rejects.toBeInstanceOf(SessionMediaMapInvalidError)
  })
})
