import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { emptySessionMediaMap, type SessionMediaMap } from '../../shared/session-media-map'
import { parseSessionMediaMap } from './session-media-map-schema'
import { resolveSessionMediaMapTarget } from './session-media-map-resolve'
import { sessionMediaMapRoot } from './session-media-map-root'

export class SessionMediaMapNotFoundError extends Error {
  constructor(id: string) {
    super(`Session media map not found for '${id}'`)
    this.name = 'SessionMediaMapNotFoundError'
  }
}

export class SessionMediaMapInvalidError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionMediaMapInvalidError'
  }
}

export async function readSessionMediaMap(
  id: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<SessionMediaMap> {
  const target = await resolveSessionMediaMapTarget(sessionMediaMapRoot(env), id)
  if (!target) {
    throw new SessionMediaMapNotFoundError(id)
  }
  try {
    return parseSessionMediaMap(JSON.parse(await readFile(target.mediaPath, 'utf8')))
  } catch (error) {
    if (isMissingFile(error)) {
      const created = emptySessionMediaMap(target.tab, target.sessionId)
      await writeSessionMediaMapFile(target.mediaPath, created)
      return created
    }
    throw new SessionMediaMapInvalidError(
      error instanceof Error ? error.message : 'Invalid session media map'
    )
  }
}

export async function writeSessionMediaMap(
  id: string,
  value: unknown,
  env: NodeJS.ProcessEnv = process.env
): Promise<SessionMediaMap> {
  const target = await resolveSessionMediaMapTarget(sessionMediaMapRoot(env), id)
  if (!target) {
    throw new SessionMediaMapNotFoundError(id)
  }
  let parsed: SessionMediaMap
  try {
    parsed = parseSessionMediaMap(value)
  } catch (error) {
    throw new SessionMediaMapInvalidError(
      error instanceof Error ? error.message : 'Invalid session media map'
    )
  }
  if (parsed.tab !== target.tab) {
    throw new SessionMediaMapInvalidError(
      `Media map tab '${parsed.tab}' does not match wrapper tab '${target.tab}'`
    )
  }
  await writeSessionMediaMapFile(target.mediaPath, parsed)
  return parsed
}

async function writeSessionMediaMapFile(mediaPath: string, map: SessionMediaMap): Promise<void> {
  await mkdir(dirname(mediaPath), { recursive: true })
  const tempPath = `${mediaPath}.tmp`
  await writeFile(tempPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8')
  await rename(tempPath, mediaPath)
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  )
}
