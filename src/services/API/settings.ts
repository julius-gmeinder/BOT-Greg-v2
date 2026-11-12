import { Response } from 'node-fetch-cjs';
import { GuildSettings, ToggleRoleManagement, ToggleSetting } from "../../models";
import { get, query, send } from "./request";

export default {
    getSettings,
    isRoleManagementEnabled,
    toggleMentionOnDelays,
    toggleMentionOnResults,
    toggleCensorResults,
    togglePauseAlerts,
    toggleRoleManagement
}

async function getSettings(guildId: string): Promise<Response> {
    return get(`api/Settings${query({ guildDiscordId: guildId })}`);
}

// null if the settings could not be loaded
async function isRoleManagementEnabled(guildId: string): Promise<boolean | null> {
    const res = await getSettings(guildId);

    if(res.status !== 200)
        return null;

    const settings = await res.json() as GuildSettings;
    return settings.roleManagement;
}

async function toggleMentionOnDelays(toggle: ToggleSetting): Promise<Response> {
    return toggleSetting("ToggleMentionOnDelays", toggle);
}

async function toggleMentionOnResults(toggle: ToggleSetting): Promise<Response> {
    return toggleSetting("ToggleMentionOnResults", toggle);
}

async function toggleCensorResults(toggle: ToggleSetting): Promise<Response> {
    return toggleSetting("ToggleCensorResults", toggle);
}

async function togglePauseAlerts(toggle: ToggleSetting): Promise<Response> {
    return toggleSetting("TogglePauseAlerts", toggle);
}

// enabling:  the roles have to exist in discord already, the api only saves them
// disabling: the response contains the role ids, that have to be deleted in discord
async function toggleRoleManagement(toggle: ToggleRoleManagement): Promise<Response> {
    return send('PATCH', `api/Settings/ToggleRoleManagement`, {
        guildDiscordId: toggle.guildDiscordId,
        newValue: toggle.newValue,
        alertRoleDiscordId: toggle.alertRoleDiscordId ?? null,
        filterRoles: toggle.filterRoles ?? []
    });
}

async function toggleSetting(endpoint: string, {guildDiscordId, newValue}: ToggleSetting): Promise<Response> {
    return send('PATCH', `api/Settings/${endpoint}`, {
        guildDiscordId: guildDiscordId,
        newValue: newValue
    });
}
