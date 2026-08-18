import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import {
  readSessionMediaMap,
  SessionMediaMapInvalidError,
  SessionMediaMapNotFoundError,
  writeSessionMediaMap
} from '../session-media-map/session-media-map-document'

export const SESSION_MEDIA_MAP_HTTP_PORT = 18791
const MAX_PUT_BYTES = 1024 * 1024
const MEDIA_PATH = /^\/session\/([^/]+)\/media$/

export class SessionMediaMapHttpServer {
  private server: Server | null = null
  private port = 0

  constructor(private readonly listenPort = SESSION_MEDIA_MAP_HTTP_PORT) {}

  get boundPort(): number {
    return this.port
  }

  async start(): Promise<void> {
    if (this.server) {
      return
    }
    this.server = createServer((req, res) => {
      void handleSessionMediaMapRequest(req, res)
    })
    this.port = await listenLoopback(this.server, this.listenPort)
    console.log(`[session-media-map] GET/PUT http://127.0.0.1:${this.port}/session/<id>/media`)
  }

  stop(): void {
    this.server?.close()
    this.server = null
    this.port = 0
  }
}

let sharedServer: SessionMediaMapHttpServer | null = null

export async function startSessionMediaMapHttp(
  listenPort = SESSION_MEDIA_MAP_HTTP_PORT
): Promise<SessionMediaMapHttpServer> {
  sharedServer?.stop()
  sharedServer = new SessionMediaMapHttpServer(listenPort)
  await sharedServer.start()
  return sharedServer
}

export function stopSessionMediaMapHttp(): void {
  sharedServer?.stop()
  sharedServer = null
}

async function handleSessionMediaMapRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const id = mediaPathId(req.url)
  if (!id) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    return
  }
  try {
    if (req.method === 'GET') {
      writeJson(res, 200, await readSessionMediaMap(id))
      return
    }
    if (req.method === 'PUT') {
      writeJson(res, 200, await writeSessionMediaMap(id, await readJsonBody(req)))
      return
    }
    res.writeHead(405, { Allow: 'GET, PUT', 'Content-Type': 'text/plain' })
    res.end('Method not allowed')
  } catch (error) {
    writeSessionMediaMapError(res, error)
  }
}

function mediaPathId(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return null
  }
  try {
    const match = MEDIA_PATH.exec(new URL(rawUrl, 'http://127.0.0.1').pathname)
    const id = match?.[1]
    return id ? decodeURIComponent(id) : null
  } catch {
    return null
  }
}

function writeSessionMediaMapError(res: ServerResponse, error: unknown): void {
  if (error instanceof SessionMediaMapNotFoundError) {
    writeJson(res, 404, { error: error.message })
    return
  }
  if (error instanceof SessionMediaMapInvalidError) {
    writeJson(res, 400, { error: error.message })
    return
  }
  writeJson(res, 500, { error: error instanceof Error ? error.message : 'Internal error' })
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = `${JSON.stringify(body)}\n`
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  })
  res.end(payload)
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_PUT_BYTES) {
      throw new SessionMediaMapInvalidError('Media map is too large')
    }
    chunks.push(buffer)
  }
  if (chunks.length === 0) {
    throw new SessionMediaMapInvalidError('Missing media map body')
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new SessionMediaMapInvalidError('Media map body is not JSON')
  }
}

async function listenLoopback(server: Server, preferredPort: number): Promise<number> {
  try {
    return await listenOn(server, preferredPort)
  } catch (error) {
    if (preferredPort === 0 || !isAddressInUse(error)) {
      throw error
    }
    return listenOn(server, 0)
  }
}

function listenOn(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = (): void => {
      server.off('error', onError)
      const address = server.address()
      resolve(address && typeof address === 'object' ? address.port : port)
    }
    server.once('error', onError)
    server.listen(port, '127.0.0.1', onListening)
  })
}

function isAddressInUse(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'EADDRINUSE'
  )
}
