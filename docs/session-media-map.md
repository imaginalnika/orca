# Session media map

One live buffer per Codex / Claude Code session. Orca is a viewport. The agent reads and writes the same document.

## Law (this tool)

- Multimedia belongs to a **session**, not a worktree.
- The map is the document. A failed video decode is renderer recovery, not a second source of truth.
- No detached picker, no CloudKit-only, no public KV, no page the agent cannot HTTP.

## The document

Host-local persistence (not a replica), keyed by the existing wrapper tab (`qa01`, `qa03`, …), next to `status.json`:

```
/workspace/codex-sessions/<qaXX>/media.json
```

`/workspace/codex-sessions/` is the spawn-codex wrapper tree. Each folder’s `status.json` has `"session_id": "<Codex UUID>"`. Do not put `media.json` under the UUID; those folders are not there.

Env override: `ORCA_MEDIA_MAP`.

The **same** document over HTTP on the Orca host (loopback, not public):

```
GET /session/<id>/media
PUT /session/<id>/media
```

`<id>` is `qaXX` **or** the Codex UUID. UUID resolves by reading `codex-sessions/*/status.json`. One file either way.

Orca UI and the agent both hit this. PUT replaces the buffer. Writers who only append should GET, append one item, PUT. Do not keep an in-app copy that later syncs.

## Schema (v1)

```json
{
  "version": 1,
  "tab": "qa09",
  "session_id": "01a00e89-…",
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
- `path`: absolute on the Orca host
- `id`: stable, unique inside the session
- `source`: `with-spatula` | `agent` | `orca`
- New fields get a short comment above them in any generated helper.

## Who writes

- **with-spatula**: when a take lands, append one item.
- The agent may append (`source: "agent"`).
- Orca may append user-picked files (`source: "orca"`).

## UI (mobile portrait)

Composer action row, left of mic:

`[media] … [mic] [send]`

Media button lists `items` from this buffer. Tap: show at the bottom. That sheet can go fullscreen.

Pending-send image attach stays as-is. This map is the session library.


## Hosting

Today a Codex instance is an Orca **terminal tab** (`codex --yolo resume …` on `/workspace/deathhammer`). Josh’s product is **chat chrome around that tab**, not files hung off the TUI. The composer (media left of mic, then mic, then send) is that chrome. The TUI stays; the map attaches to the session id, and the chrome is how a person sees it.

Do not `worktree create` for Deathhammer agents. Prefer `orca` CLI / RuntimeClient RPCs over forging `orchestration.db`. Do not put shipped cutscenes (`deathhammer/art/cutscene/`) on the map — only spatula takes.

## Out of scope (v1)

- Sharing one map across all tabs on the same worktree.
- A second install path.
- Full-page restart to pick up a new item (inject / watch the buffer).
