import { ActionRowBuilder, CommandInteraction, ComponentType, EmbedBuilder, GuildMemberRoleManager, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import roles from "../../services/API/roles";
import settings from "../../services/API/settings";
import embeds from "../../utils/embedUtils";
import { roleManagementDisabledMessage } from "../../utils/roleUtils";

export const data = new SlashCommandBuilder()
    .setName("roles")
    .setDescription("Choose your alert roles to get mentioned when alerts are sent")
    .setDMPermission(false);

export async function execute(interaction: CommandInteraction) {
    // without role management the bot has no roles, alerts are sent without mentions
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(roleManagement === false)
        return interaction.reply({ embeds: [embeds.neutral(roleManagementDisabledMessage)], flags: [MessageFlags.Ephemeral] });

    const res = await roles.getRoles(interaction.guildId!);

    if(res.status !== 200)
        return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral] });

    const roleIds = await res.json() as string[];

    if(roleIds.length === 0)
        return interaction.reply({ embeds: [embeds.error("There are currently no alert roles to select on this server")], flags: [MessageFlags.Ephemeral] });

    if(!hasManageRoles(interaction))
        return interaction.reply({ embeds: [embeds.error("**Insufficient Permissions**\nThe bot does not have the required `Manage Roles` permissions")], flags: [MessageFlags.Ephemeral] });

    if(!hasHigherRole(interaction, roleIds)) 
        return interaction.reply({ embeds: [embeds.error("**Insufficient Permissions**\nMake sure that one of the bots roles is above all of the alerts roles")], flags: [MessageFlags.Ephemeral] });

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

    const embed = new EmbedBuilder()
        .setColor(embeds.neturalHex)
        .setTitle("Select Roles")
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp()
        .setDescription("Use the select-menu and choose the roles you want to receive alerts for!\n\n*You can also uncheck roles, if you want them to be removed*");

    const reply = await interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id && i.customId == interaction.id
    });

    collector.on("collect", async (selectInteraction) => {
        const roleManager = selectInteraction.member?.roles as GuildMemberRoleManager;

        const userRoles = roleManager.cache.map(role => role.id);
        const selectedRoles = selectInteraction.values.join(",");

        const embedRolesAdded: string[] = [];
        const embedRolesRemoved: string[] = [];

        roleIds.forEach(async (id) => {
            if(selectedRoles.includes(id) && !userRoles.includes(id)) {
                embedRolesAdded.push(`<@&${id}>`);
                await roleManager.add(id);
            }

            if(userRoles.includes(id) && !selectedRoles.includes(id)) {
                embedRolesRemoved.push(`<@&${id}>`);
                await roleManager.remove(id);
            }
        });

        const embed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setThumbnail(selectInteraction.user.displayAvatarURL())
            .setTitle("Roles updated")
            .setDescription("Your roles have been updated successfully")
            .setTimestamp();

        if(embedRolesAdded.length > 0)
            embed.addFields({name: "✨ **Added roles**", value: embedRolesAdded.join("\n")});

        if(embedRolesRemoved.length > 0)
            embed.addFields({name: "🗑️ **Removed roles**", value: embedRolesRemoved.join("\n")});

        await reply.edit({ embeds: [embed], components: []});
        await collector.stop();
    });

    collector.on("end", async (collected) => {
        if(collected.size === 0)
            await reply.edit({ embeds:[embeds.neutral("No roles were selected. Your roles did not change")], components:[] });
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