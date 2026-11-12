import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, CommandInteraction, ComponentType, EmbedBuilder, GuildMemberRoleManager, MessageFlags, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder } from "discord.js";
import roles from "../../services/API/roles";
import links from "../../services/API/links";
import { readErrorCode } from "../../services/API/request";
import settings from "../../services/API/settings";
import embeds from "../../utils/embedUtils";
import { roleManagementDisabledMessage } from "../../utils/roleUtils";

export async function roleLink(interaction: CommandInteraction) {
    // role links only exist with role management, without it the bot has no roles that could be linked
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(roleManagement === false)
        return interaction.reply({ embeds: [embeds.neutral(roleManagementDisabledMessage)], flags: [MessageFlags.Ephemeral] });

    const res = await roles.getRoles(interaction.guildId!);

    if(res.status !== 200)
        return interaction.reply({ embeds: [embeds.error("There has been an error running the command")]});

    const botRoleIds = await res.json() as string[];
    const linkedRoleIds = FilterServerRoleIds(interaction, botRoleIds);

    const optionsPerSelect: number = 25;
    const linkedRoleIdsChunks: string[][] = [];
    const pageAmount: number = (linkedRoleIds.length - (linkedRoleIds.length % optionsPerSelect)) / optionsPerSelect;
    let pageNumber: number = 0;

    let selectedBotRoleId: string = "";
    let selectedLinkedRoleId: string = "";

    if(botRoleIds.length <= 0)
        return interaction.reply({ embeds: [embeds.error("The bot currently doesnt have any roles on this server")], flags: [MessageFlags.Ephemeral]});

    // Split linkedRoleIds into chunks of 25 --> for paging
    for (let i = 0; i < linkedRoleIds.length; i += optionsPerSelect) {
        const chunk = linkedRoleIds.slice(i, i + optionsPerSelect);
        linkedRoleIdsChunks.push(chunk);
    }

    const embed = new EmbedBuilder()
        .setColor(embeds.neturalHex)
        .setTitle("Select Roles")
        .setTimestamp()
        .setDescription("Select the roles you want to link together");

    const reply = await interaction.reply({ embeds: [embed], components: [BuildBotRoleRowArray(interaction, botRoleIds)], flags: [MessageFlags.Ephemeral]});

    // BotRoleCollector: Select the bots role to link to another one
    const botRoleCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id && i.customId == `${interaction.id}1`
    });

    botRoleCollector.on("collect", async (selectInteraction) => {
        selectedBotRoleId = selectInteraction.values[0];

        embed.addFields({ name: 'Link', value: `<@&${selectedBotRoleId}>`, inline: true});
    
        await selectInteraction.update({ embeds: [embed], components: [BuildLinkedRoleRow(interaction, linkedRoleIdsChunks[pageNumber]), BuildPaginationButtonRow(pageNumber, pageAmount)]});
        await botRoleCollector.stop();
    });

    // PaginationButtonCollector: Switch trough pages in case theres >= 25 roles that could be linked
    const paginationButtonCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
    });

    paginationButtonCollector.on("collect", async (paginationButtonCollector: ButtonInteraction) => {
        if(paginationButtonCollector.customId == "back" && (pageNumber -= 1) < 0)
            pageNumber += 1;

        if(paginationButtonCollector.customId == "next" && (pageNumber += 1) > pageAmount)
            pageNumber -= 1;

        await paginationButtonCollector.update({ embeds: [embed], components: [BuildLinkedRoleRow(interaction, linkedRoleIdsChunks[pageNumber]), BuildPaginationButtonRow(pageNumber, pageAmount)]});
    });

    // LinkedRoleCollector: Select role to link to bots role
    const linkedRoleCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id && i.customId == `${interaction.id}2`
    });

    linkedRoleCollector.on("collect", async (selectInteraction) => {
        selectedLinkedRoleId = selectInteraction.values[0];

        embed.addFields(
            { name: '\u200b', value: `🔗`, inline: true},
            { name: 'To', value: `<@&${selectedLinkedRoleId}>`, inline: true}
        );
        
        await selectInteraction.update({ embeds: [embed], components: [BuildButtonRow()]});
        await linkedRoleCollector.stop();
        await paginationButtonCollector.stop();
    });

    // Button Collector: Cancel or Link up the selected roles
    const buttonCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
    });

    buttonCollector.on("collect", async (buttonInteraction: ButtonInteraction) => {
        if(buttonInteraction.customId == "link") {

            const res = await links.link({
                botRoleDiscordId: selectedBotRoleId,
                linkedRoleDiscordId: selectedLinkedRoleId,
                guildDiscordId: interaction.guild!.id
            });

            if(res.status === 204) {
                const embed = new EmbedBuilder()
                    .setColor(embeds.successHex)
                    .setTitle("Linking successful")
                    .setTimestamp()
                    .setDescription(`<@&${selectedBotRoleId}> 🔗 <@&${selectedLinkedRoleId}>`)
    
                return buttonInteraction.update({embeds: [embed], components: []});
            }

            if (res.status === 409) {
                const data = await readErrorCode(res);

                // the role management was disabled while the command was running
                if(data === "roleManagement")
                    return buttonInteraction.update({embeds: [embeds.neutral(roleManagementDisabledMessage)], components: []});

                if(data === "limit")
                    return buttonInteraction.update({embeds: [embeds.error("You have reached the maximum amount of links (20) for this server")], components: []});
        
                if(data === "duplicate")
                    return buttonInteraction.update({embeds: [embeds.error("These two roles were already linked")], components: []});
            }

            return buttonInteraction.update({embeds: [embeds.error("There has been an error running the command")], components: []});
        }

        if(buttonInteraction.customId == "cancel")
            return buttonInteraction.update({embeds: [embeds.neutral("Roles have not been linked")], components: []});
    });

    buttonCollector.on("end", async (collected) => {
        if(collected.size === 0)
            await reply.edit({embeds: [embeds.neutral("No button was pressed. Roles have not been linked")], components: []});
    });
}

