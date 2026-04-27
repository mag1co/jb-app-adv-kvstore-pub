# Changelog

## v1.0.3

- **Date formatting from user profile** — admin panel reads date/time format, timezone, and locale from YouTrack user profile (`users/me/profiles/general`); falls back to Intl if unavailable
- **No-wrap dates** — `Updated` column uses `white-space: nowrap` to prevent date wrapping in table cells
- **Documentation cleanup** — simplified README.md (removed duplicated Limitations subsections), streamlined HOW_TO_USE.md (removed inline code duplicates, kept links to example files)
- **Dead code removal** — removed disabled issue scope ACL check from `store.js`, removed vendor placeholders from `settings.json`

## v1.0.2

- **Admin UI refinements** — right-aligned toolbar buttons, thinner table borders per Ring UI guidelines, compact section hints with info icon
- **Ring UI Loader** — native `<Loader squares />` replaces custom loading indicator in all tabs
- **Inline Settings link** — ACL tab shows "App Settings" as inline link with settings icon instead of separate toolbar
- **Scope group headers** — Cleanup Expired / Flush All buttons moved to scope-group header (consistent with Projects tab layout)
- **Refresh left-aligned** — Refresh button stays on the left, action buttons on the right
- **Footer muted** — footer colors and links dimmed for less visual noise
- **Backend JS minification** — backend files minified with terser before ZIP packaging
- **Widget icon** — PNG icon for administration menu
- **Manifest description** — removed reference to disabled issue scope
- **Key value inspector** — click any key in admin panel to view its value inline (global + project scopes), with `setAt` metadata
- **Admin GET endpoint** — `GET /admin/get?block=X&key=Y` returns value + meta, bypasses ACL (`ADMIN_UPDATE_APP` / `UPDATE_PROJECT`)
- **DRY refactor (store.js)** — extracted `_getKeyInternal`, `_deleteKeyInternal`, `_dropBlockInternal`, `_flushInternal`; public and admin handlers are thin wrappers
- **Security: isSafeKey in all admin handlers** — prototype pollution prevention now covers admin delete, drop, and get endpoints

## v0.1.58

- **Admin UI polish** — consistent table column widths, proper toolbar spacing, Ring UI unit-based layout
- **Project-scoped actions** — Drop block, Delete key, Cleanup Expired, and Flush per project in Projects tab
- **Small project buttons** — Cleanup/Flush buttons use compact Ring UI controls height
- **Flush tooltip** — hover hint explains Flush = "Drop all blocks"
- **Ring UI Banner feedback** — success, warning, error banners with modes, titles, and close buttons
- **Mock mode warnings** — simulated actions show warning banners instead of fake success
- **TTL cleanup on writes** — expired keys cleaned lazily; explicit Cleanup Expired button for manual trigger
- **ACL deny-by-default** — scope is disabled (403) when no group is configured; group must be set to enable access
- **Simplified ACL settings** — removed per-scope Enabled checkboxes; ACL is active when group is set, disabled when empty
- **Removed Issue ACL** — issue scope storage works without access control
- **Open Settings button** — ACL tab now has a button to navigate to system app settings
- **Issue scope disabled** — issue scope is blocked (403) until further notice
- **Documentation** — full English README.md with API reference + HOW_TO_USE.md practical guide
- **Security: admin endpoint permissions** — admin endpoints now require `ADMIN_UPDATE_APP` (global) / `UPDATE_PROJECT` (project) at platform level
- **Security: prototype pollution prevention** — block and key names `__proto__`, `constructor`, `prototype` are rejected (400)
- **DoS limits** — max value size 128 KB, max 1000 keys per block, max 100 blocks per scope (413/429)
- **Concurrency** — documented read-modify-write limitation (last-write-wins, eventual consistency)

## v0.1.0

- **Initial release** — key-value storage for YouTrack
- **3 scope levels** — issue (disabled since v0.1.58), project, global
- **Block-based namespaces** — TTL caching and permanent storage
- **HTTP API** — get, set, delete, drop, flush, blocks
- **ACL** — per-endpoint, per-scope access control with group restrictions
- **Admin panel** — view and manage blocks from YouTrack Administration
