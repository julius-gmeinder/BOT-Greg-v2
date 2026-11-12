import { CommandInteraction, EmbedBuilder, inlineCode, MessageFlags } from "discord.js";
import filtersMatRes from "../../services/API/filtersMatRes";
import { FilterMatRes, FilterNews } from "../../models";
import embedUtils from "../../utils/embedUtils";
import filtersNews from "../../services/API/filtersNews";

export async function filtersList(interaction: CommandInteraction) {
    const embeds = [];

    const filtersRes = await filtersMatRes.getFilters(interaction.guildId!);
    const filtersNewsRes = await filtersNews.getFilters(interaction.guildId!);

    if(filtersRes.status !== 200 && filtersNewsRes.status !== 200)
        return interaction.reply({ embeds: [embedUtils.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});

    if(filtersRes.status === 200) {
        const data = await filtersRes.json() as FilterMatRes[];
        
        if(data.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(embedUtils.errorHex)
                .addFields({ name: "There are no filters for matches and results at the moment", value: `Add some with \`/filters add matches-and-results\``});
            embeds.push(embed);
        }

        const filtersPerEmbed: number = 10;
        const pageAmount: number = (data.length - (data.length % filtersPerEmbed)) / filtersPerEmbed + 1;
        let pageNumber: number = 1;

        for (let i = 0; i < data.length; i += filtersPerEmbed) {
            const chunk: Array<FilterMatRes> = data.slice(i, i + filtersPerEmbed);

            const embed = new EmbedBuilder()
                .setColor(embedUtils.neturalHex)

            if(i == 0) {
                embed.setTitle("Filters")
                    .setDescription(`Found **${data.length} matches and results** filter${data.length > 1 ? "s" : ""}`)
                    .setThumbnail(interaction.guild!.iconURL());
            }

            chunk.forEach((filter: FilterMatRes) => {
                const valueFields: string[] = [];
                const emptyFields: string[] = [];

                filter.team ? valueFields.push(`Team: ${filter.team}`) : emptyFields.push("Team");
                filter.event ? valueFields.push(`Event: ${filter.event}`) : emptyFields.push("Event");
                filter.eventTier ? valueFields.push(`Event Tier: ${filter.eventTier}`) : emptyFields.push("Event Tier");
                filter.vrsRank ? valueFields.push(`VRS Rank: ${filter.vrsRank}`) : emptyFields.push("VRS Rank");
                filter.stars ? valueFields.push(`Stars: ${filter.stars}`) : emptyFields.push("Stars");

                embed.addFields(
                    { name: '\u200b', value: `Filter **${filter.nr}** ➖ <@&${filter.roleId}>`, inline: false},
                    { name: `${valueFields.join(", ")}`, value: `${emptyFields.join(", ")}: 🚫`, inline: false }
                );
            });

            embeds.push(embed);
            pageNumber++;
        }
    }

    if(filtersNewsRes.status === 200) {
        const data = await filtersNewsRes.json() as FilterNews[]; 
        
        if(data.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(embedUtils.errorHex)
                .addFields({ name: "There are no filters for news at the moment", value: `Add some with \`/filters add news\``});
            embeds.push(embed);
        }

        const filtersPerEmbed: number = 10;
        const pageAmount: number = (data.length - (data.length % filtersPerEmbed)) / filtersPerEmbed + 1;
        let pageNumber: number = 1;

        for (let i = 0; i < data.length; i += filtersPerEmbed) {
            const chunk: Array<FilterNews> = data.slice(i, i + filtersPerEmbed);

            const embed = new EmbedBuilder()
                .setColor(embedUtils.neturalHex)

            if(i == 0) {
                embed.setTitle("Filters")
                    .setDescription(`Found **${data.length} news** filter${data.length > 1 ? "s" : ""}`)
                    .setThumbnail(interaction.guild!.iconURL());
            }

            chunk.forEach((filter: FilterNews) => {
                // Change back to the old logic used in "matches-and-results" if more parameters are added to the news filter
                embed.addFields(
                    { name: '\u200b', value: `Filter **${filter.nr}** ➖ <@&${filter.roleId}>`, inline: false},
                    { name: `Article Type`, value: `${filter.articleType}`, inline: false }
                );
            });

            embeds.push(embed);
            pageNumber++;
        }
    }

    return interaction.reply({ embeds: embeds, flags: [MessageFlags.Ephemeral] });
}