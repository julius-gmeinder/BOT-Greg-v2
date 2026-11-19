# Broken roles hint

Temporary change, meant to be **rolled back** once the role management (v2) has been live for a while and servers no longer run into broken roles.

- Added: 2026-11-19, on branch `dev`, on top of `df71a7c` ("stripped unnecessary comments")
- Commit: *fill in once committed* → `git log --oneline -- docs/broken-roles-hint.md` finds it
- Patch of the source changes: [`broken-roles-hint.patch`](./broken-roles-hint.patch)

## Why

v2 made roles optional (`/settings role-management`). Servers that had roles in v1, or admins who delete a bot role by hand, can end up with **broken roles**: the api still stores a role id that no longer exists in Discord. Discord then shows `@deleted-role` in `/filters list`, `/role list`, `/alerts config` and the alerts, and `/roles` shows the raw id as the option label.

The fix is always the same: **disable the role management, then enable it again.** Disabling deletes the remaining roles and all role-links, enabling creates a new alert role and one new role per filter. The bot now says so where it matters.

### Why turning it off and on works when roles are missing

Nothing here was changed by this feature, it only depends on it. If any of it changes, check the hint is still correct:

| Step | Code | Behaviour with missing roles |
|---|---|---|
| Permission check before disabling | `checkRoleDeletionAsync` → `HasHigherRole` (`src/commands/settings/roleManagement.ts`, `src/utils/roleUtils.ts`) | roles that are not in `guild.roles.cache` count as OK, so the check passes |
| Deleting the roles after disabling | `DeleteRoles` (`src/utils/roleUtils.ts`) | missing roles are skipped, a failing delete doesn't stop the others |
| Enabling | `createRolesAsync` (`src/commands/settings/roleManagement.ts`) | creates a new alert role and a new role per filter, new ids are sent to the api |

It takes **two** runs of `/settings`, because the settings message is replaced by the "saved" message after saving.

## What was changed

### Overview

| Where | When the hint is shown | What is shown |
|---|---|---|
| `/roles` select message | a role from `GET api/Roles` is not on the server | `brokenRolesHint` above the select menu |
| `/roles` "no alert roles" error | role management on, but the api returns no roles | error text + `brokenRolesHint` |
| `/role list` | one of the bot roles (`botRoleDiscordId`) is not on the server | divider + `brokenRolesHint` at the bottom |
| `/role link` select message | one of the bot roles is not on the server | `brokenRolesHint` below the title, on every step |
| `/role link` "no roles" error | role management on, but the bot has no roles | error text + `brokenRolesHint` |
| `/role unlink` select message | one of the linked bot roles is not on the server | `brokenRolesHint` below the title, on every step |
| `/filters list` | a filter's `roleDiscordId` is set but not on the server | divider + `brokenRolesHint` at the bottom |
| `/alerts config` "Mentions" (editor and "Config saved") | role management on and `alertRoleDiscordId` is `null` or not on the server | "The alert role of this server is missing" + `brokenRolesHint` **instead of** the role mention |
| `/settings` role management section | **always** while role management is on and isn't being turned off in the open message | own admin text (two saves, role-links get deleted) |
| `/commands` admin container | **always** (admins only) | one extra sentence in the description |

`brokenRolesHint` (in `src/utils/roleUtils.ts`):

```
-# Roles missing or broken? Admins can recreate them by disabling and enabling the role management in `/settings`
```

"Missing" means the id is not in `guild.roles.cache` (`HasMissingRoles`). Filters without role (`null`) are ignored.

### Deliberately not covered

- **`missingHigherRoleMessage`** (bot role below the alert roles): no hint, because disabling runs the same check and would fail.
- **`/roles` still lists missing roles** in the select menu (label = id), and selecting one fails. That was already the case before this change, it was left as it was.
- **`/filters delete`**: no hint, deleting a filter whose role is missing already works (`DeleteRoles` skips it).
- **Alerts**: no hint, a mention of a deleted role just renders as `@deleted-role`.

