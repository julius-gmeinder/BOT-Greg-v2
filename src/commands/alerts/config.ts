import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ChatInputCommandInteraction, CommandInteraction, ContainerBuilder, MessageFlags, PermissionFlagsBits, Role, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import alerts from "../../services/API/alerts";
import embedUtils from "../../utils/embedUtils";
import { AlertConfigStateItem, AlertConfigDTO, AlertConfigResDTO, Match } from "../../models";
import containerUtils from "../../utils/containerUtils";
import colorUtils from "../../utils/colorUtils";
import { GetUnixTimestamp } from "../../services/helpers/alertsHelper";

export async function alertsConfigAsync(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const currentConfigRes = await alerts.getConfig(interaction.guildId!);
    
    if(currentConfigRes.status !== 200)
        return interaction.editReply({ embeds: [embedUtils.error("There has been an error running the command")]});

    const currentConfig = await currentConfigRes.json() as AlertConfigDTO;
    const containerState = initContainerState(currentConfig);
    let container = buildContainer(interaction, containerState);

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
            
            if (componentId.endsWith('news')) {
                containerState.news.channelId = selectedChannelId;
                containerState.news.enabled = selectedChannelId !== null
            }
        }
    
        if (componentInteraction.isButton()) {
            if (componentId.endsWith('match-toggle'))
                containerState.match.enabled = !containerState.match.enabled;
            
            if (componentId.endsWith('result-toggle'))
                containerState.result.enabled = !containerState.result.enabled;
            
            if (componentId.endsWith('news-toggle'))
                containerState.news.enabled = !containerState.news.enabled;

            if(componentId.endsWith('save')) {
                collector.stop('finished');

                await componentInteraction.editReply({ 
                    components: [containerUtils.success("Saving config...")] 
                });

                let alertRole: Role | undefined;
                if(currentConfig.alertRoleId === null) {
                    if(!hasManageRoles(interaction))
                        return componentInteraction.editReply({ components: [containerUtils.error("**Insufficient Permissions**\nThe bot does not have the required `Manage Roles` permissions")] });

                    alertRole = await interaction.guild?.roles.create({
                        name: "🔴 Alerts",
                        permissions: [],
                        colors: {
                            primaryColor: colorUtils.neturalHex
                        }
                    });
                }

                const newConfigDTO: AlertConfigDTO = {
                    matchAlertChannelId: containerState.match.enabled ? containerState.match.channelId : null,
                    resultAlertChannelId: containerState.result.enabled ? containerState.result.channelId : null,
                    newsAlertChannelId: containerState.news.enabled ? containerState.news.channelId : null,
                    alertRoleId: alertRole ? alertRole.id : null,
                }

                const setConfigRes = await alerts.setConfig(interaction.guildId!, newConfigDTO)

                if(setConfigRes.status !== 200) {
                    if(currentConfig.alertRoleId === null) {
                        await alertRole?.delete();
                        return componentInteraction.editReply({ embeds: [embedUtils.error("There has been an error running the command")]});
                    }
                }

                const configRes = await setConfigRes.json() as AlertConfigResDTO;
                const savedContainer = buildSavedContainer(currentConfig, configRes)
                return componentInteraction.editReply({ components: [savedContainer] });
            }

            if(componentId.endsWith('cancel')) {
                collector.stop('finished');
                return componentInteraction.editReply({ components: [containerUtils.neutral("Your config has not been updated")]})
            }
        }

        container = buildContainer(interaction, containerState);
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
            enabled: currentConfig.matchAlertChannelId !== null,
            channelId: currentConfig.matchAlertChannelId
        },
        result: {
            title: "Result Alerts",
            enabledDesc: "Select the channel you want to receive **result alerts** in",
            disabledDesc: "-# Enable result alerts to select a channel",
            enabled: currentConfig.resultAlertChannelId !== null,
            channelId: currentConfig.resultAlertChannelId
        },
        news: {
            title: "News Alerts",
            enabledDesc: "Select the channel you want to receive **news alerts** in",
            disabledDesc: "-# Enable news alerts to select a channel",
            enabled: currentConfig.newsAlertChannelId !== null,
            channelId: currentConfig.newsAlertChannelId
        },
    };

    return containerState;
}

