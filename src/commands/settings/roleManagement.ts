import { Guild, Role } from "discord.js";
import filters from "../../services/api/filters";
import roles from "../../services/api/roles";
import { genericErrorMessage } from "../../utils/containerUtils";
import { Filter, FilterRole } from "../../models";
import { BuildFilterRoleName } from "../../utils/filterUtils";
import { alertRoleName, CreateBotRole, DeleteRoles, HasHigherRole, HasManageRoles, missingHigherRoleMessage, missingManageRolesMessage } from "../../utils/roleUtils";

const maxRolesPerGuild = 250; // discord allows a maximum of 250 roles per server

export type CreatedRoles = {
    alertRoleDiscordId: string,
    filterRoles: Array<FilterRole>
}

export async function createRolesAsync(guild: Guild): Promise<CreatedRoles | string> {
    if(!HasManageRoles(guild))
        return missingManageRolesMessage;

    // every filter needs its own role, the default filter is one of them
    const filtersRes = await filters.getFilters(guild.id);

    if(filtersRes.status !== 200)
        return genericErrorMessage;

    const guildsFilters = await filtersRes.json() as Filter[];

    if(guild.roles.cache.size + guildsFilters.length + 1 > maxRolesPerGuild)
        return `Greg needs to create **${guildsFilters.length + 1}** roles to enable the role management, but this server would exceed discords limit of ${maxRolesPerGuild} roles.\nPlease delete some roles or filters first`;

    const createdRoles: Role[] = [];

    try {
        const alertRole = await CreateBotRole(guild, alertRoleName);
        createdRoles.push(alertRole);

        const filterRoles: Array<FilterRole> = [];

        for (const filter of guildsFilters) {
            const filterRole = await CreateBotRole(guild, BuildFilterRoleName(filter));
            createdRoles.push(filterRole);
            filterRoles.push({ filterId: filter.id, roleDiscordId: filterRole.id });
        }

        return { alertRoleDiscordId: alertRole.id, filterRoles: filterRoles };
    }
    catch (err) {
        console.log(`[error] ${err} encountered on ${guild.name} (${guild.id}) while creating the roles of the role management`);
        await DeleteRoles(guild, createdRoles.map(role => role.id));
        return "The roles could not be created. Please check the bots permissions and try again";
    }
}

export function getCreatedRoleIds(createdRoles: CreatedRoles): string[] {
    return [createdRoles.alertRoleDiscordId, ...createdRoles.filterRoles.map(x => x.roleDiscordId)];
}

export async function checkRoleDeletionAsync(guild: Guild): Promise<string | null> {
    const rolesRes = await roles.getRoles(guild.id);

    if(rolesRes.status !== 200)
        return genericErrorMessage;

    const roleIds = await rolesRes.json() as string[];

    if(roleIds.length === 0)
        return null;

    if(!HasManageRoles(guild))
        return missingManageRolesMessage;

    if(!HasHigherRole(guild, roleIds))
        return missingHigherRoleMessage;

    return null;
}
