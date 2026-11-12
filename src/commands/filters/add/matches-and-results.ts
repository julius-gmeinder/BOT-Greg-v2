import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import embeds from "../../../utils/embedUtils";
import filtersMatRes from "../../../services/API/filtersMatRes";
import colorUtils from "../../../utils/colorUtils";

export async function filtersAddMatRes(interaction: ChatInputCommandInteraction) {
    const team = interaction.options.getString("team");
    const event = interaction.options.getString("event");
    const eventTier = interaction.options.getString("event-tier");
    const vrsRank = interaction.options.getInteger("vrs-rank");
    const stars = interaction.options.getInteger("stars");

    if(!team && !event && !eventTier && !vrsRank && !stars)
        return interaction.reply({ embeds: [embeds.error("Add atleast one parameter: Team, Event, Event-Tier, VRS-Rank or Stars")], flags: [MessageFlags.Ephemeral]});

    if(team && team.length > 64)
        return interaction.reply({ embeds: [embeds.error("The team parameter can not be longer than 64 characters")], flags: [MessageFlags.Ephemeral]});

    if(event && event.length > 64)
        return interaction.reply({ embeds: [embeds.error("The event parameter can not be longer than 64 characters")], flags: [MessageFlags.Ephemeral]});

    if(eventTier && eventTier.length > 8)
        return interaction.reply({ embeds: [embeds.error("The event-tier parameter can not be longer than 8 characters")], flags: [MessageFlags.Ephemeral]});

    if(vrsRank && (vrsRank < 1 || vrsRank > 500))
        return interaction.reply({ embeds: [embeds.error("The vrs-rank paramenter needs to be a number between 1 and 500")], flags: [MessageFlags.Ephemeral]});

    if(stars && (stars < 1 || stars > 5))
        return interaction.reply({ embeds: [embeds.error("The stars paramenter needs to be a number between 1 and 5")], flags: [MessageFlags.Ephemeral]});

    const filterRole = await interaction.guild?.roles.create({
        name: BuildRoleName(team, event, eventTier, vrsRank, stars),
        permissions: [],
        colors: {
            primaryColor: colorUtils.neturalHex
        }
    }); 

    const res = await filtersMatRes.add({
        guildId: interaction.guildId!,
        roleId: filterRole!.id,
        team: team,
        event: event,
        eventTier: eventTier,
        vrsRank: vrsRank,
        stars: stars
    });

    if (res.status === 204) {
        const embed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setTitle(`New filter added`)
            .setTimestamp()
            .setDescription(`✨ <@&${filterRole?.id}>`)

        const valueFields: string[] = [];
        const emptyFields: string[] = [];

        team ? valueFields.push(`Team: ${team}`) : emptyFields.push("Team");
        event ? valueFields.push(`Event: ${event}`) : emptyFields.push("Event");
        eventTier ? valueFields.push(`Event Tier: ${eventTier}`) : emptyFields.push("Event Tier");
        vrsRank ? valueFields.push(`VRS Rank: ${vrsRank}`) : emptyFields.push("VRS Rank");
        stars ? valueFields.push(`Stars: ${stars}`) : emptyFields.push("Stars");

        embed.addFields(
            { name: `${valueFields.join(", ")}`, value: `${emptyFields.join(", ")}: 🚫`, inline: false }
        );

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    }

    if(res.status !== 204)
        await interaction.guild?.roles.cache.get(filterRole!.id)?.delete();

    if (res.status === 400)
        return interaction.reply({ embeds: [embeds.error("There has been an error parsing your parameters. Please check them again")], flags: [MessageFlags.Ephemeral]});

    if (res.status === 409) {
        const data = await res.json();

        if(data === "limit")
            return interaction.reply({ embeds: [embeds.error("You have reached the maximum amount of filters (20) for this server")], flags: [MessageFlags.Ephemeral]});

        if(data === "duplicate")
            return interaction.reply({ embeds: [embeds.error("This filter already exists")], flags: [MessageFlags.Ephemeral]});
    }
    
    return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});
}

function BuildRoleName(team: string | null, event: string | null, eventTier: string | null, vrsRank: number | null, stars: number | null): string {
    const prefix: string = "⭕ Alerts:";
    const parts: string[] = [];

    if(team)
        parts.push(team);

    if(event)
        parts.push(event);

    if(eventTier)
        parts.push(eventTier);

    if(vrsRank)
        parts.push(`Top ${vrsRank.toString()}`);

    if(stars)
        parts.push(`${stars} Star${stars > 1 ? "s" : ""}`)

    return `${prefix} ${parts.join(", ")}`;
}