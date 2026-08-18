import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isWrapperTabId, normalizeWrapperTabId } from './session-media-map-root'

export type SessionMediaMapTarget = {
  tab: string
  sessionId: string
  mediaPath: string
}

type CodexStatusJson = {
  session_id?: unknown
}

export async function resolveSessionMediaMapTarget(
  root: string,
  id: string
): Promise<SessionMediaMapTarget | null> {
  const trimmed = id.trim()
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    return null
  }
  if (isWrapperTabId(trimmed)) {
    return resolveWrapperTabTarget(root, normalizeWrapperTabId(trimmed))
  }
  return resolveUuidTarget(root, trimmed)
}

async function resolveWrapperTabTarget(
  root: string,
  tab: string
): Promise<SessionMediaMapTarget> {
  const sessionId = (await readStatusSessionId(join(root, tab, 'status.json'))) ?? tab
  return {
    tab,
    sessionId,
    mediaPath: join(root, tab, 'media.json')
  }
}

async function resolveUuidTarget(root: string, sessionId: string): Promise<SessionMediaMapTarget | null> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return null
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !isWrapperTabId(entry.name)) {
      continue
    }
    const tab = normalizeWrapperTabId(entry.name)
    const found = await readStatusSessionId(join(root, entry.name, 'status.json'))
    if (found === sessionId) {
      return {
        tab,
        sessionId,
        mediaPath: join(root, tab, 'media.json')
      }
    }
  }
  return null
}

async function readStatusSessionId(statusPath: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(await readFile(statusPath, 'utf8')) as CodexStatusJson
    return typeof parsed.session_id === 'string' && parsed.session_id.length > 0
      ? parsed.session_id
      : null
  } catch {
    return null
  }
}
