import { Match, Result } from "./matches";

export type MatchAlert = {
    match: Match,
    guilds: Array<{
        channelDiscordId: string,
        roleDiscordIds: Array<string>
    }>
}

export type MatchDelay = {
    match: Match,
    guilds: Array<{
        channelDiscordId: string,
        mentionOnDelays: boolean,
        roleDiscordIds: Array<string>
    }>
}

export type ResultAlert = {
    result: Result,
    guilds: Array<{
        channelDiscordId: string,
        mentionOnResults: boolean,
        censorResults: boolean,
        roleDiscordIds: Array<string>
    }>
}

export type AlertConfigDTO = {
    matchAlertChannelDiscordId: string | null,
    resultAlertChannelDiscordId: string | null,
    // null if the role management is disabled. Never sent by the bot, the role is set by toggling the role management
    alertRoleDiscordId: string | null
}

export type AlertConfigResDTO = {
    newConfig: AlertConfigDTO,
    filterCount: number,
    guildsNextUpcomingMatch: Match | null
}

export type AlertConfigStateItem = {
    title: string,
    enabledDesc: string,
    disabledDesc: string,
    enabled: boolean,
    channelId: string | null
};
