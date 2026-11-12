import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import filtersMatRes from "../../services/API/filtersMatRes";
import embeds from "../../utils/embedUtils";
import embedUtils from "../../utils/embedUtils";
import filtersNews from "../../services/API/filtersNews";

export async function filtersDelete(interaction: ChatInputCommandInteraction) {
    const filtersMatResRes = await filtersMatRes.getFilterRoleIds(interaction.guildId!);
    const filtersNewsRes = await filtersNews.getFilterRoleIds(interaction.guildId!);

    if(filtersMatResRes.status !== 200 && filtersNewsRes.status !== 200)
        return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral] });

    const matResRoleIds = await filtersMatResRes.json() as string[];
    const newsRoleIds = await filtersNewsRes.json() as string[];
    const allRoleIds = matResRoleIds.concat(newsRoleIds);

    if(allRoleIds.length === 0)
        return interaction.reply({ embeds: [embeds.error("There are currently no filters on your server")], flags: [MessageFlags.Ephemeral] });

    if(CheckPermissions(interaction, allRoleIds)) 
        return interaction.reply({ embeds: [embeds.error("Insufficient Permissions. Please check the bots permissions.\nAlso make sure that one of the bots roles is above all of the filter roles")], flags: [MessageFlags.Ephemeral] });

    const select = new StringSelectMenuBuilder()
        .setCustomId(interaction.id)
        .setPlaceholder('Select filters to delete')
        .setMinValues(0)
        .setMaxValues(allRoleIds.length);

    allRoleIds.forEach(async (id: string) => {
        const role = interaction.guild?.roles.cache.get(id);
        select.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(role?.name ?? id)
                .setValue(id)
        );
    });

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = new EmbedBuilder()
        .setColor(embeds.errorHex)
        .setTitle("Delete filters")
        .setTimestamp()
        .setDescription("Use the select-menu and choose the filters you want to delete");

    const reply = await interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });

    const selectCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id && i.customId == interaction.id
    });

    selectCollector.on("collect", async (selectInteraction) => {
        const selectedIds = selectInteraction.values;

        const embed = new EmbedBuilder()
            .setColor(embeds.errorHex)
            .setTitle("Delete filters?")
            .setDescription("Do you really want to delete the following filters?")
            .setTimestamp()
            .addFields({name: "🗑️ **Selected filters**", value: selectedIds.map(id => `<@&${id}>`).join("\n")});

        const buttonReply = await selectInteraction.update({ embeds: [embed], components: [BuildActionRow()]});

        const buttonCollector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30_000,
            filter: i => i.user.id === interaction.user.id
        });

        buttonCollector.on("collect", async (buttonInteraction: ButtonInteraction) => {
            if(buttonInteraction.customId == "delete") {
                const matResRes = await filtersMatRes.remove({guildId: interaction.guildId!, roleIds: selectedIds})
                const newsRes = await filtersNews.remove({guildId: interaction.guildId!, roleIds: selectedIds})

                if(matResRes.status !== 200 && newsRes.status !== 200)
                    return buttonInteraction.update({embeds: [embedUtils.error("There has been an error running the command")], components: []});

                // Just delete in both tables, shouldnt matter as the roleIds are unique => theyll just be ignored in the table where they dont exist
                const matResDeletedRoleIds: string[] = await matResRes.json() as string[];
                const newsDeletedRoleIds: string[] = await newsRes.json() as string[];
                const allDeletedRoleIds = matResDeletedRoleIds.concat(newsDeletedRoleIds);

                allDeletedRoleIds.forEach(async (roleId: string) => {
                    if(roleId !== null) {
                        const role = await interaction.guild?.roles.cache.get(roleId);
                        await role?.delete();
                    }
                });
                
                const embed = new EmbedBuilder()
                    .setColor(embeds.errorHex)
                    .setTitle("Filters deleted")
                    .setDescription("The selected filters have been deleted successfully")
                    .setTimestamp()

                return buttonInteraction.update({embeds: [embed], components: []});
            }
    
            if(buttonInteraction.customId == "cancel")
                return buttonInteraction.update({embeds: [embedUtils.neutral("None of your filters have been deleted")], components: []});
        });
    
        buttonCollector.on("end", async (collected) => {
            if(collected.size === 0)
            await buttonReply.edit({embeds: [embedUtils.neutral("No button was pressed. None of your filters have been deleted")], components: []});
        });
    });

    selectCollector.on("end", async (collected) => {
        if(collected.size === 0)
            await reply.edit({ embeds:[embeds.neutral("No filters were selected. None of your filters have been deleted")], components:[] });
    });
}

function CheckPermissions(interaction: ChatInputCommandInteraction, roleIds: string[]): boolean {
    const highestBotRole = interaction.guild!.members.me!.roles.highest;
    roleIds.forEach(id => {
        if(interaction.guild!.roles.cache.get(id)!.position > highestBotRole.position)
            return true;
    });
    return false;
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