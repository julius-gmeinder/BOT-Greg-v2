import { Client, EmbedBuilder, TextChannel } from "discord.js";
import embeds from "../utils/embedUtils";
import { MatchDelay } from "../models";
import { ApplyMatchSource, BuildMatchFiles, BuildRolesString, BuildVersusString, GetUnixTimestamp } from "./helpers/alertsHelper";

export default async function SendMatchDelays(client: Client<boolean>, matchDelays: MatchDelay[]) {
    matchDelays.forEach((matchDelay: MatchDelay) => {
        const { match } = matchDelay;

        // match.dateTime is the new start time
        const embed = new EmbedBuilder()
            .setColor(embeds.warningHex)
            .setTitle(`${BuildVersusString(match)} delayed`)
            .setDescription(`🔴 Live **<t:${GetUnixTimestamp(match.dateTime)}:R>**\n\u200b`)
            .setTimestamp();

        ApplyMatchSource(embed, match);

        matchDelay.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                return;

            await channel.send({
                // no roles (disabled role management) => no mention, regardless of the setting
                content: guild.mentionOnDelays ? BuildRolesString(guild.roleDiscordIds) : undefined,
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
