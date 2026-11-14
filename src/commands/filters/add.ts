import { ChatInputCommandInteraction, MessageFlags, Role } from "discord.js";
import containers from "../../utils/containerUtils";
import filters from "../../services/api/filters";
import settings from "../../services/api/settings";
import { readErrorCode } from "../../services/api/request";
import { FilterProps, BuildFilterText, BuildFilterRoleName, IsValidTier } from "../../utils/filterUtils";
import { CreateBotRole, HasManageRoles, missingManageRolesMessage } from "../../utils/roleUtils";

export async function filtersAdd(interaction: ChatInputCommandInteraction) {
    const filter: FilterProps = {
        team: interaction.options.getString("team"),
        event: interaction.options.getString("event"),
        eventTier: interaction.options.getInteger("event-tier"),
        vrsRank: interaction.options.getInteger("vrs-rank"),
        hltvCoverage: interaction.options.getBoolean("hltv-coverage")
    };

    if(!filter.team && !filter.event && filter.eventTier === null && filter.vrsRank === null && filter.hltvCoverage === null)
        return interaction.reply(containers.reply(containers.error("Add atleast one parameter: Team, Event, Event-Tier, VRS-Rank or HLTV-Coverage")));

    if(filter.team && filter.team.length > 64)
        return interaction.reply(containers.reply(containers.error("The team parameter can not be longer than 64 characters")));

    if(filter.event && filter.event.length > 128)
        return interaction.reply(containers.reply(containers.error("The event parameter can not be longer than 128 characters")));

    if(filter.eventTier !== null && !IsValidTier(filter.eventTier))
        return interaction.reply(containers.reply(containers.error("The event-tier parameter is invalid. Please select one of the suggested tiers")));

    if(filter.vrsRank !== null && (filter.vrsRank < 1 || filter.vrsRank > 1000))
        return interaction.reply(containers.reply(containers.error("The vrs-rank paramenter needs to be a number between 1 and 1000")));

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // a filter only gets a role if the role management is enabled
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(roleManagement === null)
        return interaction.editReply(containers.edit(containers.error("There has been an error running the command")));

    let filterRole: Role | null = null;

    if(roleManagement) {
        if(!HasManageRoles(interaction.guild))
            return interaction.editReply(containers.edit(containers.error(missingManageRolesMessage)));

        try {
            filterRole = await CreateBotRole(interaction.guild!, BuildFilterRoleName(filter));
        }
        catch (err) {
            console.log(`[error] ${err} encountered on ${interaction.guild?.name} (${interaction.guildId}) while creating a filter role`);
            return interaction.editReply(containers.edit(containers.error("The role of the filter could not be created. Please check the bots permissions and try again")));
        }
    }

    const res = await filters.add({
        guildDiscordId: interaction.guildId!,
        roleDiscordId: filterRole?.id ?? null,
        ...filter
    });

    if (res.status === 204) {
        const container = containers.titled(containers.successHex, "New filter added", BuildFilterText(filter));

        container.addSeparatorComponents(containers.spacer());
        container.addTextDisplayComponents(containers.text(filterRole
            ? `✨ <@&${filterRole.id}> is mentioned if this filter matches`
            : "-# Want a role that gets mentioned for this filter? Enable the role management in `/settings`"
        ));

        return interaction.editReply(containers.edit(container));
    }

    // the filter was not saved, so its role is not needed
    await filterRole?.delete().catch(() => null);

    const errorCode = await readErrorCode(res);

    if (res.status === 409) {
        if(errorCode === "limit")
            return interaction.editReply(containers.edit(containers.error("You have reached the maximum amount of filters (20) for this server")));

        if(errorCode === "duplicate")
            return interaction.editReply(containers.edit(containers.error("This filter already exists")));
    }

    // the role management was toggled while the command was running
    if (errorCode === "roleManagement" || errorCode === "roleRequired")
        return interaction.editReply(containers.edit(containers.error("The role management setting of this server has just been changed. Please try again")));

    if (res.status === 400)
        return interaction.editReply(containers.edit(containers.error("There has been an error parsing your parameters. Please check them again")));

    return interaction.editReply(containers.edit(containers.error("There has been an error running the command")));
}
