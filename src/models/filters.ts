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
