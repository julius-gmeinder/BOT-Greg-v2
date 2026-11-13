import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ChatInputCommandInteraction, ContainerBuilder, MessageFlags, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import alerts from "../../services/api/alerts";
import settings from "../../services/api/settings";
import { AlertConfigStateItem, AlertConfigDTO, AlertConfigResDTO } from "../../models";
import containerUtils from "../../utils/containerUtils";
import colorUtils from "../../utils/colorUtils";
import { EscapeLinkUrl, GetUnixTimestamp } from "../../services/helpers/alertsHelper";

export async function alertsConfigAsync(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const currentConfigRes = await alerts.getConfig(interaction.guildId!);
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(currentConfigRes.status !== 200 || roleManagement === null)
        return interaction.editReply(containerUtils.edit(containerUtils.error("There has been an error running the command")));

    const currentConfig = await currentConfigRes.json() as AlertConfigDTO;
    const containerState = initContainerState(currentConfig);
    let container = buildContainer(interaction, containerState, currentConfig, roleManagement);

    const reply = await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] })

    const collector = reply.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60_000
    });

    collector.on('collect', async (componentInteraction) => {
        await componentInteraction.deferUpdate();

        const componentId = componentInteraction.customId;

        if (componentInteraction.isChannelSelectMenu()) {
            const selectedChannelId = componentInteraction.values[0] ?? null;

            if (componentId.endsWith('match')) {
                containerState.match.channelId = selectedChannelId;
                containerState.match.enabled = selectedChannelId !== null
            }

            if (componentId.endsWith('result')) {
                containerState.result.channelId = selectedChannelId;
                containerState.result.enabled = selectedChannelId !== null
            }
        }

        if (componentInteraction.isButton()) {
            if (componentId.endsWith('match-toggle'))
                containerState.match.enabled = !containerState.match.enabled;

            if (componentId.endsWith('result-toggle'))
                containerState.result.enabled = !containerState.result.enabled;

            if(componentId.endsWith('save')) {
                collector.stop('finished');

                await componentInteraction.editReply({
                    components: [containerUtils.success("Saving config...")]
                });

                // a channel is all a server needs to receive alerts.
                // The alert role is not part of the config anymore, it exists if (and only if) the role management is enabled
                const setConfigRes = await alerts.setConfig(interaction.guildId!, {
                    matchAlertChannelDiscordId: containerState.match.enabled ? containerState.match.channelId : null,
                    resultAlertChannelDiscordId: containerState.result.enabled ? containerState.result.channelId : null
                });

                if(setConfigRes.status !== 200)
                    return componentInteraction.editReply({ components: [containerUtils.error("There has been an error running the command")] });

                const configRes = await setConfigRes.json() as AlertConfigResDTO;
                const savedContainer = buildSavedContainer(currentConfig, configRes, roleManagement)
                return componentInteraction.editReply({ components: [savedContainer] });
            }

            if(componentId.endsWith('cancel')) {
                collector.stop('finished');
                return componentInteraction.editReply({ components: [containerUtils.neutral("Your config has not been updated")]})
            }
        }

        container = buildContainer(interaction, containerState, currentConfig, roleManagement);
        await componentInteraction.editReply({ components: [container] });
    });

    collector.on('end', async (_, reason) => {
        if(reason === "finished")
            return;

        return interaction.editReply({ components: [containerUtils.neutral("The command has expired. Your config has not been updated")]})
    });
}

function initContainerState(currentConfig: AlertConfigDTO): Record<string, AlertConfigStateItem> {
    const containerState: Record<string, AlertConfigStateItem> = {
        match: {
            title: "Match Alerts",
            enabledDesc: "Select the channel you want to receive **match alerts** in",
            disabledDesc: "-# Enable match alerts to select a channel",
            enabled: currentConfig.matchAlertChannelDiscordId !== null,
            channelId: currentConfig.matchAlertChannelDiscordId
        },
        result: {
            title: "Result Alerts",
            enabledDesc: "Select the channel you want to receive **result alerts** in",
            disabledDesc: "-# Enable result alerts to select a channel",
            enabled: currentConfig.resultAlertChannelDiscordId !== null,
            channelId: currentConfig.resultAlertChannelDiscordId
        },
    };

    return containerState;
}

