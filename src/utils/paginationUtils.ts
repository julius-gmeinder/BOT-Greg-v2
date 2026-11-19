import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, ContainerBuilder } from "discord.js";
import containers from "./containerUtils";
import logger from "./logger";

// a message with components v2 can not display more than 4000 characters, some of them are needed for the heading and summary
const maxPageLength = 3500;
const maxEntriesPerPage = 10;
const collectorTime = 300_000;

export type PaginationOptions = {
    color: number,
    title: string,
    // shown below the title, e. g. the count and hints
    summary: string,
    entries: string[]
}

// splits the entries into pages, a page is full after 10 entries or when its text would get too long
export function SplitPages(entries: string[]): string[][] {
    const pages: string[][] = [];
    let page: string[] = [];
    let length = 0;

    for(const entry of entries) {
        const entryLength = entry.length + 2;

        if(page.length > 0 && (page.length >= maxEntriesPerPage || length + entryLength > maxPageLength)) {
            pages.push(page);
            page = [];
            length = 0;
        }

        page.push(entry);
        length += entryLength;
    }

    if(page.length > 0)
        pages.push(page);

    return pages;
}

function BuildPageContainer(interaction: ChatInputCommandInteraction, options: PaginationOptions, pages: string[][], pageIndex: number, disabled: boolean): ContainerBuilder {
    const container = containers.titled(options.color, options.title)
        .addTextDisplayComponents(containers.text(options.summary))
        .addSeparatorComponents(containers.divider())
        .addTextDisplayComponents(containers.text(pages[pageIndex].join("\n\n")));

    if(pages.length > 1) {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${interaction.id}-first`)
                .setLabel("⏮")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || isFirst),
            new ButtonBuilder()
                .setCustomId(`${interaction.id}-prev`)
                .setLabel("◀")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || isFirst),
            new ButtonBuilder()
                .setCustomId(`${interaction.id}-page`)
                .setLabel(`${pageIndex + 1} / ${pages.length}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`${interaction.id}-next`)
                .setLabel("▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || isLast),
            new ButtonBuilder()
                .setCustomId(`${interaction.id}-last`)
                .setLabel("⏭")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || isLast)
        );

        container.addActionRowComponents(buttons);
    }

    return container;
}

// shows the entries on the (already deferred) reply of the interaction. Only the user of the command can switch pages
export async function SendPaginated(interaction: ChatInputCommandInteraction, options: PaginationOptions) {
    const pages = SplitPages(options.entries);
    let pageIndex = 0;

    const reply = await interaction.editReply(containers.edit(BuildPageContainer(interaction, options, pages, pageIndex, false)));

    if(pages.length <= 1)
        return reply;

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: collectorTime,
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith(interaction.id)
    });

    collector.on("collect", async (componentInteraction) => {
        if(componentInteraction.customId.endsWith("first"))
            pageIndex = 0;

        if(componentInteraction.customId.endsWith("last"))
            pageIndex = pages.length - 1;

        if(componentInteraction.customId.endsWith("prev"))
            pageIndex = Math.max(pageIndex - 1, 0);

        if(componentInteraction.customId.endsWith("next"))
            pageIndex = Math.min(pageIndex + 1, pages.length - 1);

        await componentInteraction.update(containers.edit(BuildPageContainer(interaction, options, pages, pageIndex, false)))
            .catch((err) => logger.error("commands", `${err} encountered while changing the page`));
    });

    // disable the buttons, the reply might have been dismissed already
    collector.on("end", async () => {
        await interaction.editReply(containers.edit(BuildPageContainer(interaction, options, pages, pageIndex, true))).catch(() => undefined);
    });

    return reply;
}
