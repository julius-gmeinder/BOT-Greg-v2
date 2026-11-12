import { config } from "../../config";
import { FilterNewsAdd, FilterNewsDelete } from "../../models";
import fetch, { Response } from 'node-fetch-cjs';

export default {
    getFilters,
    getFilterRoleIds,
    add,
    remove,
}

async function getFilters(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersNews?guildId=${guildId}`);
    return res;
}

async function getFilterRoleIds(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersNews/roles?guildId=${guildId}`);
    return res;
}

async function add({guildId, roleId, articleType}: FilterNewsAdd): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersNews`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            roleId: roleId,
            articleType: articleType
        })
    });
    return res;
}

async function remove({guildId, roleIds}: FilterNewsDelete): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/FiltersNews`, {
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