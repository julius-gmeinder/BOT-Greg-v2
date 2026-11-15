import { Client, TextChannel } from "discord.js";
import containers, { supportHint } from "../utils/containerUtils";
import emojis from "../utils/emojiUtils";
import { MatchDelay } from "../models";
import { BuildAlertContainer, BuildAlertPayload, BuildVersusTitle, GetUnixTimestamp } from "./helpers/alertsHelper";

export default async function SendMatchDelays(client: Client<boolean>, matchDelays: MatchDelay[]) {
    matchDelays.forEach((matchDelay: MatchDelay) => {
        const { match } = matchDelay;

        matchDelay.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                return;

            // no roles (disabled role management) => no mention, regardless of the setting
            const roleDiscordIds = guild.mentionOnDelays ? guild.roleDiscordIds : [];

            // the role mentions are part of the container, so it is built for every guild.
            // match.dateTime is the new start time
            const container = BuildAlertContainer(
                containers.warningHex,
                `${BuildVersusTitle(match)} delayed`,
                `${emojis.getLive()} Live **<t:${GetUnixTimestamp(match.dateTime)}:R>**`,
                match,
                null,
                roleDiscordIds
            );

            await channel.send(BuildAlertPayload(container, roleDiscordIds)).catch(async (err) => {
                console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id})`);
                await channel.send(containers.publicReply(containers.error(`There has been an error sending out a match alert\n\n${supportHint}`))).catch((err) => console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id}) unable to send error message`));
            });
        });
    });
}
