export type FilterMatRes = {
    nr: number,
    roleId: string,
    team: string | null,
    event: string | null,
    eventTier: string | null,
    vrsRank: number | null,
    stars: number | null
}

export type FilterMatResAdd = {
    guildId: string,
    roleId: string,
    team: string | null,
    event: string | null,
    eventTier: string | null,
    vrsRank: number | null,
    stars: number | null,
}

export type FilterMatResDelete = {
    guildId: string,
    roleIds: Array<string>
}

export type FilterNews = {
    nr: number,
    roleId: string,
    articleType: string
}

export type FilterNewsAdd = {
    guildId: string,
    roleId: string,
    articleType: string
}

export type FilterNewsDelete = {
    guildId: string,
    roleIds: Array<string>
}

export type Match = {
    url: string,
    event: string,
    eventStage: string | null,
    type: string,
    stars: number,
    teamX: string,
    teamY: string,
    date: string,
    time: string
}

export type LiveMatch = {
    url: string,
    event: string,
    eventStage: string | null,
    type: string,
    stars: number,
    teamX_Name: string,
    teamX_Score: number | null,
    teamX_MapScore: number | null,
    teamY_Name: string,
    teamY_Score: number | null,
    teamY_MapScore: number | null,
}

export type Result = {
    url: string,
    event: string,
    type: string,
    stars: number,
    teamX_Name:string,
    teamX_Score:number,
    teamY_Name:string,
    teamY_Score:number,
    date: string,
    time: string
}

export type News = {
    url: string,
    headline: string,
    isFeatured: boolean,
    isShort: boolean,
    newsPage: {
        date: string,
        time: string,
        description: string | null,
        imageLocation: string | null,
        eventName: string | null
    }
}

export type MatchAlert = {
    match: Match,
    guilds: Array<{
        channelId: string,
        roleIds: Array<string>
    }>
}

export type MatchDelay = {
    match: Match,
    guilds: Array<{
        channelId: string,
        mentionOnDelays: boolean,
        roleIds: Array<string>
    }>
}

export type ResultAlert = {
    result: Result,
    guilds: Array<{
        channelId: string,
        mentionOnResults: boolean,
        censorResults: boolean,
        roleIds: Array<string>
    }>
}

export type NewsAlert = {
    news: News,
    guilds: Array<{
        channelId: string,
        mentionOnNews: boolean,
        alwaysShowNewsImage: boolean,
        roleIds: Array<string>
    }>
}

export type ToggleSetting = {
    guildId: string,
    newValue: boolean
}

export type RoleLink = {
    botRoleId: string,
    linkedRoleId: string,
    guildId: string
}

export type RoleUnlink = {
    botRoleId: string,
    linkedRoleId: string
}

export type RoleLinksTreeItem = {
    botRoleId: string,
    linkedRoleIds: string[]
}

export type CommandInfo = {
    name: string,
    desc: string,
    perms: "admin" | "user"
}

export type GuildData = {
    id: string,
    name: string,
    owner: string,
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
    matchAlertChannelId: string | null,
    resultAlertChannelId: string | null,
    newsAlertChannelId: string | null,
    alertRoleId: string | null
}

export type AlertConfigResDTO = {
    newConfig: AlertConfigDTO,
    matResFilterCount: number,
    newsFilterCount: number,
    guildsNextUpcomingMatch: Match | null,
    guildsLiveMatches: Array<LiveMatch>
}

export type AlertConfigStateItem = {
    title: string,
    enabledDesc: string,
    disabledDesc: string,
    enabled: boolean,
    channelId: string | null
};
