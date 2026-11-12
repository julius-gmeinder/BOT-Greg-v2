import { Client, EmbedBuilder, TextChannel } from "discord.js";
import embeds from "../utils/embedUtils";
import { MatchDelay } from "../models";
import { BuildAttachment, BuildRolesString, GetUnixTimestamp } from "./helpers/alertsHelper";

export default async function SendMatchDelays(client: Client<boolean>, matchDelays: MatchDelay[]) {
    matchDelays.forEach((matchDelay: MatchDelay) => {
        const { url, teamX, teamY, date, time } = matchDelay.match;

        const embed = new EmbedBuilder()
            .setColor(embeds.warningHex)
            .setAuthor({ name: 'hltv.org', iconURL: `attachment://hltv.png`, url: url })
            .setTitle(`${teamX} vs ${teamY} delayed`)
            .setURL(url)
            .setDescription(`🔴 Live **<t:${GetUnixTimestamp(date, time)}:R>**\n\u200b`)
            .setTimestamp();
        
        matchDelay.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelId) as TextChannel;

            if(!channel)
                return;
            
            await channel.send({ 
                content: guild.mentionOnDelays ? BuildRolesString(guild.roleIds) : "",
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