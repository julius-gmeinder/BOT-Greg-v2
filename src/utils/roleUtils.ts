import { Guild, PermissionFlagsBits, Role } from "discord.js";
import colorUtils from "./colorUtils";
import logger from "./logger";

export const alertRoleName = "🔴 Alerts";

export const missingManageRolesMessage = "**Insufficient Permissions**\nThe bot does not have the required `Manage Roles` permissions";
export const missingHigherRoleMessage = "**Insufficient Permissions**\nMake sure that one of the bots roles is above all of the alerts roles";

export const roleManagementDisabledMessage = "**Role management is disabled on this server**\nGreg sends his alerts without mentions and does not create any roles.\n\n*Admins can enable it with `/settings`*";

// disabling deletes the remaining roles (missing ones are skipped), enabling creates the alert role and all filter roles again
export const brokenRolesHint = "-# Roles missing or broken? Admins can recreate them by disabling and enabling the role management in `/settings`";

export function HasManageRoles(guild: Guild | null): boolean {
    return guild?.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) ?? false;
}

// true if one of the roles no longer exists on the server (e. g. deleted by hand). Filters without role (null) are ignored
export function HasMissingRoles(guild: Guild | null, roleIds: Array<string | null>): boolean {
    if(!guild)
        return false;

    return roleIds.some(id => id !== null && !guild.roles.cache.has(id));
}

// the bot can only delete or assign roles below its own highest role. Roles that no longer exist are ignored
export function HasHigherRole(guild: Guild | null, roleIds: string[]): boolean {
    const highestBotRole = guild?.members.me?.roles.highest;

    if(!guild || !highestBotRole)
        return false;

    return roleIds.every(id => {
        const role = guild.roles.cache.get(id);

        if (!role)
            return true;

        return highestBotRole.position > role.position;
    });
}

export async function CreateBotRole(guild: Guild, name: string): Promise<Role> {
    return guild.roles.create({
        name: name,
        permissions: [],
        colors: {
            primaryColor: colorUtils.neutralHex
        }
    });
}

// roles that no longer exist are skipped, a role that can not be deleted does not stop the others
export async function DeleteRoles(guild: Guild | null, roleIds: string[]): Promise<void> {
    if(!guild)
        return;

    await Promise.all(roleIds.map(async (roleId) => {
        const role = guild.roles.cache.get(roleId);

        if(!role)
            return;

        await role.delete().catch((err) => logger.error("roles", `${err} encountered on ${guild.name} (${guild.id}) unable to delete role ${roleId}`));
    }));
}
