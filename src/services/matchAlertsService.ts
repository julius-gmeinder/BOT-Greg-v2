import { Client, EmbedBuilder, TextChannel } from "discord.js";
import embeds from "../utils/embedUtils";
import { MatchAlert } from "../models";
import { BuildAttachment, BuildRolesString, BuildStarsString, GetUnixTimestamp } from "./helpers/alertsHelper";

export default async function SendMatchAlerts(client: Client<boolean>, matchAlerts: MatchAlert[]) {
    matchAlerts.forEach((matchAlert: MatchAlert) => {
        const { url, event, type, stars, teamX, teamY, date, time } = matchAlert.match;

        const embed = new EmbedBuilder()
            .setColor(embeds.neturalHex)
            .setAuthor({ name: 'hltv.org', iconURL: `attachment://hltv.png`, url: url })
            .setTitle(`${teamX} vs ${teamY}`)
            .setURL(url)
            .setDescription(`🔴 Live **<t:${GetUnixTimestamp(date, time)}:R>**\n\u200b`)
            .setTimestamp();

        if (stars > 0)
            embed.addFields({ name: 'Stars ', value: `${BuildStarsString(stars)} `, inline: true});

        embed.addFields(
            { name: 'Event ', value: `${event} `, inline: true},
            { name: type === "bo3" || type === "bo5" || type === "bo7" ? 'Format' : 'Map', value: `${type}`, inline: true},
            { name: '\u200b', value: `**[Matchpage](${url})**`}
        )
        
        matchAlert.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelId) as TextChannel;

            if(!channel)
                return;
            
            await channel.send({ 
                content: BuildRolesString(guild.roleIds),
                files: [BuildAttachment()],
                embeds: [embed]
            }).catch(async (err) => {
                console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id})`);
                await channel.send({ 
                    embeds: [embeds.error(
                        `There has been an error sending out a match alert\n
                        Try revising the bots permissions, reinvite Greg or reset your servers configuration.\n\n
                        If the issue persists, feel free to join our [community server](https://discord.gg/xBh6jbNjvT) and contact our team.`
                    )]
                }).catch((err) => console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id}) unable to send error message`));
            });
        });
    });
}