function BuildBotRoleRowArray(interaction: CommandInteraction, botRoleIds: string[]) {
    const botSelect = new StringSelectMenuBuilder()
        .setCustomId(`${interaction.id}1`)
        .setPlaceholder('Select Bots Role to link')

    botRoleIds.forEach(async (id: string) => {
        const role = interaction.guild?.roles.cache.get(id);

        botSelect.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(role?.name ?? id)
                .setValue(id)
        );
    });

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(botSelect);
}

function BuildLinkedRoleRow(interaction: CommandInteraction, linkedRoleIds: string[]) {
    const linkSelect = new StringSelectMenuBuilder()
        .setCustomId(`${interaction.id}2`)
        .setPlaceholder('Select Role to link')

    linkedRoleIds.forEach(async (id: string) => {
        const role = interaction.guild?.roles.cache.get(id);

        linkSelect.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(role?.name ?? id)
                .setValue(id)
        );
    });

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(linkSelect);
}

function BuildPaginationButtonRow(pageNumber: number, pageAmount: number) {
    pageNumber += 1;
    pageAmount += 1;

    const btnBack = new ButtonBuilder()
        .setCustomId('back')
        .setLabel('Last Page')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageNumber === 1 ? true : false);

    const pageCount = new ButtonBuilder()
        .setCustomId('pagecount')
        .setLabel(`${pageNumber}/${pageAmount}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const btnNext = new ButtonBuilder()
        .setCustomId('next')
        .setLabel("Next Page")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageNumber === pageAmount ? true : false);

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(btnBack, pageCount, btnNext)
    return buttons;
}

function BuildButtonRow() {
    const btnLink = new ButtonBuilder()
        .setCustomId('link')
        .setLabel('Link Roles')
        .setStyle(ButtonStyle.Success);

    const btnCancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(btnCancel, btnLink);
    return buttons;
}

function FilterServerRoleIds(interaction: CommandInteraction, botRoleIds: string[])
{
    const serverRoleIds = interaction.guild?.roles.cache.map(role => role.id) as string[];

    const rolesToRemove = Array.from(botRoleIds);
    rolesToRemove.push(interaction.guild?.roles.everyone.id!);
    rolesToRemove.push(interaction.guild?.roles.premiumSubscriberRole?.id!)

    return serverRoleIds?.filter(x => !rolesToRemove.includes(x)) as string[];
}