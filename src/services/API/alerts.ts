import { Response } from 'node-fetch-cjs';
import { get, query, send } from "./request";

export default {
    getConfig,
    setConfig,
}

async function getConfig(guildId: string): Promise<Response> {
    return get(`api/Alerts/config${query({ guildDiscordId: guildId })}`);
}

// only sets the channels. The alert role is not part of the config anymore,
// it is created / removed by toggling the role management (see settings.toggleRoleManagement)
async function setConfig(guildId: string, channels: { matchAlertChannelDiscordId: string | null, resultAlertChannelDiscordId: string | null }): Promise<Response> {
    return send('POST', `api/Alerts/config${query({ guildDiscordId: guildId })}`, {
        matchAlertChannelDiscordId: channels.matchAlertChannelDiscordId,
        resultAlertChannelDiscordId: channels.resultAlertChannelDiscordId
    });
}
