# How to Use Adv.KVStore

Practical guide for installing, configuring, and using Adv.KVStore in YouTrack workflows.

> **See also**: [README.md](README.md) — full technical documentation.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      YouTrack Instance                          │
│                                                                 │
│  ┌─ Workflow / App ───┐    HTTP API   ┌─ Adv.KVStore ────────┐  │
│  │                    │ ────────────▶ │                      │  │
│  │  conn.getSync()    │               │  be.js (global)      │  │
│  │  conn.postSync()   │               │  be-project.js       │  │
│  │                    │ ◀──────────── │                      │  │
│  └────────────────────┘  JSON response│         │            │  │
│                                       │         ▼            │  │
│                                       │  ┌──────────────┐    │  │
│                                       │  │   store.js   │    │  │
│                                       │  │  CRUD + TTL  │    │  │
│                                       │  │  + ACL check │    │  │
│                                       │  └──────┬───────┘    │  │
│                                       │         │            │  │
│                                       │         ▼            │  │
│                                       │  Extension Property  │  │
│                                       │  (storeData: JSON)   │  │
│                                       └──────────────────────┘  │
│                                                                 │
│  ┌─ Admin Widget (React + Ring UI) ───┐                         │
│  │  Tabs: Global │ Projects │ ACL     │                         │
│  │  → admin/* endpoints (no ACL)      │                         │
│  └────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Data flow

1. **Workflow → API → Store**: Workflow calls HTTP endpoint → backend checks ACL → `store.js` parses JSON from Extension Property, performs operation, serializes back
2. **Admin Widget → Admin API**: Widget calls `admin/*` endpoints (no ACL check)
3. **TTL cleanup on read**: `GET /get` and `GET /blocks` call `cleanExpiredKeys()` removing expired keys

---

## 1. Installation

### From YouTrack Marketplace

Search for **Adv.KVStore** in the YouTrack Marketplace and install.

---

## 2. Configure ACL (required)

After installation, global and project scopes are **disabled by default** (403 for all requests). You must configure access groups.

1. Go to **Administration → Apps → Adv.KVStore → Settings**
2. Set **Global Scope — Allowed Group** to the UserGroup that should access global storage
3. Set **Project Scope — Allowed Group** to the UserGroup that should access project storage

| Configuration | Result |
| ------------- | ------ |
| Group set | Only members can access the scope |
| Group empty | Scope is disabled (403) |

> **Tip**: You can also open Settings from the admin panel — go to **ACL** tab and click **⚙ Open Settings**.

---

## 3. Configure Logging (optional)

In the same Settings page, set **Log Level**:

| Level | Description |
| ----- | ----------- |
| `no_log` | Errors only (default) |
| `minimal` | Errors + main operations |
| `debug` | Everything (for troubleshooting) |

---

## 4. Admin Panel

Go to **YouTrack Admin → Adv.KVStore** to:

- **Global Storage** tab — view, delete, flush global blocks and keys
- **Projects** tab — browse and manage project-scoped data (Drop, Delete, Cleanup, Flush per project)
- **ACL** tab — check access control status per scope

---

## 5. Using from Workflows

If you call Adv.KVStore frequently, use the ready-made helper instead of raw HTTP calls.

Copy [`example/kvhelper.js`](example/kvhelper.js) and [`example/config.js`](example/config.js) into your workflow package, set your URL and token in `config.js`, then:

```javascript
var kv = require('./kvhelper');

// --- Global scope ---
kv.set('config', 'apiUrl', 'https://api.example.com');
var url = kv.get('config', 'apiUrl');
kv.del('config', 'apiUrl');

// --- Project scope ---
var pk = ctx.issue.project.key;
kv.project.set(pk, 'sync', 'lastRun', new Date().toISOString());
var lastRun = kv.project.get(pk, 'sync', 'lastRun');
kv.project.del(pk, 'sync', 'lastRun');
```

See also [`example/example-usage.js`](example/example-usage.js) for a complete workflow demo and [`example/test-kvstore.js`](example/test-kvstore.js) for integration tests.
