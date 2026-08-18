export const SESSION_MEDIA_MAP_VERSION = 1 as const

export const SESSION_MEDIA_ITEM_KINDS = ['video', 'image', 'audio'] as const
export const SESSION_MEDIA_ITEM_SOURCES = ['with-spatula', 'agent', 'orca'] as const

export type SessionMediaItemKind = (typeof SESSION_MEDIA_ITEM_KINDS)[number]
export type SessionMediaItemSource = (typeof SESSION_MEDIA_ITEM_SOURCES)[number]

export type SessionMediaMapItem = {
  id: string
  kind: SessionMediaItemKind
  path: string
  label: string
  created_at: string
  // Writer: spatula take, agent append, or Orca-picked file.
  source: SessionMediaItemSource
}

export type SessionMediaMap = {
  version: typeof SESSION_MEDIA_MAP_VERSION
  // Wrapper tab id (qa01, qa03, …) — the folder next to status.json.
  tab: string
  // Codex UUID from that folder's status.json.
  session_id: string
  items: SessionMediaMapItem[]
}

export function emptySessionMediaMap(tab: string, sessionId: string): SessionMediaMap {
  return {
    version: SESSION_MEDIA_MAP_VERSION,
    tab,
    session_id: sessionId,
    items: []
  }
}
