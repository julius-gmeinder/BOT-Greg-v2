import { config } from "../../config";
import fetch, { Response } from 'node-fetch-cjs';
import { RoleLink, RoleUnlink } from "../../models";

export default {
    link,
    unlink,
    getLinkedBotRoles,
    getLinkedRoles,
    getRoleLinksTree
}

async function link({botRoleId, linkedRoleId, guildId}: RoleLink): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/RoleLinks`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            botRoleId: botRoleId,
            linkedRoleId: linkedRoleId,
            guildId: guildId
        })
    });
    return res;
}

async function unlink({botRoleId, linkedRoleId}: RoleUnlink): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/RoleLinks`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            botRoleId: botRoleId,
            linkedRoleId: linkedRoleId
        })
    });
    return res;
}

async function getLinkedBotRoles(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/RoleLinks/bot?guildId=${guildId}`);
    return res;
}

async function getLinkedRoles(botRoleId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/RoleLinks/linked?botRoleId=${botRoleId}`);
    return res;
}

async function getRoleLinksTree(guildId: string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/RoleLinks/tree?guildId=${guildId}`);
    return res;
}