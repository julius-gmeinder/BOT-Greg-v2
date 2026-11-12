import { config } from "../../config";
import fetch, { Response } from 'node-fetch-cjs';
import { AlertConfigDTO } from "../../models";

export default {
    getConfig,
    setConfig,
}

async function getConfig(guildId: string): Promise<Response> {
        const res = await fetch(config.API_BASE + `api/Alerts/config?guildId=${guildId}`);
        return res;
}

async function setConfig(guildId: string, configDTO: AlertConfigDTO): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Alerts/config?guildId=${guildId}`, {
        method: 'POST',
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            matchAlertChannelId: configDTO.matchAlertChannelId,
            resultAlertChannelId: configDTO.resultAlertChannelId,
            newsAlertChannelId: configDTO.newsAlertChannelId,
            alertRoleId: configDTO.alertRoleId
        })
    });
    return res;
}