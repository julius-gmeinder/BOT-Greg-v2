import { config } from "../../config";
import fetch, { Response } from 'node-fetch-cjs';

export default {
    getRoles,
    getDefaultRole
}

async function getRoles(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Roles?guildId=${guildId}`);
    return res;
}

async function getDefaultRole(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Roles/default?guildId=${guildId}`);
    return res;
}