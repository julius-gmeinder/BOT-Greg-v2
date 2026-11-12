import { config } from "../../config";
import { FilterMatResAdd, FilterMatResDelete } from "../../models";
import fetch, { Response } from 'node-fetch-cjs';

export default {
    getFilters,
    getFilterRoleIds,
    add,
    remove,
}

async function getFilters(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersMatRes?guildId=${guildId}`);
    return res;
}

async function getFilterRoleIds(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersMatRes/roles?guildId=${guildId}`);
    return res;
}

async function add({guildId, roleId, team, event, eventTier, vrsRank, stars}: FilterMatResAdd): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersMatRes`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            roleId: roleId,
            team: team,
            event: event,
            eventTier: eventTier,
            vrsRank: vrsRank,
            stars: stars,
        })
    });
    return res;
}

async function remove({guildId, roleIds}: FilterMatResDelete): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersMatRes`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            roleIds: roleIds
        })
    });
    return res;
}