function buildContainer(interaction: ChatInputCommandInteraction, state: Record<string, AlertConfigStateItem>) {
    let container = new ContainerBuilder()
        .setAccentColor(embedUtils.neturalHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Alerts configuration"))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))

        Object.entries(state).forEach(([key, data], index) => {
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

function buildSavedContainer(oldConfig: AlertConfigDTO, configRes: AlertConfigResDTO) {
    const { newConfig } = configRes;

    const container = new ContainerBuilder()
        .setAccentColor(colorUtils.successHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("## Config saved"))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small))

    let matchesTitle = buildTitleString(oldConfig.matchAlertChannelId, newConfig.matchAlertChannelId, "### Match alerts ")
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(matchesTitle))
    addMatchBlock(container, configRes);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Large));

    let resultsTitle = buildTitleString(oldConfig.resultAlertChannelId, newConfig.resultAlertChannelId, "### Result alerts ")
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(resultsTitle))
    addResultsBlock(container, configRes);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Large));

    let newsTitle = buildTitleString(oldConfig.newsAlertChannelId, newConfig.newsAlertChannelId, "### News alerts ")
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(newsTitle))
    addNewsBlock(container, configRes);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));

    if(configRes.matResFilterCount === 0 && configRes.newsFilterCount === 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
        
        const miscString = `*Some of these alerts don't interest you?\nCustomize your alerts with \`/filters add\`*`
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

    if(configRes.newConfig.matchAlertChannelId === null) {
        const descString = `-# Match alerts are currently not enabled`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    }
    else {
        const match = configRes.guildsNextUpcomingMatch;

        if(match === null) {
            if(configRes.matResFilterCount === 0) {
                const descString = `There are currently **no upcoming matches**\nYou will get an alert as soon as **any next match** is about to start`;
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
            }
            else {
                const descString = `You won't receive an alert anytime soon. None of the upcoming games match your filters\n*If this seems unexpected, try reviewing your filters with \`/filters list\`*`;
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
            }
        }
        else {
            const descString = `You will get an alert${configRes.matResFilterCount === 0 ? "": " that matches your filters"} **<t:${GetUnixTimestamp(match.date, match.time)}:R>** for`;
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    
            const versusString = `[**${match.teamX}** vs **${match.teamY}**](${match.url})`;
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(versusString));
        }
    }
}

function addResultsBlock(container: ContainerBuilder, configRes: AlertConfigResDTO) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));

    if(configRes.newConfig.resultAlertChannelId === null) {
        const descString = `-# Result alerts are currently not enabled`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    }
    else {
        const liveMatches = configRes.guildsLiveMatches;

        if(liveMatches.length === 0) {
            if(configRes.matResFilterCount === 0) {
                const descString = `There are currently **no matches live**\nYou will get a result alert as soon as **any next match** ends`;
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
            }
            else {
                const descString = `There are currently **no live games** that match your filters\nYou will get a result alert as soon as the next game ends`;
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
            }
        }
        else {
            let singular = liveMatches.length <= 1;
            let matchesStrings: string[] = [];
            liveMatches.forEach(match => matchesStrings.push(`[**${match.teamX_Name}** ${buildMapDots(match.type, match.teamX_MapScore, false)} [${match.teamX_Score ?? "-"}] - [${match.teamY_Score ?? "-"}] ${buildMapDots(match.type, match.teamY_MapScore, true)} **${match.teamY_Name}**](${match.url})`));
    
            let descString = "";
            if(configRes.matResFilterCount === 0)
                descString = `There ${singular ? "is" : "are"} currently **${liveMatches.length} ${singular ? "match" : "matches"}** being played out\nYou will get a result alert when ${singular ? "this match ends" : "one of these matches ends"}`;
            else
                descString = `There ${singular ? "is" : "are"} currently **${liveMatches.length} live ${singular ? "game" : "games"}** that ${singular ? "matches" : "match"} your filters\nYou will get a result alert when ${singular ? "this match ends" : "one of these matches ends"}`;
                
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    
            const matchesFullString = matchesStrings.join("\n");
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(matchesFullString));
        }
    }

    function buildMapDots(matchType: string, mapScore: number | null, reverse: boolean) {
        const totalMapsMap: Record<string, number> = {
            'bo1': 1,
            'bo3': 2,
            'bo5': 3,
            'bo7': 4
        };
    
        const totalDots = totalMapsMap[matchType.toLowerCase()] ?? 1;
        const wins = mapScore ?? 0;
        let dots = "●".repeat(wins) + "○".repeat(Math.max(0, totalDots - wins));
    
        if (reverse)
            dots = [...dots].reverse().join('');
    
        return dots;
    }
}

function addNewsBlock(container: ContainerBuilder, configRes: AlertConfigResDTO) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small));

    if(configRes.newConfig.newsAlertChannelId === null) {
        const descString = `-# News alerts are currently not enabled`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    }
    else {
        const descString = `Sadly i can't predict when HLTVs great writers release an article\nYou will get a news alert${configRes.newsFilterCount === 0 ? "" : " that matches your filters"} as soon as an article is published`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descString));
    }
}

function hasManageRoles(interaction: CommandInteraction): boolean {
    const permissions = interaction.guild?.members.me?.permissions;
    return permissions?.has(PermissionFlagsBits.ManageRoles) ?? false;
}