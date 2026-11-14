export type GuildSettings = {
    alertsPaused: boolean,
    mentionOnDelays: boolean,
    mentionOnResults: boolean,
    censorResults: boolean,
    roleManagement: boolean
}

export type FilterRole = {
    filterId: string,
    roleDiscordId: string
}

export type GuildSettingsSet = GuildSettings & {
    // the roles are only needed (and only allowed) if the role management gets enabled
    alertRoleDiscordId?: string,
    filterRoles?: Array<FilterRole>
}

export type GuildSettingsRes = {
    newSettings: GuildSettings,
    // only filled if the role management got disabled
    roleDiscordIdsToDelete: Array<string>
}

export type SettingsStateItem = {
    title: string,
    enabledDesc: string,
    disabledDesc: string,
    enabled: boolean
};
