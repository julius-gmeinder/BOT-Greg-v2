export type Filter = {
    id: string,
    nr: number,
    // null if the role management of the guild is disabled
    roleDiscordId: string | null,
    team: string | null,
    event: string | null,
    // event tiers are numbers in the api: 0 Major, 1 S-Tier, 2 A-Tier, 3 B-Tier, 4 C-Tier
    eventTier: number | null,
    eventTierString: string | null,
    vrsRank: number | null,
    hltvCoverage: boolean | null
}

export type FilterAdd = {
    guildDiscordId: string,
    // only set if the role management of the guild is enabled
    roleDiscordId: string | null,
    team: string | null,
    event: string | null,
    eventTier: number | null,
    vrsRank: number | null,
    hltvCoverage: boolean | null
}

export type FilterDelete = {
    guildDiscordId: string,
    filterIds: Array<string>
}

export type MatchPlayer = {
    name: string,
    country: string
}

export type MatchTeam = {
    name: string,
    nameShort: string,
    players: Array<MatchPlayer>
}

// platform: 0 Twitch, 1 Youtube, 2 Kick
export type MatchStream = {
    platform: number,
    channel: string,
    url: string | null
}

export type MatchBase = {
    matchId: string,
    eventId: number,
    eventName: string,
    eventRelUrl: string,
    eventUrl: string,
    // utc, serialized without offset
    dateTime: string,
    bestOf: number,
    environment: string,
    stage: string | null,
    lpTier: string,
    valveTier: string,
    tier: number | null,
    tierString: string | null,
    hltvUrl: string | null,
    faceitUrl: string | null,
    isHltvCovered: boolean,
    // only null for matches with unknown teams (TBD), those are never alerted
    teamX: MatchTeam | null,
    teamY: MatchTeam | null
}

export type Match = MatchBase & {
    streams: Array<MatchStream>
}

export type ResultMap = {
    name: string,
    teamXScore: number | null,
    teamYScore: number | null,
    mapPlayed: boolean
}

export type Result = MatchBase & {
    teamXMapScore: number,
    teamYMapScore: number,
    isForfeit: boolean,
    maps: Array<ResultMap>
}

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

export type GuildSettings = {
    alertsPaused: boolean,
    mentionOnDelays: boolean,
    mentionOnResults: boolean,
    censorResults: boolean,
    roleManagement: boolean
}

export type ToggleSetting = {
    guildDiscordId: string,
    newValue: boolean
}

export type ToggleRoleManagement = {
    guildDiscordId: string,
    newValue: boolean,
    // the roles are only needed to enable the role management
    alertRoleDiscordId?: string,
    filterRoles?: Array<{
        filterId: string,
        roleDiscordId: string
    }>
}

export type ToggleRoleManagementRes = {
    roleManagement: boolean,
    roleDiscordIdsToDelete: Array<string>
}

export type RoleLink = {
    botRoleDiscordId: string,
    linkedRoleDiscordId: string,
    guildDiscordId: string
}

export type RoleUnlink = {
    botRoleDiscordId: string,
    linkedRoleDiscordId: string
}

export type RoleLinksTreeItem = {
    botRoleDiscordId: string,
    linkedRoleDiscordIds: string[]
}

export type CommandInfo = {
    name: string,
    desc: string,
    perms: "admin" | "user"
}

export type GuildData = {
    id: string,
    name: string,
    memberCount: number
}

export type AutocompleteDTO = {
    name: string,
    value: string
}

export type AutocompleteIntDTO = {
    name: string,
    value: number
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
