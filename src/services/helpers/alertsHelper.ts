import { ContainerBuilder, MessageFlags, TextChannel } from "discord.js";
import { Match, MatchAlert, MatchBase, MatchDelay, ResultAlert } from "../../models";
import containers, { supportHint } from "../../utils/containerUtils";
import emojis from "../../utils/emojiUtils";

const maxStreamsShown = 3;

// dates of the api are utc, but serialized without offset ("2026-11-10T22:00:00")
export function GetUnixTimestamp(dateTime: string): number {
    const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(dateTime);
    const ms: number = new Date(hasOffset ? dateTime : `${dateTime}Z`).getTime();
    return Math.floor(ms / 1000);
}

export function BuildRolesString(rolesArray: string[]): string | undefined {
    if(rolesArray.length === 0)
        return undefined;

    return rolesArray.map((id: string) => `<@&${id}>`).join(" ");
}

function BuildLinksString(match: MatchBase): string {
    const links: string[] = [];

    if(match.hltvUrl)
        links.push(`**[HLTV](${EscapeLinkUrl(match.hltvUrl)})**`);

    links.push(`**[Liquipedia](${EscapeLinkUrl(match.eventUrl)})**`);

    if(match.faceitUrl)
        links.push(`**[Faceit](${EscapeLinkUrl(match.faceitUrl)})**`);

    return links.join(" · ");
}

function BuildFormatString(match: MatchBase): string {
    const format = `Bo${match.bestOf}${match.environment ? ` (${match.environment})` : ""}`;
    return [match.tierString, match.stage, format].filter(part => part).join(" · ");
}

// e. g. "<platform emoji> channel", one line per stream
export function BuildStreamsString(match: Match): string | null {
    const streams = match.streams
        .filter(stream => stream.url !== null)
        .slice(0, maxStreamsShown)
        .map(stream => `${emojis.getStream(stream.platform)} [${stream.channel}](${EscapeLinkUrl(stream.url!)})`);

    return streams.length > 0 ? streams.join("\n") : null;
}

export function BuildAlertContainer(color: number, title: string, description: string, match: MatchBase, details: string | null = null, roleDiscordIds: string[] = []): ContainerBuilder {
    const rolesString = BuildRolesString(roleDiscordIds);

    const header = `${rolesString ? `${rolesString}\n` : ""}### ${title}\n${description}`;
    const event = `${match.eventName}\n-# ${BuildFormatString(match)}`;
    // the footer shows when the alert was sent, not when the match starts
    const footer = `${BuildLinksString(match)}\n\n-# <t:${Math.floor(Date.now() / 1000)}:f> · Powered by Liquipedia`;

    const blocks = [header, details, event, footer].filter(block => block !== null);

    return new ContainerBuilder()
        .setAccentColor(color)
        .addTextDisplayComponents(containers.text(blocks.join("\n\n")));
}

export function BuildAlertPayload(container: ContainerBuilder, roleDiscordIds: string[] = []) {
    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2 as const,
        allowedMentions: { roles: roleDiscordIds }
    };
}

// the last queued send of every channel that still has pending alerts
const channelQueues = new Map<string, Promise<void>>();

// alerts of the same channel are sent one after another, so they arrive in the order they were queued in
// (across all alert types). Different channels do not wait for each other. Never rejects
export function SendAlert(channel: TextChannel, container: ContainerBuilder, roleDiscordIds: string[], alertName: string): Promise<void> {
    const send = async () => {
        await channel.send(BuildAlertPayload(container, roleDiscordIds)).catch(async (err) => {
            console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id})`);
            await channel.send(containers.publicReply(containers.error(`There has been an error sending out a ${alertName}\n\n${supportHint}`))).catch((err) => console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id}) unable to send error message`));
        });
    };

    const queued = (channelQueues.get(channel.id) ?? Promise.resolve()).then(send);
    channelQueues.set(channel.id, queued);

    queued.finally(() => {
        if(channelQueues.get(channel.id) === queued)
            channelQueues.delete(channel.id);
    });

    return queued;
}

// plain text, used for the logs
export function BuildVersusString(match: MatchBase): string {
    return `${match.teamX?.name ?? "TBD"} vs ${match.teamY?.name ?? "TBD"}`;
}

// with the versus emoji, used for the titles of match and delay alerts
export function BuildVersusTitle(match: MatchBase): string {
    return `${match.teamX?.name ?? "TBD"} ${emojis.getVersus()} ${match.teamY?.name ?? "TBD"}`;
}

// liquipedia urls can contain parentheses, which would end a markdown link early
export function EscapeLinkUrl(url: string): string {
    return url.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export function BuildMatchAlertLogString(matchAlerts: MatchAlert[], elapsedTime: string): string {
    return `[matches] sent ${matchAlerts.length} match alerts (took ${elapsedTime}ms)\n${matchAlerts.map(a => `    "${BuildVersusString(a.match)}" for ${a.guilds.length} servers`).join("\n")}`;
}

export function BuildMatchDelayLogString(matchDelays: MatchDelay[], elapsedTime: string): string {
    return `[delays] sent ${matchDelays.length} match delays (took ${elapsedTime}ms)\n${matchDelays.map(a => `    "${BuildVersusString(a.match)}" for ${a.guilds.length} servers`).join("\n")}`;
}

export function BuildResultAlertLogString(resultAlerts: ResultAlert[], elapsedTime: string): string {
    return `[results] sent ${resultAlerts.length} result alerts (took ${elapsedTime}ms)\n${resultAlerts.map(a => `    "${BuildVersusString(a.result)}" for ${a.guilds.length} servers`).join("\n")}`;
}
