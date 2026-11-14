import { Client, TextChannel } from "discord.js";
import containers, { supportHint } from "../utils/containerUtils";
import { MatchAlert } from "../models";
import { BuildAlertContainer, BuildAlertPayload, BuildStreamsString, BuildVersusString, GetUnixTimestamp } from "./helpers/alertsHelper";

export default async function SendMatchAlerts(client: Client<boolean>, matchAlerts: MatchAlert[]) {
    matchAlerts.forEach((matchAlert: MatchAlert) => {
        const { match } = matchAlert;

        const streamsString = BuildStreamsString(match);
        const description = `🔴 Live **<t:${GetUnixTimestamp(match.dateTime)}:R>**`;

        matchAlert.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                return;

            // no roles (disabled role management) => no mention
            const roleDiscordIds = guild.roleDiscordIds;

            // the role mentions are part of the container, so it is built for every guild
            const container = BuildAlertContainer(
                containers.neutralHex,
                BuildVersusString(match),
                description,
                match,
                streamsString,
                roleDiscordIds
            );

            await channel.send(BuildAlertPayload(container, roleDiscordIds)).catch(async (err) => {
                console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id})`);
                await channel.send(containers.publicReply(containers.error(`There has been an error sending out a match alert\n\n${supportHint}`))).catch((err) => console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id}) unable to send error message`));
            });
        });
    });
}
