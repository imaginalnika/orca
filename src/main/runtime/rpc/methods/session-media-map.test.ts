import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { emptySessionMediaMap } from '../../../../shared/session-media-map'
import { RpcDispatcher } from '../dispatcher'
import type { RpcRequest } from '../core'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { SESSION_MEDIA_MAP_METHODS } from './session-media-map'

const SESSION_ID = '01a00e89-rpc-test-3333-444444444444'
let roots: string[] = []
const previousMediaMap = process.env.ORCA_MEDIA_MAP

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
  roots = []
  if (previousMediaMap === undefined) {
    delete process.env.ORCA_MEDIA_MAP
  } else {
    process.env.ORCA_MEDIA_MAP = previousMediaMap
  }
})

function makeRequest(method: string, params?: unknown): RpcRequest {
  return { id: 'req-1', authToken: 'tok', method, params }
}

async function dispatcher(): Promise<RpcDispatcher> {
  const root = await mkdtemp(join(tmpdir(), 'orca-session-media-rpc-'))
  roots.push(root)
  process.env.ORCA_MEDIA_MAP = root
  await mkdir(join(root, 'qa01'), { recursive: true })
  await writeFile(
    join(root, 'qa01', 'status.json'),
    `${JSON.stringify({ session_id: SESSION_ID })}\n`
  )
  return new RpcDispatcher({
    runtime: { getRuntimeId: () => 'test-runtime' } as unknown as OrcaRuntimeService,
    methods: SESSION_MEDIA_MAP_METHODS
  })
}

describe('session media map RPC', () => {
  it('gets and puts the same live buffer as the qaXX file', async () => {
    const rpc = await dispatcher()
    const created = await rpc.dispatch(makeRequest('session.media.get', { id: 'qa01' }))
    expect(created).toMatchObject({ ok: true, result: emptySessionMediaMap('qa01', SESSION_ID) })

    const next = emptySessionMediaMap('qa01', SESSION_ID)
    next.items.push({
      id: 'clip-1',
      kind: 'audio',
      path: '/tmp/take.wav',
      label: 'Take',
      created_at: '2026-08-18T01:34:00+09:00',
      source: 'orca'
    })
    const put = await rpc.dispatch(makeRequest('session.media.put', { id: SESSION_ID, map: next }))
    expect(put).toMatchObject({ ok: true, result: next })

    const again = await rpc.dispatch(makeRequest('session.media.get', { id: SESSION_ID }))
    expect(again).toMatchObject({ ok: true, result: next })
  })

  it('returns decode_failed when an item file cannot be read', async () => {
    const rpc = await dispatcher()
    const next = emptySessionMediaMap('qa01', SESSION_ID)
    next.items.push({
      id: 'gone',
      kind: 'video',
      path: '/tmp/does-not-exist-session-media.mp4',
      label: 'Gone',
      created_at: '2026-08-18T01:34:00+09:00',
      source: 'agent'
    })
    await rpc.dispatch(makeRequest('session.media.put', { id: 'qa01', map: next }))

    const read = await rpc.dispatch(
      makeRequest('session.media.readItem', { id: 'qa01', itemId: 'gone' })
    )
    expect(read).toMatchObject({
      ok: true,
      result: { ok: false, id: 'gone', reason: 'decode_failed' }
    })
  })
})