function buildContainer(interaction: ChatInputCommandInteraction, state: Record<string, AlertConfigStateItem>, currentConfig: AlertConfigDTO, roleManagement: boolean) {
    let container = new ContainerBuilder()
        .setAccentColor(colorUtils.neturalHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Alerts configuration"))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))

        Object.entries(state).forEach(([key, data]) => {
            const subSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${data.title}`))
                .setButtonAccessory(new ButtonBuilder()
                    .setCustomId(`${interaction.id}-${key}-toggle`)
                    .setLabel(data.enabled ? "Disable" : "Enable")
                    .setStyle(data.enabled ? ButtonStyle.Secondary : ButtonStyle.Success)
                );

            container.addSectionComponents(subSection);

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(data.enabled ? data.enabledDesc : data.disabledDesc)
            );

            if (data.enabled) {
                const select = new ChannelSelectMenuBuilder()
                .setCustomId(`${interaction.id}-${key}`)
                .setPlaceholder("Select channel")
                .setMinValues(0)
                .setMaxValues(1)
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)

                if (data.channelId !== null)
                    select.setDefaultChannels(data.channelId)

                const selectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(select)
                container.addActionRowComponents(selectRow);
            }

            container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Large))
        });

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Mentions\n${buildMentionsString(currentConfig, roleManagement)}`));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${interaction.id}-cancel`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`${interaction.id}-save`)
                .setLabel('Save Config')
                .setStyle(ButtonStyle.Primary)
        );
        container.addActionRowComponents(buttons);

    return container;
}

// the alert role only exists if the role management is enabled, otherwise alerts are sent without mentions
function buildMentionsString(config: AlertConfigDTO, roleManagement: boolean): string {
    if(roleManagement && config.alertRoleDiscordId !== null)
        return `<@&${config.alertRoleDiscordId}> is mentioned for every alert\n-# Members can choose their roles with \`/roles\``;

    return `Alerts are sent **without mentions**\n-# Want Greg to mention roles? Enable the role management with \`/settings role-management\``;
}

function buildSavedContainer(oldConfig: AlertConfigDTO, configRes: AlertConfigResDTO, roleManagement: boolean) {
    const { newConfig } = configRes;

    const container = new ContainerBuilder()
        .setAccentColor(colorUtils.successHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Config saved"))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))

    let matchesTitle = buildTitleString(oldConfig.matchAlertChannelDiscordId, newConfig.matchAlertChannelDiscordId, "### Match alerts ")
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(matchesTitle))
    addMatchBlock(container, configRes);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Large));

    let resultsTitle = buildTitleString(oldConfig.resultAlertChannelDiscordId, newConfig.resultAlertChannelDiscordId, "### Result alerts ")
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(resultsTitle))
    addResultsBlock(container, configRes);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Large));

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Mentions\n${buildMentionsString(newConfig, roleManagement)}`));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));

    // new servers start with the default filter (hltv covered matches), so this only applies to servers that deleted all of their filters
    if(configRes.filterCount === 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

        const miscString = `*You have no filters, so you get an alert for every single match.\nSome of these alerts don't interest you?\nCustomize your alerts with \`/filters add\`*`
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(miscString))
    }

    return container;
}

function buildTitleString(oldVal: string | null, newVal: string | null, partialTitle: string) {
    if(oldVal === newVal)
        newVal === null ? partialTitle += "inactive 💤" : partialTitle += "active ⚡";
    else
        newVal === null ? partialTitle += "disabled 💥" : partialTitle += "enabled ✨";

    return partialTitle;
}

function addMatchBlock(container: ContainerBuilder, configRes: AlertConfigResDTO) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));

    if(configRes.newConfig.matchAlertChannelDiscordId === null) {
        const descString = `-# Match alerts are currently not enabled`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    }
    else {
        const match = configRes.guildsNextUpcomingMatch;

        if(match === null) {
            if(configRes.filterCount === 0) {
                const descString = `There are currently **no upcoming matches**\nYou will get an alert as soon as **any next match** is about to start`;
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
            }
            else {
                const descString = `You won't receive an alert anytime soon. None of the upcoming games match your filters\n*If this seems unexpected, try reviewing your filters with \`/filters list\`*`;
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
            }
        }
        else {
            const descString = `You will get an alert${configRes.filterCount === 0 ? "": " that matches your filters"} **<t:${GetUnixTimestamp(match.dateTime)}:R>** for`;
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));

            // matches that are not covered by hltv link to the liquipedia page of their event
            const [teamX, teamY] = [match.teamX?.name ?? "TBD", match.teamY?.name ?? "TBD"];
            const versusString = `[**${teamX}** vs **${teamY}**](${EscapeLinkUrl(match.hltvUrl ?? match.eventUrl)})\n-# ${match.eventName}`;
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(versusString));
        }
    }
}

// the api no longer knows live matches (liquipedia only has upcoming matches and results), so there is no preview of running matches
function addResultsBlock(container: ContainerBuilder, configRes: AlertConfigResDTO) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));

    if(configRes.newConfig.resultAlertChannelDiscordId === null) {
        const descString = `-# Result alerts are currently not enabled`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    }
    else {
        const descString = configRes.filterCount === 0
            ? `You will get a result alert as soon as **any next match** ends`
            : `You will get a result alert as soon as the next match that matches your filters ends`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    }
}
