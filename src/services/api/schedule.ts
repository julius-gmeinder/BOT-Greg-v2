import { Response } from 'node-fetch-cjs';
import { get, query } from "./request";

export default {
    getMatches,
    getResults,
    getEvents
}

function scheduleQuery(guildId: string, useFilters: boolean, search?: string | null): string {
    const params: Record<string, string> = { guildDiscordId: guildId, useFilters: String(useFilters) };

    if(search)
        params.search = search;

    return query(params);
}

async function getMatches(guildId: string, useFilters: boolean, status: "upcoming" | "live", search?: string | null): Promise<Response> {
    return get(`api/Schedule/matches${scheduleQuery(guildId, useFilters, search)}&status=${status}`);
}

async function getResults(guildId: string, useFilters: boolean, search?: string | null): Promise<Response> {
    return get(`api/Schedule/results${scheduleQuery(guildId, useFilters, search)}`);
}

async function getEvents(guildId: string, useFilters: boolean, search?: string | null): Promise<Response> {
    return get(`api/Schedule/events${scheduleQuery(guildId, useFilters, search)}`);
}
