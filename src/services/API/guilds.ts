import { config } from "../../config";
import fetch, { Response } from 'node-fetch-cjs';
import { GuildData } from "../../models";

export default {
    add,
    remove,
    reset,
    sync,
}

async function add(guild: GuildData): Promise<void> {
    await fetch(config.API_BASE + `api/Guilds`, {
        method: 'POST',
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guild.id,
            guildName: guild.name,
            guildOwner: guild.owner,
            guildMemberCount: guild.memberCount,
        })
    });
}

async function remove(guildId: string): Promise<void> {
    await fetch(config.API_BASE + `api/Guilds?guildId=${guildId}`, {
        method: 'DELETE',
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        }
    });
}

async function reset(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Guilds/reset?guildId=${guildId}`, {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
    return res;
}

async function sync(guildData: Array<GuildData>): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Guilds/sync`, {
        method: 'POST',
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(guildData.map(guild => ({
            guildId: guild.id,
            guildName: guild.name,
            guildOwner: guild.owner,
            guildMemberCount: guild.memberCount
        })))
    });
    return res;
}