import { Client, Embed, EmbedBuilder, TextChannel } from "discord.js";
import { ResultAlert } from "../models";
import embeds from "../utils/embedUtils";
import { BuildAttachment, BuildRolesString, BuildStarsString } from "./helpers/alertsHelper";

export default async function SendResultAlerts(client: Client<boolean>, resultAlerts: ResultAlert[]) {
    resultAlerts.forEach((resultAlert: ResultAlert) => {
        const { url, event, type, stars, teamX_Name, teamX_Score, teamY_Name, teamY_Score } = resultAlert.result;

        const embed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setTitle(`${teamX_Name} [ ${teamX_Score} ] - [ ${teamY_Score} ] ${teamY_Name}`)
            .setDescription(`🏆 ${teamX_Score > teamY_Score ? teamX_Name : teamY_Name} won the match\n\u200b`)
            .setAuthor({ name: 'hltv.org', iconURL: `attachment://hltv.png`, url: url })
            .setURL(url)
            .setTimestamp();

        const censoredEmbed = new EmbedBuilder()
            .setColor(embeds.successHex)
            .setTitle(`${teamX_Name} [ ? ] - [ ? ] ${teamY_Name}`)
            .setDescription(`⏱️ The match has ended\n\u200b`)
            .setAuthor({ name: 'hltv.org', iconURL: `attachment://hltv.png`, url: url })
            .setURL(url)
            .setTimestamp();

        const starsField = { name: 'Stars ', value: `${BuildStarsString(stars)} `, inline: true}

        const remainingFields = [
            { name: 'Event ', value: `${event} `, inline: true},
            { name: ["bo3", "bo5", "bo7"].includes(type) ? 'Format' : 'Map', value: `${type}`, inline: true},
            { name: '\u200b', value: `**[Matchpage](${url})**`} 
        ]

        if (stars > 0) {
            embed.addFields(starsField);
            censoredEmbed.addFields(starsField);
        }

        embed.addFields(remainingFields)
        censoredEmbed.addFields(remainingFields)

        resultAlert.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelId) as TextChannel;

            if(!channel)
                return;
            
            await channel.send({ 
                content: guild.mentionOnResults ? BuildRolesString(guild.roleIds) : "",
                files: [BuildAttachment()],
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