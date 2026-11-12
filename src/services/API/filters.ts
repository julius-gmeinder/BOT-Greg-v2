import { FilterAdd, FilterDelete } from "../../models";
import { Response } from 'node-fetch-cjs';
import { get, query, send } from "./request";

export default {
    getFilters,
    getFilterRoleIds,
    add,
    remove,
}

async function getFilters(guildId: string): Promise<Response> {
    return get(`api/Filters${query({ guildDiscordId: guildId })}`);
}

async function getFilterRoleIds(guildId: string): Promise<Response> {
    return get(`api/Filters/roles${query({ guildDiscordId: guildId })}`);
}

async function add(filter: FilterAdd): Promise<Response> {
    return send('POST', `api/Filters`, {
        guildDiscordId: filter.guildDiscordId,
        roleDiscordId: filter.roleDiscordId,
        team: filter.team,
        event: filter.event,
        eventTier: filter.eventTier,
        vrsRank: filter.vrsRank,
        hltvCoverage: filter.hltvCoverage
    });
}

// the response contains the role ids, that have to be deleted in discord
async function remove({guildDiscordId, filterIds}: FilterDelete): Promise<Response> {
    return send('DELETE', `api/Filters`, {
        guildDiscordId: guildDiscordId,
        filterIds: filterIds
    });
}
