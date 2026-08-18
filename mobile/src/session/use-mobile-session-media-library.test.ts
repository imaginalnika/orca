import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptySessionMediaMap } from '../../../src/shared/session-media-map'
import {
  useMobileSessionMediaLibrary,
  type MobileSessionMediaLibrary
} from './use-mobile-session-media-library'

const item = {
  id: 'qa9-01-red',
  kind: 'image' as const,
  path: '/workspace/spatula/recipes/frame.png',
  label: 'QA9 red',
  created_at: '2026-08-18T01:34:00+09:00',
  source: 'with-spatula' as const
}

describe('useMobileSessionMediaLibrary', () => {
  let renderer: ReactTestRenderer | null = null
  let latest: MobileSessionMediaLibrary | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    latest = null
  })

  function Harness(props: { sendRequest: (method: string) => Promise<unknown> }): null {
    latest = useMobileSessionMediaLibrary({
      client: { sendRequest: props.sendRequest } as never,
      sessionId: 'sess-1'
    })
    return null
  }

  it('loads the live buffer when the list opens and previews a selected item', async () => {
    const map = emptySessionMediaMap('qa09', 'sess-1')
    map.items.push(item)
    const sendRequest = vi.fn(async (method: string) => {
      if (method === 'session.media.get') {
        return { ok: true, result: map }
      }
      return {
        ok: true,
        result: {
          ok: true,
          id: item.id,
          kind: 'image',
          label: item.label,
          mimeType: 'image/png',
          content: 'AAAA'
        }
      }
    })
    await act(async () => {
      renderer = create(createElement(Harness, { sendRequest }))
    })
    await act(async () => {
      latest?.openList()
    })
    expect(sendRequest).toHaveBeenCalledWith('session.media.get', { id: 'sess-1' })
    expect(latest?.items).toEqual([item])

    await act(async () => {
      latest?.selectItem(item)
    })
    expect(sendRequest).toHaveBeenCalledWith('session.media.readItem', {
      id: 'sess-1',
      itemId: 'qa9-01-red'
    })
    expect(latest?.selectedItem).toEqual(item)
    expect(latest?.preview).toMatchObject({ status: 'ready', kind: 'image' })
  })

  it('treats a failed item read as renderer recovery, not a second document', async () => {
    const sendRequest = vi.fn(async (method: string) => {
      if (method === 'session.media.get') {
        return { ok: true, result: { ...emptySessionMediaMap('qa09', 'sess-1'), items: [item] } }
      }
      return { ok: true, result: { ok: false, id: item.id, reason: 'decode_failed' } }
    })
    await act(async () => {
      renderer = create(createElement(Harness, { sendRequest }))
    })
    await act(async () => {
      latest?.selectItem(item)
    })
    expect(latest?.preview).toEqual({
      status: 'decode_failed',
      kind: 'image',
      label: 'QA9 red'
    })
  })
})
