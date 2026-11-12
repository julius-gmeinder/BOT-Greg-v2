import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, } from "discord.js";
import embeds from "../../../utils/embedUtils";
import colorUtils from "../../../utils/colorUtils";
import filtersNews from "../../../services/API/filtersNews";

export async function filtersAddNews(interaction: ChatInputCommandInteraction) {
    const articleType = interaction.options.getString("article-type");

    if(!articleType)
        return interaction.reply({ embeds: [embeds.error("The article-type parameter is required")], flags: [MessageFlags.Ephemeral]});

    const filterRole = await interaction.guild?.roles.create({
        name: BuildRoleName(articleType),
        permissions: [],
        colors: {
            primaryColor: colorUtils.neturalHex
        }
    }); 

    const res = await filtersNews.add({
        guildId: interaction.guildId!,
        roleId: filterRole!.id,
        articleType: articleType
    });

    if (res.status === 204) {
        const embed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setTitle(`New filter added`)
            .setTimestamp()
            .setDescription(`✨ <@&${filterRole?.id}>`)

        embed.addFields(
            { name: `Article Type`, value: `${articleType}`, inline: false }
        );

        // Change back to the old logic used in "matches-and-results" if more parameters are added to the news filter

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    if(res.status !== 204)
        await interaction.guild?.roles.cache.get(filterRole!.id)?.delete();

    if (res.status === 400) {
        const data = await res.json();

        if(data === "modified")
            return interaction.reply({ embeds: [embeds.error("The article-type shouldnt be modified, sometimes discord causes this.\nPlease try again")], flags: [MessageFlags.Ephemeral]});

        else
            return interaction.reply({ embeds: [embeds.error("There has been an error parsing your parameters. Please check them again")], flags: [MessageFlags.Ephemeral]});
    }

    if (res.status === 409) {
        const data = await res.json();

        if(data === "limit")
            return interaction.reply({ embeds: [embeds.error("You have reached the maximum amount of news filters (20) for this server")], flags: [MessageFlags.Ephemeral]});

        if(data === "duplicate")
            return interaction.reply({ embeds: [embeds.error("This filter already exists")], flags: [MessageFlags.Ephemeral]});
    }
    
    return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});
}

function BuildRoleName(articleType: string): string {
    const prefix: string = "⭕ News:";
    const parts: string[] = [];

    if(articleType)
        parts.push(articleType);

    return `${prefix} ${parts.join(", ")}`;
}