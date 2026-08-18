import { z } from 'zod'
import {
  SESSION_MEDIA_ITEM_KINDS,
  SESSION_MEDIA_ITEM_SOURCES,
  SESSION_MEDIA_MAP_VERSION,
  type SessionMediaMap
} from '../../shared/session-media-map'

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

export function parseSessionMediaMap(value: unknown): SessionMediaMap {
  return sessionMediaMapSchema.parse(value)
}
