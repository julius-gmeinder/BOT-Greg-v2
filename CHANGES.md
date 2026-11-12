# Changes from BOT-Greg (v1) to BOT-Greg-v2

The bot was adapted to the rewritten api (`BOT-Greg-v2_API`). The section numbers in brackets refer to the `CHANGES.md` of the api.

## TL;DR

1. SignalR is gone, alerts arrive through a server-sent-events stream (`services/alertStreamService.ts`).
2. News, live matches and stars are removed everywhere.
3. Alerts are built from the new Liquipedia match / result objects.
4. All ids sent to / read from the api use the new `...DiscordId` names.
5. `/filters add matches-and-results` and `/filters add news` became one command: `/filters add` (new option `hltv-coverage`, `stars` removed, `event-tier` is a number).
6. Filters are deleted by their id, `/filters delete` no longer depends on roles.
7. New command `/settings role-management`. Without it the bot creates no roles and sends alerts without mentions.

**After deploying, the slash commands have to be registered again** (`src/deploy.ts`), because options and subcommands changed.

## Not tested against a live system

Verified: `tsc --noEmit` passes, `npm run build` passes, all slash command definitions build, and the stream client was run against a local mock server (events split across chunks, multi-byte characters, reconnect after the server closed the connection, a throwing handler).

Not verified: nothing was run against the real v2 api or a Discord server. The request / response shapes were taken from the controllers and DTOs of the api.

---

## 1. Alert stream (api section 1)

| | v1 | v2 |
|---|---|---|
| Connection | `@microsoft/signalr`, hub `/hub` | `GET api/Alerts/stream`, `services/alertStreamService.ts` |
| Dependency | `@microsoft/signalr` | removed, no new dependency (the stream is read with `node-fetch-cjs`, which was already used) |

- `ConnectAlertStream({ matchAlerts, matchDelays, resultAlerts })` in `bot.ts` replaces the `connection.on(...)` calls. The handlers are the same as before.
- Reconnects use the same delays as the SignalR connection did (0s, 1s, 5s, 10s, 30s, then every 60s). The delay only resets once an event arrived on the new connection.
- Heartbeat: without any event for 75 seconds (the api sends a heartbeat every 30) the connection is considered dead and reopened.
- A handler that throws is logged and does not end the stream.
- Log prefix is `[stream]` instead of `[signalR]`.
- I did not use the `eventsource` package from the api example: its current version (5.x) looks ESM only from its package metadata, and this project is built as CommonJS. I did not try it.

## 2. Removed (api section 2)

| What | Files |
|---|---|
| News | `services/newsAlertsService.ts`, `services/API/filtersNews.ts`, `commands/filters/add/news.ts`, `autocomplete/filters/add/news.ts`, `commands/settings/mentionOnNews.ts`, `commands/settings/alwaysShowNewsImage.ts`, the news channel in `/alerts config`, all news models |
| Live matches | the live match preview in the saved container of `/alerts config` |
| Stars | option `stars` of the filter command, the stars field of the alerts, `BuildStarsString` |
| Guild owner | `bot.ts` no longer fetches the owner of every guild (`guildOwner` is not part of the guild data anymore) |

## 3. Alerts (api section 3)

`models/matches.ts` and `models/alerts.ts` contain the new `Match`, `Result` and alert types.

- **Mentions:** `roleDiscordIds` can be empty (role management disabled). The message is then sent without content, instead of an empty string.
- **Source:** matches covered by HLTV keep the `hltv.org` author, icon and matchpage link. All other matches get `liquipedia.net` as author (linked to the event page, without icon) and no title link. `hltv.png` is only attached if it is used.
- **Fields:** Event (linked to Liquipedia, with the stage), Tier, Format (`Bo3 (Online)`), Streams (match alerts, the first 3), links to the HLTV matchpage and FACEIT if available.
- **Results:** the score is the map score (`teamXMapScore` / `teamYMapScore`). New `Maps` field with the round scores of the played maps (not part of the censored embed). Forfeits are named ("won the match by forfeit").
- **Dates:** `dateTime` has no offset, it is parsed as UTC (`GetUnixTimestamp`).
- The bots presence is `liquipedia.net 🔎` instead of `hltv.org 🔎`.

