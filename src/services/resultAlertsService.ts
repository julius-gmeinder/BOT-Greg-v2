import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { Result, ResultAlert } from "../models";
import embeds from "../utils/embedUtils";
import { ApplyMatchSource, BuildMatchFields, BuildMatchFiles, BuildRolesString } from "./helpers/alertsHelper";

export default async function SendResultAlerts(client: Client<boolean>, resultAlerts: ResultAlert[]) {
    resultAlerts.forEach((resultAlert: ResultAlert) => {
        const { result } = resultAlert;
        const { teamXMapScore, teamYMapScore, isForfeit } = result;

        const teamXName = result.teamX?.name ?? "TBD";
        const teamYName = result.teamY?.name ?? "TBD";

        let outcome = `🤝 The match ended in a draw`;
        if(teamXMapScore !== teamYMapScore)
            outcome = `🏆 ${teamXMapScore > teamYMapScore ? teamXName : teamYName} won the match${isForfeit ? " by forfeit" : ""}`;

        const embed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setTitle(`${teamXName} [ ${teamXMapScore} ] - [ ${teamYMapScore} ] ${teamYName}`)
            .setDescription(`${outcome}\n\u200b`)
            .setTimestamp();

        const censoredEmbed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setTitle(`${teamXName} [ ? ] - [ ? ] ${teamYName}`)
            .setDescription(`⏱️ The match has ended\n\u200b`)
            .setTimestamp();

        ApplyMatchSource(embed, result);
        ApplyMatchSource(censoredEmbed, result);

        const fields = BuildMatchFields(result);
        const mapsString = BuildMapsString(result);

        // the round scores would spoil the result, so they are only part of the uncensored embed
        if(mapsString !== null)
            embed.addFields({ name: 'Maps', value: mapsString });

        embed.addFields(fields);
        censoredEmbed.addFields(fields);

        resultAlert.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                return;

            await channel.send({
                // no roles (disabled role management) => no mention, regardless of the setting
                content: guild.mentionOnResults ? BuildRolesString(guild.roleDiscordIds) : undefined,
                files: BuildMatchFiles(result),
                embeds: [guild.censorResults ? censoredEmbed : embed]
            }).catch(async (err) => {
                console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id})`);
                await channel.send({
                    embeds: [embeds.error(
                        `There has been an error sending out a result alert\n
                        Try revising the bots permissions, reinvite Greg or reset your servers configuration.\n\n
                        If the issue persists, feel free to join our [community server](https://discord.gg/xBh6jbNjvT) and contact our team.`
                    )]
                }).catch((err) => console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id}) unable to send error message`));
            });
        });
    });
}

// e. g. "Mirage 13 - 9", only maps that were actually played
function BuildMapsString(result: Result): string | null {
    const maps = result.maps
        .filter(map => map.mapPlayed)
        .map(map => `${map.name} **${map.teamXScore} - ${map.teamYScore}**`);

    return maps.length > 0 ? maps.join("\n") : null;
}
