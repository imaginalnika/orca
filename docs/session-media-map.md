# Session media map

Per Codex / Claude Code session, not per worktree. One JSON sidecar both Orca and the agent read.

## Why

Orca's composer already attaches images to the *next* send. That is not a session library, and it is not video. Spatula takes and other artifacts belong to a live agent tab for the life of that chat.

## Path

```
/workspace/codex-sessions/<session_id>/media.json
```

`session_id` is the Codex/Claude session id (same id Orca used to `codex --yolo resume …`). Agents already write `status.json` next to this.

Env override: `ORCA_MEDIA_MAP` = absolute path to that file.

## Schema (v1)

```json
{
  "version": 1,
  "session_id": "0193…",
  "items": [
    {
      "id": "qa9-01-red",
      "kind": "video",
      "path": "/workspace/spatula/recipes/…/01_initial.mp4",
      "label": "QA9 red",
      "created_at": "2026-08-18T01:34:00+09:00",
      "source": "with-spatula"
    }
  ]
}
```

- `kind`: `video` | `image` | `audio`
- `path`: absolute, readable on the Orca host
- `id`: stable, unique inside the session
- Writers append. Never rewrite another writer's item.
- This file is the document. No second replica in app state.

## Who writes

- **with-spatula** (and any rec wrapper): when a take lands, append one item (`source: "with-spatula"`).
- The agent may append its own (`source: "agent"`).
- Orca may append user-picked files (`source: "orca"`).

## Who reads

- **Agent**: `Read` the JSON. Paths in `items[].path` are real files.
- **Orca desktop**: watch the file for the focused tab's `session_id`.
- **Orca mobile**: host serves the map + bytes over the existing mobile RPC. Phone never owns the document.

## UI (mobile portrait)

Composer action row, left of mic:

`[media] … [mic] [send]`

Media button lists `items` for this session. Tap an item: play/show in a bottom sheet. That sheet can go fullscreen.

## Out of scope (v1)

- CloudKit / public pastebin / a second KV.
- Sharing one map across all tabs on the same worktree.
- Replacing pending-send image attach.
