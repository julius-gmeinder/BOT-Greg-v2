import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import links from "../../services/api/links";
import settings from "../../services/api/settings";
import containers from "../../utils/containerUtils";
import { roleManagementDisabledMessage } from "../../utils/roleUtils";

export async function roleUnlink(interaction: CommandInteraction) {
    // role links only exist with role management (disabling it deletes all links)
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(roleManagement === false)
        return interaction.reply(containers.reply(containers.neutral(roleManagementDisabledMessage)));

    const res = await links.getLinkedBotRoles(interaction.guildId!);

    if(res.status !== 200)
        return interaction.reply(containers.reply(containers.error("There has been an error running the command")));

    const botRoleIds = await res.json() as string[];

    let selectedBotRoleId: string = "";
    let selectedLinkedRoleId: string = "";

    if(botRoleIds.length <= 0)
        return interaction.reply(containers.reply(containers.error("There currently arent any role links on this server")));

    // the container is rebuilt on every step, it shows the roles that are already selected above the current select-menu / buttons
    const buildContainer = (row: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>) => {
        const container = containers.titled(containers.neutralHex, "Select Roles", "Select the roles you want to unlink");

        if(selectedBotRoleId)
            container.addTextDisplayComponents(containers.text(`<@&${selectedBotRoleId}> ⛓️‍💥 ${selectedLinkedRoleId ? `<@&${selectedLinkedRoleId}>` : "…"}`));

        return container
            .addSeparatorComponents(containers.divider())
            .addActionRowComponents(row);
    };

    const reply = await interaction.reply(containers.reply(buildContainer(BuildBotRoleRow(interaction, botRoleIds))));

    // BotRoleCollector: Select the bots role to unlink another role from
    const botRoleCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id && i.customId == `${interaction.id}1`
    });

    botRoleCollector.on("collect", async (selectInteraction) => {
        selectedBotRoleId = selectInteraction.values[0];

        const res = await links.getLinkedRoles(selectedBotRoleId);

        if(res.status !== 200)
            return selectInteraction.update(containers.edit(containers.error("There has been an error running the command")));

        const linkedRoleIds = await res.json() as string[];

        await selectInteraction.update(containers.edit(buildContainer(BuildLinkedRoleRow(interaction, linkedRoleIds))));
        await botRoleCollector.stop();
    });

    // LinkedRoleCollector: Select role to unlink to bots role
    const linkedRoleCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id && i.customId == `${interaction.id}2`
    });

    linkedRoleCollector.on("collect", async (selectInteraction) => {
        selectedLinkedRoleId = selectInteraction.values[0];

        await selectInteraction.update(containers.edit(buildContainer(BuildButtonRow())));
        await linkedRoleCollector.stop();
    });

    // Button Collector: Cancel or Unlink the selected roles
    const buttonCollector = await reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
    });

    buttonCollector.on("collect", async (buttonInteraction: ButtonInteraction) => {
        if(buttonInteraction.customId == "unlink") {
            
            const res = await links.unlink({
                botRoleDiscordId: selectedBotRoleId,
                linkedRoleDiscordId: selectedLinkedRoleId,
            });

            if(res.status === 204) {
                return buttonInteraction.update(containers.edit(containers.titled(containers.errorHex, "Unlinking successful", `<@&${selectedBotRoleId}> ⛓️‍💥 <@&${selectedLinkedRoleId}>`)));
            }

            return buttonInteraction.update(containers.edit(containers.error("There has been an error running the command")));
        }

        if(buttonInteraction.customId == "cancel")
            return buttonInteraction.update(containers.edit(containers.neutral("Roles have not been unlinked")));
    });

    buttonCollector.on("end", async (collected) => {
        if(collected.size === 0)
            await reply.edit(containers.edit(containers.neutral("No button was pressed. Roles have not been unlinked")));
    });
}

function BuildBotRoleRow(interaction: CommandInteraction, botRoleIds: string[]) {
    const botSelect = new StringSelectMenuBuilder()
        .setCustomId(`${interaction.id}1`)
        .setPlaceholder('Select Bots Role to unlink')

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
        .setPlaceholder('Select Role to unlink')

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

function BuildButtonRow() {
    const btnUnlink = new ButtonBuilder()
        .setCustomId('unlink')
        .setLabel('Unlink Roles')
        .setStyle(ButtonStyle.Danger);

    const btnCancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(btnCancel, btnUnlink);

    return buttons;
}