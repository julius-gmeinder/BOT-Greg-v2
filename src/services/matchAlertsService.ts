import { Client, TextChannel } from "discord.js";
import containers from "../utils/containerUtils";
import emojis from "../utils/emojiUtils";
import { MatchAlert } from "../models";
import { BuildAlertContainer, BuildStreamsString, BuildVersusTitle, GetUnixTimestamp, SendAlert } from "./helpers/alertsHelper";

export default async function SendMatchAlerts(client: Client<boolean>, matchAlerts: MatchAlert[]) {
    const sends: Promise<void>[] = [];

    for (const matchAlert of matchAlerts) {
        const { match } = matchAlert;

        const streamsString = BuildStreamsString(match);
        const description = `${emojis.getLive()} Live **<t:${GetUnixTimestamp(match.dateTime)}:R>**`;

        for (const guild of matchAlert.guilds) {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                continue;

            // no roles (disabled role management) => no mention
            const roleDiscordIds = guild.roleDiscordIds;

            // the role mentions are part of the container, so it is built for every guild
            const container = BuildAlertContainer(
                containers.neutralHex,
                BuildVersusTitle(match),
                description,
                match,
                streamsString,
                roleDiscordIds
            );

            sends.push(SendAlert(channel, container, roleDiscordIds, "match alert"));
        }
    }

    await Promise.all(sends);
}
