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
