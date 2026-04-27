# Adv.KVStore — Key-Value Storage for YouTrack

Key-value storage app for YouTrack with block namespaces, TTL caching, access control, and 2 scope levels (global + project).

Works with YouTrack Server and Cloud.

> **See also**: [HOW_TO_USE.md](HOW_TO_USE.md) — getting started guide with workflow examples.

## Why

YouTrack Workflows and Apps have no built-in mechanism for storing arbitrary data between runs. The only native option — Extension Properties — has no TTL, no namespaces, and no access control. Adv.KVStore wraps Extension Properties into a convenient HTTP API.

## Features

- **Key-Value Storage** — Store data in named blocks (namespaces) with arbitrary string keys and values.
- **2 Scope Levels** — Project-level and global storage.
- **TTL Caching** — Set time-to-live per block; expired keys are auto-cleaned on read and write.
- **Permanent Storage** — Blocks with TTL=0 persist indefinitely.
- **HTTP API** — REST endpoints (`get`, `set`, `delete`, `drop`, `flush`, `blocks`) for YouTrack workflows.
- **ACL** — Deny-by-default access control with UserGroup restrictions per scope.
- **Admin Panel** — View and manage stored blocks from YouTrack Administration.
- **Logging** — Configurable backend logging: `no_log`, `minimal`, `debug`.

---

## Scopes

| Scope | Storage | Use case |
| ----- | ------- | -------- |
| **Global** | `ctx.globalStorage.extensionProperties` | Global configs, shared data |
| **Project** | `ctx.project.extensionProperties` | Project workflow settings, metrics cache |

---

## TTL

- TTL is set **per block** in seconds. Each key stores its write timestamp.
- **TTL = 0** — permanent (default). Keys never expire.
- **Lazy cleanup** — expired keys are removed on read and write. Admin panel provides explicit **Cleanup Expired** button.

---

## Access Control (ACL)

- **Deny-by-default** — scope is disabled (403) until an allowed UserGroup is configured.
- Configured via **Administration → Apps → Adv.KVStore → Settings**.
- ACL works at the **scope level**, not per-block or per-key.
- Admin endpoints (`/admin/*`) bypass ACL — protected by platform permissions (`ADMIN_UPDATE_APP` / `UPDATE_PROJECT`).

---

## Limitations

### Storage

- Data is stored as a **JSON string** in Extension Property (`storeData`). Max size is limited by YouTrack Extension Property limits.
- Values are stored **as-is** — any JSON type. For complex objects, explicit serialization is recommended.
- `_meta` is an internal field — do not modify directly.

### Limits

- **Max value size**: 128 KB (JSON-serialized)
- **Max keys per block**: 1000
- **Max blocks per scope**: 100
- Block and key names `__proto__`, `constructor`, `prototype` are rejected (Prototype Pollution prevention)

### Concurrency

- The storage uses a **read-modify-write** pattern on a single JSON string. YouTrack does not provide transactions for Extension Properties.
- If two write requests arrive simultaneously, the second may overwrite changes from the first (**last-write-wins**).
- This store is **eventually-consistent** and is **not suitable** for atomic counters or concurrent increments.
- For use cases requiring strict consistency, use external storage or serialize writes through a single workflow.

### Performance

- Every read/write operation parses and serializes the entire JSON store. For stores with many blocks/keys this can be a bottleneck.
- Recommended: split data across different scopes and blocks.

### Security Notes

- **No Read/Write separation**: ACL checks the same group for both read (`/get`) and write (`/set`, `/delete`, `/flush`) operations. If a user has read access, they also have write access. This is by design — add only trusted accounts to the ACL group.
- **Project scope writes do not require Update Project**: Write endpoints (`set`, `delete`) check ACL group membership, not the platform-level `UPDATE_PROJECT` permission. Any member of `aclProjectGroup` with basic `Read Project` access can modify the KVStore. Restrict the ACL group to trusted users only.
- **Data is accessible via native YouTrack API**: The store uses `extensionProperties` on `Project` and `AppGlobalStorage` entities. Any user with sufficient YouTrack permissions can read raw storage data via `GET /api/admin/projects/{id}?fields=extensionProperties(...)`, bypassing KVStore ACL entirely. **Do not store secrets, tokens, or sensitive data in plaintext.** This is a platform-level limitation and cannot be mitigated by the app.

---

## License

Proprietary. See [LICENSE](LICENSE) for terms.

## Vendor

- **Author**: mag1cc
- **Source**: [GitHub](https://github.com/mag1co/jb-app-adv-kvstore-pub)
