import { ActionRowBuilder, CommandInteraction, ComponentType, GuildMemberRoleManager, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import roles from "../../services/api/roles";
import settings from "../../services/api/settings";
import containers from "../../utils/containerUtils";
import { roleManagementDisabledMessage } from "../../utils/roleUtils";

export const data = new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Choose your alert roles to get mentioned when alerts are sent")
    .setDMPermission(false);

export async function execute(interaction: CommandInteraction) {
    // without role management the bot has no roles, alerts are sent without mentions
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(roleManagement === false)
        return interaction.reply(containers.reply(containers.neutral(roleManagementDisabledMessage)));

    const res = await roles.getRoles(interaction.guildId!);

    if(res.status !== 200)
        return interaction.reply(containers.reply(containers.error("There has been an error running the command")));

    const roleIds = await res.json() as string[];

    if(roleIds.length === 0)
        return interaction.reply(containers.reply(containers.error("There are currently no alert roles to select on this server")));

    if(!hasManageRoles(interaction))
        return interaction.reply(containers.reply(containers.error("**Insufficient Permissions**\nThe bot does not have the required `Manage Roles` permissions")));

    if(!hasHigherRole(interaction, roleIds)) 
        return interaction.reply(containers.reply(containers.error("**Insufficient Permissions**\nMake sure that one of the bots roles is above all of the alerts roles")));

    const select = new StringSelectMenuBuilder()
        .setCustomId(interaction.id)
        .setPlaceholder('Select Roles')
        .setMinValues(0)
        .setMaxValues(roleIds.length);

    roleIds.forEach(async (id: string) => {
        const role = interaction.guild?.roles.cache.get(id);
        const userRoleManager = interaction.member?.roles as GuildMemberRoleManager;
        const hasRole = userRoleManager.cache.some(r => r.id === id);

        select.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(role?.name ?? id)
                .setValue(id)
                .setDefault(hasRole)
        );
    });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const container = containers.titled(
        containers.neutralHex,
        "Select Roles",
        "Use the select-menu and choose the roles you want to receive alerts for!\n\n*You can also uncheck roles, if you want them to be removed*"
    ).addActionRowComponents(row);

    const reply = await interaction.reply(containers.reply(container));

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id && i.customId == interaction.id
    });

    collector.on("collect", async (selectInteraction) => {
        const roleManager = selectInteraction.member?.roles as GuildMemberRoleManager;

        const userRoles = roleManager.cache.map(role => role.id);
        const selectedRoles = selectInteraction.values.join(",");

        const rolesAdded: string[] = [];
        const rolesRemoved: string[] = [];

        roleIds.forEach(async (id) => {
            if(selectedRoles.includes(id) && !userRoles.includes(id)) {
                rolesAdded.push(`<@&${id}>`);
                await roleManager.add(id);
            }

            if(userRoles.includes(id) && !selectedRoles.includes(id)) {
                rolesRemoved.push(`<@&${id}>`);
                await roleManager.remove(id);
            }
        });

        const updatedContainer = containers.titled(
            containers.successHex,
            "Roles updated",
            "Your roles have been updated successfully"
        );

        if(rolesAdded.length > 0)
            updatedContainer.addTextDisplayComponents(containers.text(`✨ **Added roles**\n${rolesAdded.join("\n")}`));

        if(rolesRemoved.length > 0)
            updatedContainer.addTextDisplayComponents(containers.text(`🗑️ **Removed roles**\n${rolesRemoved.join("\n")}`));

        await selectInteraction.update(containers.edit(updatedContainer));
        await collector.stop();
    });

    collector.on("end", async (collected) => {
        if(collected.size === 0)
            await reply.edit(containers.edit(containers.neutral("No roles were selected. Your roles did not change")));
    });
}

function hasManageRoles(interaction: CommandInteraction): boolean {
    const permissions = interaction.guild?.members.me?.permissions;
    return permissions?.has(PermissionFlagsBits.ManageRoles) ?? false;
}

function hasHigherRole(interaction: CommandInteraction, roleIds: string[]): boolean {
    const highestBotRole = interaction.guild!.members.me!.roles.highest;
    return roleIds.every(id => {
        const role = interaction.guild?.roles.cache.get(id);

        if (!role) 
            return true; 

        return highestBotRole.position > role.position;
    });
}