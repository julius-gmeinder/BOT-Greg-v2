import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import filters from "../../services/api/filters";
import containers from "../../utils/containerUtils";
import { Filter } from "../../models";
import { BuildFilterLabel, BuildFilterName } from "../../utils/filterUtils";
import { DeleteRoles, HasHigherRole, HasManageRoles, missingHigherRoleMessage, missingManageRolesMessage } from "../../utils/roleUtils";

export async function filtersDelete(interaction: ChatInputCommandInteraction) {
    const filtersRes = await filters.getFilters(interaction.guildId!);

    if(filtersRes.status !== 200)
        return interaction.reply(containers.reply(containers.error("There has been an error running the command")));

    const allFilters = await filtersRes.json() as Filter[];

    if(allFilters.length === 0)
        return interaction.reply(containers.reply(containers.error("There are currently no filters on your server")));

    // filters are identified by their id, as they only have a role if the role management is enabled
    const select = new StringSelectMenuBuilder()
        .setCustomId(interaction.id)
        .setPlaceholder('Select filters to delete')
        .setMinValues(1)
        .setMaxValues(allFilters.length);

    allFilters.forEach((filter: Filter) => {
        select.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(BuildFilterLabel(filter))
                .setValue(filter.id)
        );
    });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const container = containers.titled(containers.errorHex, "Delete filters", "Use the select-menu and choose the filters you want to delete")
        .addActionRowComponents(row);

    const reply = await interaction.reply(containers.reply(container));

    const selectCollector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        max: 1,
        filter: i => i.user.id === interaction.user.id && i.customId == interaction.id
    });

    selectCollector.on("collect", async (selectInteraction) => {
        const selectedFilters = allFilters.filter(filter => selectInteraction.values.includes(filter.id));
        const selectedRoleIds = selectedFilters.filter(filter => filter.roleDiscordId !== null).map(filter => filter.roleDiscordId!);

        // permissions are only needed if roles have to be deleted (role management enabled)
        if(selectedRoleIds.length > 0) {
            if(!HasManageRoles(interaction.guild)) {
                await selectInteraction.update(containers.edit(containers.error(missingManageRolesMessage)));
                return;
            }

            if(!HasHigherRole(interaction.guild, selectedRoleIds)) {
                await selectInteraction.update(containers.edit(containers.error(missingHigherRoleMessage)));
                return;
            }
        }

        let description = "Do you really want to delete the following filters?";

        if(selectedRoleIds.length > 0)
            description += "\nTheir roles (and the links of these roles) will be deleted too";

        // a guild without filters gets every match liquipedia knows
        if(selectedFilters.length === allFilters.length)
            description += "\n\n⚠️ **These are all of your filters.** Without filters you will get an alert for **every** match and result, which is a lot more than HLTV covers";

        const selectedFiltersText = selectedFilters.map(filter => `**${filter.nr}** ➖ ${BuildFilterName(filter)}${filter.roleDiscordId ? ` (<@&${filter.roleDiscordId}>)` : ""}`).join("\n").slice(0, 3000);

        const confirmContainer = containers.titled(containers.errorHex, "Delete filters?", description)
            .addSeparatorComponents(containers.spacer())
            .addTextDisplayComponents(containers.text(`🗑️ **Selected filters**\n${selectedFiltersText}`))
            .addSeparatorComponents(containers.divider())
            .addActionRowComponents(BuildActionRow());

        await selectInteraction.update(containers.edit(confirmContainer));

        const buttonCollector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
            max: 1,
            filter: i => i.user.id === interaction.user.id
        });

        buttonCollector.on("collect", async (buttonInteraction: ButtonInteraction) => {
            if(buttonInteraction.customId == "delete") {
                const res = await filters.remove({ guildDiscordId: interaction.guildId!, filterIds: selectedFilters.map(filter => filter.id) });

                if(res.status !== 200) {
                    await buttonInteraction.update(containers.edit(containers.error("There has been an error running the command")));
                    return;
                }

                // roles of the deleted filters (empty if the role management is disabled)
                const roleIdsToDelete = await res.json() as string[];
                await DeleteRoles(interaction.guild, roleIdsToDelete);

                await buttonInteraction.update(containers.edit(containers.titled(containers.errorHex, "Filters deleted", "The selected filters have been deleted successfully")));
                return;
            }

            if(buttonInteraction.customId == "cancel")
                await buttonInteraction.update(containers.edit(containers.neutral("None of your filters have been deleted")));
        });

        buttonCollector.on("end", async (collected) => {
            if(collected.size === 0)
                await interaction.editReply(containers.edit(containers.neutral("No button was pressed. None of your filters have been deleted")));
        });
    });

    selectCollector.on("end", async (collected) => {
        if(collected.size === 0)
            await interaction.editReply(containers.edit(containers.neutral("No filters were selected. None of your filters have been deleted")));
    });
}

function BuildActionRow() {
    const btnDelete = new ButtonBuilder()
        .setCustomId('delete')
        .setLabel('Delete Filters')
        .setStyle(ButtonStyle.Danger);

    const btnCancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(btnCancel, btnDelete);

    return buttons;
}
