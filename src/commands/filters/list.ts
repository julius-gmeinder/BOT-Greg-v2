import { CommandInteraction } from "discord.js";
import filters from "../../services/api/filters";
import { Filter } from "../../models";
import containers from "../../utils/containerUtils";
import { BuildFilterText, IsDefaultFilter } from "../../utils/filterUtils";

// a message with components v2 can not display more than 4000 characters, some of them are needed for the heading
const maxListLength = 3500;

export async function filtersList(interaction: CommandInteraction) {
    const filtersRes = await filters.getFilters(interaction.guildId!);

    if(filtersRes.status !== 200)
        return interaction.reply(containers.reply(containers.error("There has been an error running the command")));

    const data = await filtersRes.json() as Filter[];

    if(data.length === 0)
        return interaction.reply(containers.reply(containers.error(
            "### There are no filters at the moment\nWithout filters you get an alert for **every** match and result\nAdd some with `/filters add`"
        )));

    const container = containers.titled(
        containers.neutralHex,
        "Filters",
        `Found **${data.length}** filter${data.length > 1 ? "s" : ""}\n-# A match only has to match one of them`
    );

    container.addSeparatorComponents(containers.divider());

    const blocks: string[] = [];
    let length = 0;

    for (const filter of data) {
        // filters only have a role if the role management is enabled
        const role = filter.roleDiscordId ? ` ➖ <@&${filter.roleDiscordId}>` : "";
        const defaultHint = IsDefaultFilter(filter) ? " *(default)*" : "";
        const block = `Filter **${filter.nr}**${defaultHint}${role}\n${BuildFilterText(filter)}`;

        if(length + block.length > maxListLength) {
            blocks.push(`-# … and ${data.length - blocks.length} more`);
            break;
        }

        blocks.push(block);
        length += block.length + 2;
    }

    container.addTextDisplayComponents(containers.text(blocks.join("\n\n")));

    return interaction.reply(containers.reply(container));
}
