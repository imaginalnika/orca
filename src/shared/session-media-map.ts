import { z } from 'zod'

export const SESSION_MEDIA_MAP_VERSION = 1 as const

export const SESSION_MEDIA_ITEM_KINDS = ['video', 'image', 'audio'] as const
export const SESSION_MEDIA_ITEM_SOURCES = ['with-spatula', 'agent', 'orca'] as const

export const sessionMediaMapItemSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(SESSION_MEDIA_ITEM_KINDS),
    path: z.string().min(1),
    label: z.string(),
    created_at: z.string(),
    // Writer: spatula take, agent append, or Orca-picked file.
    source: z.enum(SESSION_MEDIA_ITEM_SOURCES)
  })
  .strict()

export const sessionMediaMapSchema = z
  .object({
    version: z.literal(SESSION_MEDIA_MAP_VERSION),
    // Wrapper tab id (qa01, qa03, …) — the folder next to status.json.
    tab: z.string().min(1),
    // Codex UUID from that folder's status.json.
    session_id: z.string().min(1),
    items: z.array(sessionMediaMapItemSchema)
  })
  .strict()

export type SessionMediaMapItem = z.infer<typeof sessionMediaMapItemSchema>
export type SessionMediaMap = z.infer<typeof sessionMediaMapSchema>
export type SessionMediaItemKind = (typeof SESSION_MEDIA_ITEM_KINDS)[number]
export type SessionMediaItemSource = (typeof SESSION_MEDIA_ITEM_SOURCES)[number]

export function emptySessionMediaMap(tab: string, sessionId: string): SessionMediaMap {
  return {
    version: SESSION_MEDIA_MAP_VERSION,
    tab,
    session_id: sessionId,
    items: []
  }
}

export function parseSessionMediaMap(value: unknown): SessionMediaMap {
  return sessionMediaMapSchema.parse(value)
}