## 4. Api calls (api section 4)

- New `services/API/request.ts`: shared `get` / `send` helpers, `query` (encodes query parameters, v1 sent the autocomplete input unencoded) and `readErrorCode` (reads error codes like `limit` or `roleManagement`).
- `services/API/filtersMatRes.ts` -> `services/API/filters.ts`.
- All bodies and query parameters use the renamed ids (`guildDiscordId`, `roleDiscordId`, `botRoleDiscordId`, ...).
- `alerts.setConfig` only sends the two channels. The bot never sends `alertRoleDiscordId`.
- `settings.getSettings`, `settings.isRoleManagementEnabled` and `settings.toggleRoleManagement` are new, the two news toggles are removed.
- `autocomplete.getStars` and `getNewsTypes` are removed.

## 5. Commands

### `/filters add` (was `/filters add matches-and-results`)

- Options: `team`, `event`, `event-tier` (integer now, autocomplete returns `0` - `4`), `vrs-rank` (1 - 1000), `hltv-coverage` (new, boolean). `event` can be 128 characters long.
- The filter role is only created (and `Manage Roles` only checked) if the role management is enabled. Otherwise the filter is sent without role, and the success message has a hint instead of the role mention.
- The reply is deferred now, as the command needs one more api call.

### `/filters list`

- One list instead of two (no news filters). Filters without role are shown without mention, the default filter is labeled `(default)`.
- New servers no longer hit the "no filters" case. That case now says that without filters every match is alerted.

### `/filters delete`

- The select menu is built from `GET api/Filters` (value = filter id, label = `Filter 1: Vitality, S-Tier`) and sends `filterIds`.
- Permissions are only checked if the selected filters have roles. The check happens before the api is called (the check of v1 never failed, its `return` was inside a `forEach`).
- Warns if all filters are selected, as a server without filters gets every match.

### `/settings role-management` (new, api section 7)

- **Enabling:** checks `Manage Roles` and Discords limit of 250 roles, creates the alert role and one role per filter, then calls the api. If anything fails, the created roles are deleted again.
- **Disabling:** checks the permissions first, asks for confirmation (lists the roles that get deleted), calls the api, then deletes the returned roles.
- `mention-on-news` and `always-show-news-image` are removed.

### `/alerts config`

- Only match and result alerts. The alert role is no longer created here and `Manage Roles` is not needed.
- New "Mentions" section: shows the alert role, or a hint how to enable the role management.
- Any failed save shows an error now (v1 only handled it if a role was just created, and tried to send an embed in a components message).
- The result block has no live match preview anymore.

### `/roles`, `/role link`, `/role unlink`, `/role list`

- Show a hint that the role management is disabled instead of select menus. The setting is read from `GET api/Settings`.

### `/reset`

- The permissions are checked before the api is called, and only if the server has roles. v1 reset first, so the roles stayed in Discord if the check failed.
- The texts mention that the role management gets disabled and the default filter comes back.

### `/commands`

- The admin embed explains that roles are optional and how to enable them.

## 6. Other

- New `utils/filterUtils.ts` (tier names, filter names, role names, default filter check) and `utils/roleUtils.ts` (permission checks, creating and deleting roles, shared messages). `reset.ts`, the filter commands and `roleManagement.ts` use them. `misc/roles.ts` still has its own copies of the permission checks.
- The error handler in `bot.ts` edits the reply if the command already deferred or replied (v1 always called `reply`, which fails in that case).

## 7. Worth knowing

- **The default filter and other filters are combined with OR.** A server that adds a filter for one team still gets every HLTV-covered match, until it deletes the default filter. The bot does not point this out when a filter is added.
- `team` and `event` of filters have to be the Liquipedia names from the autocomplete. A value typed by hand is sent as it is.
- `/role link` still has its v1 problems that are not related to the api (e. g. it fails on servers that have no role besides the bots roles). I left them as they are.
- `npx eslint src` still reports 11 errors (`any` in `bot.ts`, `let` instead of `const` in `alerts/config.ts`, unused imports in `role/link.ts`). All of them were already there in v1.
