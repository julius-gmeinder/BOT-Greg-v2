import { Response } from 'node-fetch-cjs';
import { get, query } from "./request";

export default {
    getRoles,
    getDefaultRole
}

// all roles managed by the bot (alert role + filter roles), empty if the role management is disabled
async function getRoles(guildId: string): Promise<Response> {
    return get(`api/Roles${query({ guildDiscordId: guildId })}`);
}

// 404 if the role management is disabled
async function getDefaultRole(guildId: string): Promise<Response> {
    return get(`api/Roles/default${query({ guildDiscordId: guildId })}`);
}
