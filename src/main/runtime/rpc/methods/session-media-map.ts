import { z } from 'zod'
import {
  readSessionMediaMap,
  writeSessionMediaMap
} from '../../../session-media-map/session-media-map-document'
import { readSessionMediaItemBytes } from '../../../session-media-map/session-media-map-item-bytes'
import { sessionMediaMapSchema } from '../../../../shared/session-media-map'
import { defineMethod, type RpcMethod } from '../core'
import { requiredString } from '../schemas'

const SessionMediaId = z.object({
  id: requiredString('Missing session id')
})

const SessionMediaPut = z.object({
  id: requiredString('Missing session id'),
  map: sessionMediaMapSchema
})

const SessionMediaItemRead = z.object({
  id: requiredString('Missing session id'),
  itemId: requiredString('Missing media item id')
})

export const SESSION_MEDIA_MAP_METHODS: RpcMethod[] = [
  defineMethod({
    name: 'session.media.get',
    params: SessionMediaId,
    handler: async (params) => readSessionMediaMap(params.id)
  }),
  defineMethod({
    name: 'session.media.put',
    params: SessionMediaPut,
    handler: async (params) => writeSessionMediaMap(params.id, params.map)
  }),
  defineMethod({
    name: 'session.media.readItem',
    params: SessionMediaItemRead,
    handler: async (params) => readSessionMediaItemBytes(params.id, params.itemId)
  })
]
