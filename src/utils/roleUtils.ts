import { Guild, PermissionFlagsBits, Role } from "discord.js";
import colorUtils from "./colorUtils";

export const alertRoleName = "🔴 Alerts";

export const missingManageRolesMessage = "**Insufficient Permissions**\nThe bot does not have the required `Manage Roles` permissions";
export const missingHigherRoleMessage = "**Insufficient Permissions**\nMake sure that one of the bots roles is above all of the alerts roles";

export const roleManagementDisabledMessage = "**Role management is disabled on this server**\nGreg sends his alerts without mentions and does not create any roles.\n\n*Admins can enable it with `/settings`*";

export function HasManageRoles(guild: Guild | null): boolean {
    return guild?.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) ?? false;
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
            primaryColor: colorUtils.neturalHex
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

        await role.delete().catch((err) => console.log(`[error] ${err} encountered on ${guild.name} (${guild.id}) unable to delete role ${roleId}`));
    }));
}
