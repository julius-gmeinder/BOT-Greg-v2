import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, MessageFlags, Role } from "discord.js";
import settings from "../../services/API/settings";
import filters from "../../services/API/filters";
import roles from "../../services/API/roles";
import { readErrorCode } from "../../services/API/request";
import embeds from "../../utils/embedUtils";
import { Filter, ToggleRoleManagementRes } from "../../models";
import { BuildFilterRoleName } from "../../utils/filterUtils";
import { alertRoleName, CreateBotRole, DeleteRoles, HasHigherRole, HasManageRoles, missingHigherRoleMessage, missingManageRolesMessage } from "../../utils/roleUtils";

// discord allows a maximum of 250 roles per server
const maxRolesPerGuild = 250;

// the role management controls every role of the bot: the alert role and one role per filter.
// The api never talks to discord, so the bot creates / deletes the roles and the api only saves which role belongs to what
export async function roleManagement(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value")!;

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const currentValue = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(currentValue === null)
        return interaction.editReply({ embeds: [embeds.error("There has been an error running the command")] });

    if(currentValue === newValue)
        return interaction.editReply({ embeds: [embeds.error(`Role management was already ${newValue ? "enabled" : "disabled"}`)] });

    if(newValue)
        return enableAsync(interaction);

    return disableAsync(interaction);
}

async function enableAsync(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;

    if(!HasManageRoles(guild))
        return interaction.editReply({ embeds: [embeds.error(missingManageRolesMessage)] });

    // every filter needs its own role, the default filter is one of them
    const filtersRes = await filters.getFilters(guild.id);

    if(filtersRes.status !== 200)
        return interaction.editReply({ embeds: [embeds.error("There has been an error running the command")] });

    const guildsFilters = await filtersRes.json() as Filter[];

    if(guild.roles.cache.size + guildsFilters.length + 1 > maxRolesPerGuild)
        return interaction.editReply({ embeds: [embeds.error(`Greg needs to create **${guildsFilters.length + 1}** roles, but this server would exceed discords limit of ${maxRolesPerGuild} roles.\nPlease delete some roles or filters first`)] });

    // the roles have to exist before the api is called
    const createdRoles: Role[] = [];
    const filterRoles: Array<{ filterId: string, roleDiscordId: string }> = [];

    try {
        const alertRole = await CreateBotRole(guild, alertRoleName);
        createdRoles.push(alertRole);

        for (const filter of guildsFilters) {
            const filterRole = await CreateBotRole(guild, BuildFilterRoleName(filter));
            createdRoles.push(filterRole);
            filterRoles.push({ filterId: filter.id, roleDiscordId: filterRole.id });
        }

        const res = await settings.toggleRoleManagement({
            guildDiscordId: guild.id,
            newValue: true,
            alertRoleDiscordId: alertRole.id,
            filterRoles: filterRoles
        });

        if(res.status !== 200) {
            // nothing was saved, so the roles are not needed
            await DeleteRoles(guild, createdRoles.map(role => role.id));

            const errorCode = await readErrorCode(res);

            if(res.status === 409)
                return interaction.editReply({ embeds: [embeds.error("Role management was already enabled")] });

            if(errorCode === "filterRoles")
                return interaction.editReply({ embeds: [embeds.error("Your filters have been changed while the roles were created. Please try again")] });

            return interaction.editReply({ embeds: [embeds.error("There has been an error running the command")] });
        }

        const embed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setTitle("Role management enabled")
            .setTimestamp()
            .setDescription(
                `Greg now mentions roles when he sends an alert\n\n` +
                `🔴 <@&${alertRole.id}> is mentioned for every alert\n` +
                (filterRoles.length > 0 ? `⭕ Every filter got its own role, which is mentioned if the filter matches\n${filterRoles.map(x => `<@&${x.roleDiscordId}>`).join("\n")}\n` : "") +
                `\n*Members can choose their roles with \`/roles\`\nYou can link your own roles to them with \`/role link\`*`
            );

        return interaction.editReply({ embeds: [embed] });
    }
    catch (err) {
        // e. g. a role could not be created
        console.log(`[error] ${err} encountered on ${guild.name} (${guild.id}) while enabling the role management`);
        await DeleteRoles(guild, createdRoles.map(role => role.id));
        return interaction.editReply({ embeds: [embeds.error("The roles could not be created. Please check the bots permissions and try again")] });
    }
}

async function disableAsync(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;

    // the bot has to delete its roles afterwards, so the permissions are checked before anything is changed
    const rolesRes = await roles.getRoles(guild.id);

    if(rolesRes.status !== 200)
        return interaction.editReply({ embeds: [embeds.error("There has been an error running the command")] });

    const roleIds = await rolesRes.json() as string[];

    if(roleIds.length > 0) {
        if(!HasManageRoles(guild))
            return interaction.editReply({ embeds: [embeds.error(missingManageRolesMessage)] });

        if(!HasHigherRole(guild, roleIds))
            return interaction.editReply({ embeds: [embeds.error(missingHigherRoleMessage)] });
    }

    const confirmEmbed = embeds.error(
        `Continuing will delete **all roles** Greg created on this server (the alert role and the roles of your filters) and **all role-links**.\n` +
        `Members lose these roles and alerts will be sent without mentions.\n\n` +
        `Your filters and channels stay untouched` +
        (roleIds.length > 0 ? `\n\n🗑️ **Roles to delete**\n${roleIds.map(id => `<@&${id}>`).join("\n")}` : "")
    ).setTitle("Disable role management?");

    const reply = await interaction.editReply({ embeds: [confirmEmbed], components: [BuildActionRow()] });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        max: 1,
        filter: i => i.user.id === interaction.user.id
    });

    collector.on("collect", async (buttonInteraction) => {
        if(buttonInteraction.customId == "cancel") {
            await buttonInteraction.update({ embeds: [embeds.neutral("Role management has not been disabled")], components: [] });
            return;
        }

        await buttonInteraction.deferUpdate();

        const res = await settings.toggleRoleManagement({ guildDiscordId: guild.id, newValue: false });

        if(res.status === 409) {
            await interaction.editReply({ embeds: [embeds.error("Role management was already disabled")], components: [] });
            return;
        }

        if(res.status !== 200) {
            await interaction.editReply({ embeds: [embeds.error("There has been an error running the command")], components: [] });
            return;
        }

        // the api removed the roles and their links, the bot has to delete them in discord
        const { roleDiscordIdsToDelete } = await res.json() as ToggleRoleManagementRes;
        await DeleteRoles(guild, roleDiscordIdsToDelete);

        await interaction.editReply({ embeds: [embeds.success("Role management is now disabled\nAlerts are sent without mentions")], components: [] });
    });

    collector.on("end", async (collected) => {
        if(collected.size === 0)
            await interaction.editReply({ embeds: [embeds.neutral("No button was pressed. Role management has not been disabled")], components: [] });
    });
}

function BuildActionRow() {
    const btnDisable = new ButtonBuilder()
        .setCustomId('disable')
        .setLabel('Disable and delete roles')
        .setStyle(ButtonStyle.Danger);

    const btnCancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(btnCancel, btnDisable);
}
