import { Response } from 'node-fetch-cjs';
import { RoleLink, RoleUnlink } from "../../models";
import { get, query, send } from "./request";

export default {
    link,
    unlink,
    getLinkedBotRoles,
    getLinkedRoles,
    getRoleLinksTree
}

async function link({botRoleDiscordId, linkedRoleDiscordId, guildDiscordId}: RoleLink): Promise<Response> {
    return send('POST', `api/RoleLinks`, {
        botRoleDiscordId: botRoleDiscordId,
        linkedRoleDiscordId: linkedRoleDiscordId,
        guildDiscordId: guildDiscordId
    });
}

async function unlink({botRoleDiscordId, linkedRoleDiscordId}: RoleUnlink): Promise<Response> {
    return send('DELETE', `api/RoleLinks`, {
        botRoleDiscordId: botRoleDiscordId,
        linkedRoleDiscordId: linkedRoleDiscordId
    });
}

async function getLinkedBotRoles(guildId: string): Promise<Response> {
    return get(`api/RoleLinks/bot${query({ guildDiscordId: guildId })}`);
}

async function getLinkedRoles(botRoleId: string): Promise<Response> {
    return get(`api/RoleLinks/linked${query({ botRoleDiscordId: botRoleId })}`);
}

async function getRoleLinksTree(guildId: string): Promise<Response> {
    return get(`api/RoleLinks/tree${query({ guildDiscordId: guildId })}`);
}
