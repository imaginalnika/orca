import { resolve } from 'node:path'

export const DEFAULT_SESSION_MEDIA_MAP_ROOT = '/workspace/codex-sessions'

const WRAPPER_TAB_PATTERN = /^qa\d+$/i

export function sessionMediaMapRoot(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.ORCA_MEDIA_MAP?.trim()
  return resolve(override && override.length > 0 ? override : DEFAULT_SESSION_MEDIA_MAP_ROOT)
}

export function isWrapperTabId(id: string): boolean {
  return WRAPPER_TAB_PATTERN.test(id)
}

export function normalizeWrapperTabId(id: string): string {
  return id.toLowerCase()
}
