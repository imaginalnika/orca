import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import type { SessionMediaItemKind, SessionMediaMapItem } from '../../shared/session-media-map'
import { readSessionMediaMap } from './session-media-map-document'

export const SESSION_MEDIA_ITEM_MAX_BYTES = 4 * 1024 * 1024

const MEDIA_MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg'
}

export type SessionMediaItemBytes =
  | {
      ok: true
      id: string
      kind: SessionMediaItemKind
      label: string
      mimeType: string
      content: string
    }
  | {
      ok: false
      id: string
      kind?: SessionMediaItemKind
      label?: string
      reason: 'missing' | 'decode_failed'
    }

export async function readSessionMediaItemBytes(
  sessionId: string,
  itemId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<SessionMediaItemBytes> {
  const map = await readSessionMediaMap(sessionId, env)
  const item = map.items.find((candidate) => candidate.id === itemId)
  if (!item) {
    return { ok: false, id: itemId, reason: 'missing' }
  }
  return readItemBytes(item)
}

async function readItemBytes(item: SessionMediaMapItem): Promise<SessionMediaItemBytes> {
  try {
    const info = await stat(item.path)
    if (!info.isFile() || info.size <= 0 || info.size > SESSION_MEDIA_ITEM_MAX_BYTES) {
      return { ok: false, id: item.id, kind: item.kind, label: item.label, reason: 'decode_failed' }
    }
    const bytes = await readFile(item.path)
    return {
      ok: true,
      id: item.id,
      kind: item.kind,
      label: item.label,
      mimeType: MEDIA_MIME_BY_EXT[extname(item.path).toLowerCase()] ?? 'application/octet-stream',
      content: bytes.toString('base64')
    }
  } catch {
    return { ok: false, id: item.id, kind: item.kind, label: item.label, reason: 'decode_failed' }
  }
}
