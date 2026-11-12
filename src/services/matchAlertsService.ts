import { Client, EmbedBuilder, TextChannel } from "discord.js";
import embeds from "../utils/embedUtils";
import { MatchAlert } from "../models";
import { ApplyMatchSource, BuildMatchFields, BuildMatchFiles, BuildRolesString, BuildVersusString, GetUnixTimestamp } from "./helpers/alertsHelper";

export default async function SendMatchAlerts(client: Client<boolean>, matchAlerts: MatchAlert[]) {
    matchAlerts.forEach((matchAlert: MatchAlert) => {
        const { match } = matchAlert;

        const embed = new EmbedBuilder()
            .setColor(embeds.neturalHex)
            .setTitle(BuildVersusString(match))
            .setDescription(`🔴 Live **<t:${GetUnixTimestamp(match.dateTime)}:R>**\n\u200b`)
            .setTimestamp()
            .addFields(BuildMatchFields(match));

        ApplyMatchSource(embed, match);

        matchAlert.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                return;

            await channel.send({
                // no roles (disabled role management) => no mention
                content: BuildRolesString(guild.roleDiscordIds),
                files: BuildMatchFiles(match),
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
