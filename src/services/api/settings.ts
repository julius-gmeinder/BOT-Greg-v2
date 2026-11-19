import { Response } from 'node-fetch-cjs';
import { GuildSettings, GuildSettingsSet } from "../../models";
import { get, query, send } from "./request";

export default {
    getSettings,
    isRoleManagementEnabled,
    setSettings
}

async function getSettings(guildId: string): Promise<Response> {
    return get(`api/Settings${query({ guildDiscordId: guildId })}`);
}

async function isRoleManagementEnabled(guildId: string): Promise<boolean | null> {
    const res = await getSettings(guildId);

    if(res.status !== 200)
        return null;

    const settings = await res.json() as GuildSettings;
    return settings.roleManagement;
}

async function setSettings(guildId: string, settings: GuildSettingsSet): Promise<Response> {
    return send('POST', `api/Settings${query({ guildDiscordId: guildId })}`, {
        alertsPaused: settings.alertsPaused,
        mentionOnDelays: settings.mentionOnDelays,
        mentionOnResults: settings.mentionOnResults,
        censorResults: settings.censorResults,
        roleManagement: settings.roleManagement,
        alertRoleDiscordId: settings.alertRoleDiscordId ?? null,
        filterRoles: settings.filterRoles ?? []
    });
}
