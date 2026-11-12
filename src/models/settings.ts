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
