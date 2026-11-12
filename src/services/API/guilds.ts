import { Response } from 'node-fetch-cjs';
import { GuildData } from "../../models";
import { query, send } from "./request";

export default {
    add,
    remove,
    reset,
    sync,
}

async function add(guild: GuildData): Promise<void> {
    await send('POST', `api/Guilds`, toDto(guild));
}

async function remove(guildId: string): Promise<void> {
    await send('DELETE', `api/Guilds${query({ guildDiscordId: guildId })}`);
}

// the response contains the role ids, that have to be deleted in discord
async function reset(guildId: string): Promise<Response> {
    return send('PUT', `api/Guilds/reset${query({ guildDiscordId: guildId })}`);
}

async function sync(guildData: Array<GuildData>): Promise<Response> {
    return send('POST', `api/Guilds/sync`, guildData.map(toDto));
}

function toDto(guild: GuildData) {
    return {
        guildDiscordId: guild.id,
        guildName: guild.name,
        guildMemberCount: guild.memberCount
    };
}
