import { useCallback, useEffect, useState } from 'react'

type MediaRpcClient = {
  sendRequest: (method: string, params?: unknown) => Promise<{ ok: boolean; result?: unknown }>
}

export type SessionMediaItemKind = 'video' | 'image' | 'audio'

export type SessionMediaMapItem = {
  id: string
  kind: SessionMediaItemKind
  path: string
  label: string
  created_at: string
  source: 'with-spatula' | 'agent' | 'orca'
}

export type SessionMediaPreview =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; kind: SessionMediaItemKind; label: string; dataUri: string }
  | { status: 'decode_failed'; kind?: SessionMediaItemKind; label?: string }

export type MobileSessionMediaLibrary = {
  items: SessionMediaMapItem[]
  listOpen: boolean
  openList: () => void
  closeList: () => void
  selectedItem: SessionMediaMapItem | null
  selectItem: (item: SessionMediaMapItem) => void
  closeViewer: () => void
  fullscreen: boolean
  setFullscreen: (value: boolean) => void
  preview: SessionMediaPreview
}

const EMPTY_ITEMS: SessionMediaMapItem[] = []

export function useMobileSessionMediaLibrary(args: {
  client: MediaRpcClient | null
  sessionId: string | null
}): MobileSessionMediaLibrary {
  const { client, sessionId } = args
  const [items, setItems] = useState<SessionMediaMapItem[]>(EMPTY_ITEMS)
  const [listOpen, setListOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SessionMediaMapItem | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [preview, setPreview] = useState<SessionMediaPreview>({ status: 'idle' })

  useEffect(() => {
    setItems(EMPTY_ITEMS)
    setListOpen(false)
    setSelectedItem(null)
    setFullscreen(false)
    setPreview({ status: 'idle' })
  }, [client, sessionId])

  const refresh = useCallback(async (): Promise<void> => {
    if (!client || !sessionId) {
      setItems(EMPTY_ITEMS)
      return
    }
    const response = await client.sendRequest('session.media.get', { id: sessionId })
    if (!response.ok) {
      setItems(EMPTY_ITEMS)
      return
    }
    const items = sessionMediaMapItems(response.result)
    setItems(items)
  }, [client, sessionId])

  const openList = useCallback(() => {
    setListOpen(true)
    void refresh()
  }, [refresh])

  const selectItem = useCallback(
    (item: SessionMediaMapItem) => {
      setListOpen(false)
      setSelectedItem(item)
      setFullscreen(false)
      if (!client || !sessionId) {
        setPreview({ status: 'decode_failed', kind: item.kind, label: item.label })
        return
      }
      setPreview({ status: 'loading' })
      void client
        .sendRequest('session.media.readItem', { id: sessionId, itemId: item.id })
        .then((response) => {
          setPreview(previewFromReadItem(item, response.ok ? response.result : null))
        })
        .catch(() => {
          setPreview({ status: 'decode_failed', kind: item.kind, label: item.label })
        })
    },
    [client, sessionId]
  )

  const closeViewer = useCallback(() => {
    setSelectedItem(null)
    setFullscreen(false)
    setPreview({ status: 'idle' })
  }, [])

  return {
    items,
    listOpen,
    openList,
    closeList: () => setListOpen(false),
    selectedItem,
    selectItem,
    closeViewer,
    fullscreen,
    setFullscreen,
    preview
  }
}

function previewFromReadItem(item: SessionMediaMapItem, result: unknown): SessionMediaPreview {
  if (!result || typeof result !== 'object') {
    return { status: 'decode_failed', kind: item.kind, label: item.label }
  }
  const body = result as {
    ok?: boolean
    kind?: SessionMediaItemKind
    label?: string
    mimeType?: string
    content?: string
    reason?: string
  }
  if (body.ok !== true || typeof body.content !== 'string') {
    return { status: 'decode_failed', kind: item.kind, label: item.label }
  }
  const dataUri = mediaDataUri(body.mimeType, body.content)
  if (!dataUri) {
    return { status: 'decode_failed', kind: item.kind, label: item.label }
  }
  return { status: 'ready', kind: item.kind, label: item.label, dataUri }
}

function sessionMediaMapItems(value: unknown): SessionMediaMapItem[] {
  if (!value || typeof value !== 'object' || !('items' in value)) {
    return EMPTY_ITEMS
  }
  const items = (value as { items?: SessionMediaMapItem[] }).items
  return Array.isArray(items) ? items : EMPTY_ITEMS
}

function mediaDataUri(mimeType: string | undefined, content: string): string | null {
  if (!mimeType || !content) {
    return null
  }
  return `data:${mimeType};base64,${content.replace(/\s/g, '')}`
}