## Rolling back

No slash commands were added or changed (only message texts), so **`src/deploy.ts` does not need to be run** after the rollback.

### Option A: revert the commit (preferred)

Only works if the change was committed on its own:

```sh
git log --oneline -- docs/broken-roles-hint.md   # the oldest entry is the commit that added it
git revert <hash>
```

The revert also removes this document, the patch and the `CHANGES.md` line.

### Option B: apply the patch in reverse

```sh
git apply -R --check docs/broken-roles-hint.patch   # dry run
git apply -R docs/broken-roles-hint.patch
```

Then by hand:

1. Remove the "Broken roles" bullet from section 6 of `CHANGES.md`.
2. Delete `docs/broken-roles-hint.md` and `docs/broken-roles-hint.patch` (and `docs/` if it is empty).

If `--check` fails, the touched lines have been changed since. Use option C for the files it complains about (`git apply -R --reject` reverses the rest and writes `.rej` files for the hunks that don't apply).

### Option C: by hand

Each step lists what to remove or restore. "Before" is the state of `df71a7c`.

#### 1. `src/utils/roleUtils.ts`

Do this **last**, so the compiler shows every place that still uses it. First check nothing else started using it:

```sh
grep -rn "brokenRolesHint\|HasMissingRoles" src
```

Remove the constant (with its comment) below `roleManagementDisabledMessage`:

```ts
// disabling deletes the remaining roles (missing ones are skipped), enabling creates the alert role and all filter roles again
export const brokenRolesHint = "-# Roles missing or broken? Admins can recreate them by disabling and enabling the role management in `/settings`";
```

Remove the function (with its comment) below `HasManageRoles`:

```ts
// true if one of the roles no longer exists on the server (e. g. deleted by hand). Filters without role (null) are ignored
export function HasMissingRoles(guild: Guild | null, roleIds: Array<string | null>): boolean {
    if(!guild)
        return false;

    return roleIds.some(id => id !== null && !guild.roles.cache.has(id));
}
```

#### 2. `src/commands/misc/roles.ts` (`/roles`)

- Import back to `import { roleManagementDisabledMessage } from "../../utils/roleUtils";`
- Remove the comment `// with role management there is always at least the alert role` and restore the error:
  ```ts
  if(roleIds.length === 0)
      return interaction.reply(containers.reply(containers.error("There are currently no alert roles to select on this server")));
  ```
- Restore the container as one chained expression:
  ```ts
  const container = containers.titled(
      containers.neutralHex,
      "Select Roles",
      "Use the select-menu and choose the roles you want to receive alerts for!\n\n*You can also uncheck roles, if you want them to be removed*"
  ).addActionRowComponents(row);
  ```
  (removes the `if(HasMissingRoles(...))` block and the separate `container.addActionRowComponents(row);`)

#### 3. `src/commands/role/list.ts` (`/role list`)

- Import back to `import { roleManagementDisabledMessage } from "../../utils/roleUtils";`
- Remove the block before the final `return`:
  ```ts
  if(HasMissingRoles(interaction.guild, data.map(item => item.botRoleDiscordId))) {
      container.addSeparatorComponents(containers.divider());
      container.addTextDisplayComponents(containers.text(brokenRolesHint));
  }
  ```

#### 4. `src/commands/role/link.ts` (`/role link`)

- Import back to `import { roleManagementDisabledMessage } from "../../utils/roleUtils";`
- Restore the error:
  ```ts
  if(botRoleIds.length <= 0)
      return interaction.reply(containers.reply(containers.error("The bot currently doesnt have any roles on this server")));
  ```
- Remove `const missingRoles = HasMissingRoles(interaction.guild, botRoleIds);` (directly below that error).
- In `buildContainer`, remove:
  ```ts
  if(missingRoles)
      container.addTextDisplayComponents(containers.text(brokenRolesHint));
  ```

#### 5. `src/commands/role/unlink.ts` (`/role unlink`)

- Import back to `import { roleManagementDisabledMessage } from "../../utils/roleUtils";`
- Remove `const missingRoles = HasMissingRoles(interaction.guild, botRoleIds);` (below the "no role links" error).
- In `buildContainer`, remove:
  ```ts
  if(missingRoles)
      container.addTextDisplayComponents(containers.text(brokenRolesHint));
  ```
- The "no role links" error was **not** changed.

#### 6. `src/commands/filters/list.ts` (`/filters list`)

- Remove `import { brokenRolesHint, HasMissingRoles } from "../../utils/roleUtils";`
- Remove the block before the final `return`:
  ```ts
  if(HasMissingRoles(interaction.guild, data.map(filter => filter.roleDiscordId))) {
      container.addSeparatorComponents(containers.divider());
      container.addTextDisplayComponents(containers.text(brokenRolesHint));
  }
  ```

#### 7. `src/commands/alerts/config.ts` (`/alerts config`)

- Remove `Guild, ` from the `discord.js` import.
- Remove `import { brokenRolesHint, HasMissingRoles } from "../../utils/roleUtils";`
- Restore `buildMentionsString`:
  ```ts
  // the alert role only exists if the role management is enabled, otherwise alerts are sent without mentions
  function buildMentionsString(config: AlertConfigDTO, roleManagement: boolean): string {
      if(roleManagement && config.alertRoleDiscordId !== null)
          return `<@&${config.alertRoleDiscordId}> is mentioned for every alert\n-# Members can choose their roles with \`/roles\``;

      return `Alerts are sent **without mentions**\n-# Want Greg to mention roles? Enable the role management with \`/settings\``;
  }
  ```
  Note: before this change, "role management on but alert role `null`" fell through to "Alerts are sent without mentions". After the rollback it does that again.
- Remove the `guild` parameter again (three places):
  - `function buildSavedContainer(oldConfig: AlertConfigDTO, configRes: AlertConfigResDTO, roleManagement: boolean)`
  - call in `alertsConfigAsync`: `buildSavedContainer(currentConfig, configRes, roleManagement)`
  - calls of `buildMentionsString` in `buildContainer` (`interaction.guild`) and `buildSavedContainer` (`guild`): back to `buildMentionsString(currentConfig, roleManagement)` / `buildMentionsString(newConfig, roleManagement)`

#### 8. `src/commands/settings/index.ts` (`/settings`)

In `buildContainer`, remove (below the `deletesRoles` warning):

```ts
// toggling off and on again recreates every role, it takes two saves as the message is replaced after saving
if(key === "roleManagement" && currentSettings.roleManagement && state.roleManagement.enabled)
    content += "\n-# Roles missing or broken? Disable the role management and save, then enable it again in a new `/settings` to recreate all roles (role-links get deleted)";
```

This one doesn't use `roleUtils`, so the compiler won't point at it.

#### 9. `src/commands/misc/commands.ts` (`/commands`)

Restore the admin container description (removes `.\nIf these roles get deleted or break, disable and enable the role management again to recreate them`):

```ts
"Roles are optional: by default Greg sends his alerts without mentions and does not create any roles.\nEnable the role management in `/settings` to get an alert role and a role per filter (needed for `/roles` and `/role link`)"
```

This one doesn't use `roleUtils` either.

#### 10. Docs

- `CHANGES.md`, section 6: remove the bullet starting with `- Broken roles:`.
- Delete `docs/broken-roles-hint.md` and `docs/broken-roles-hint.patch`.

### Checking the rollback

```sh
grep -rn "brokenRolesHint\|HasMissingRoles" src            # no results
grep -rn "Roles missing or broken\|get deleted or break" src   # no results (covers settings and commands)
npx tsc --noEmit
npx eslint src   # only the errors that were already there before (8 at the time of this change)
```

In Discord, on a test server with role management on, delete a filter role and the alert role by hand, then check that `/roles`, `/role list`, `/role link`, `/role unlink`, `/filters list`, `/alerts config`, `/settings` and `/commands` look like they did before (no hint).
