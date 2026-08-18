import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileSessionMediaLibrary } from './MobileSessionMediaLibrary'
import type { MobileSessionMediaLibrary as LibraryState } from './use-mobile-session-media-library'

vi.mock('react-native', () => ({
  Image: 'Image',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {}, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View'
}))

vi.mock('react-native-webview', () => ({ WebView: 'WebView' }))

vi.mock('lucide-react-native', () => ({
  Images: 'Images',
  Maximize2: 'Maximize2',
  Minimize2: 'Minimize2',
  X: 'X'
}))

vi.mock('../components/BottomDrawer', async () => {
  const React = await import('react')
  return {
    BottomDrawer: ({ visible, children }: { visible: boolean; children?: unknown }) =>
      visible ? React.createElement('BottomDrawer', { visible }, children) : null
  }
})

vi.mock('../components/PickerListDrawer', async () => {
  const React = await import('react')
  return {
    PickerListDrawer: (props: { visible: boolean; title: string }) =>
      props.visible ? React.createElement('PickerListDrawer', props) : null
  }
})

const item = {
  id: 'qa9-01-red',
  kind: 'video' as const,
  path: '/workspace/spatula/recipes/01_initial.mp4',
  label: 'QA9 red',
  created_at: '2026-08-18T01:34:00+09:00',
  source: 'with-spatula' as const
}

describe('MobileSessionMediaLibrary', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function library(overrides: Partial<LibraryState> = {}): LibraryState {
    return {
      items: [item],
      listOpen: false,
      openList: vi.fn(),
      closeList: vi.fn(),
      selectedItem: item,
      selectItem: vi.fn(),
      closeViewer: vi.fn(),
      fullscreen: false,
      setFullscreen: vi.fn(),
      preview: { status: 'ready', kind: 'video', label: item.label, dataUri: 'data:video/mp4;base64,AA' },
      ...overrides
    }
  }

  it('shows the selected take at the bottom and can go fullscreen', async () => {
    const state = library()
    await act(async () => {
      renderer = create(createElement(MobileSessionMediaLibrary, { library: state }))
    })
    expect(renderer!.root.findByProps({ testID: 'session-media-viewer' })).toBeTruthy()
    expect(renderer!.root.findAllByProps({ testID: 'session-media-fullscreen' })).toHaveLength(0)

    await act(async () => {
      renderer!.update(
        createElement(MobileSessionMediaLibrary, { library: library({ fullscreen: true }) })
      )
    })
    expect(renderer!.root.findByProps({ testID: 'session-media-fullscreen' })).toBeTruthy()
  })

  it('opens the session library list from the live buffer', async () => {
    await act(async () => {
      renderer = create(
        createElement(MobileSessionMediaLibrary, {
          library: library({ listOpen: true, selectedItem: null, preview: { status: 'idle' } })
        })
      )
    })
    const list = renderer!.root.findByType('PickerListDrawer')
    expect(list.props.title).toBe('Session media')
    expect(list.props.items).toEqual([{ id: item.id, label: item.label, detail: 'video' }])
  })
})
