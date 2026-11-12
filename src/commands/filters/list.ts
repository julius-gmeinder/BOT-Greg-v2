import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import filters from "../../services/API/filters";
import { Filter } from "../../models";
import embedUtils from "../../utils/embedUtils";
import { BuildFilterField, IsDefaultFilter } from "../../utils/filterUtils";

export async function filtersList(interaction: CommandInteraction) {
    const filtersRes = await filters.getFilters(interaction.guildId!);

    if(filtersRes.status !== 200)
        return interaction.reply({ embeds: [embedUtils.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});

    const data = await filtersRes.json() as Filter[];

    if(data.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(embedUtils.errorHex)
            .addFields({
                name: "There are no filters at the moment",
                value: `Without filters you get an alert for **every** match and result\nAdd some with \`/filters add\``
            });

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    const embeds = [];
    const filtersPerEmbed: number = 10;

    for (let i = 0; i < data.length; i += filtersPerEmbed) {
        const chunk: Array<Filter> = data.slice(i, i + filtersPerEmbed);

        const embed = new EmbedBuilder()
            .setColor(embedUtils.neturalHex)

        if(i == 0) {
            embed.setTitle("Filters")
                .setDescription(`Found **${data.length}** filter${data.length > 1 ? "s" : ""}\n-# A match only has to match one of them`)
                .setThumbnail(interaction.guild!.iconURL());
        }

        chunk.forEach((filter: Filter) => {
            // filters only have a role if the role management is enabled
            const role = filter.roleDiscordId ? ` ➖ <@&${filter.roleDiscordId}>` : "";
            const defaultHint = IsDefaultFilter(filter) ? " *(default)*" : "";

            embed.addFields(
                { name: '\u200b', value: `Filter **${filter.nr}**${defaultHint}${role}`, inline: false},
                BuildFilterField(filter)
            );
        });

        embeds.push(embed);
    }

    return interaction.reply({ embeds: embeds, flags: [MessageFlags.Ephemeral] });
}
