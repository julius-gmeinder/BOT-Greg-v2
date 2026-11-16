import { Client, TextChannel } from "discord.js";
import containers from "../utils/containerUtils";
import emojis from "../utils/emojiUtils";
import { MatchDelay } from "../models";
import { BuildAlertContainer, BuildVersusTitle, GetUnixTimestamp, SendAlert } from "./helpers/alertsHelper";

export default async function SendMatchDelays(client: Client<boolean>, matchDelays: MatchDelay[]) {
    const sends: Promise<void>[] = [];

    for (const matchDelay of matchDelays) {
        const { match } = matchDelay;

        for (const guild of matchDelay.guilds) {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                continue;

            // no roles (disabled role management) => no mention, regardless of the setting
            const roleDiscordIds = guild.mentionOnDelays ? guild.roleDiscordIds : [];

            // the role mentions are part of the container, so it is built for every guild.
            const container = BuildAlertContainer(
                containers.warningHex,
                `${BuildVersusTitle(match)} delayed`,
                `${emojis.getLive()} Live **<t:${GetUnixTimestamp(match.dateTime)}:R>**`,
                match,
                null,
                roleDiscordIds
            );

            sends.push(SendAlert(channel, container, roleDiscordIds, "match alert"));
        }
    }

    await Promise.all(sends);
}
