import { APIEmbedField, AttachmentBuilder, EmbedBuilder } from "discord.js";
import { Match, MatchAlert, MatchBase, MatchDelay, Result, ResultAlert } from "../../models";

const maxStreamsShown = 3;

// dates of the api are utc, but serialized without offset ("2026-11-10T22:00:00")
export function GetUnixTimestamp(dateTime: string): number {
    const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(dateTime);
    const ms: number = new Date(hasOffset ? dateTime : `${dateTime}Z`).getTime();
    return Math.floor(ms / 1000);
}

// undefined if there are no roles to mention (e. g. disabled role management), so the message is sent without content
export function BuildRolesString(rolesArray: string[]): string | undefined {
    if(rolesArray.length === 0)
        return undefined;

    return rolesArray.map((id: string) => `<@&${id}>`).join(" ");
}

export function BuildAttachment(name: "hltv" | "liquipedia"): AttachmentBuilder {
    return new AttachmentBuilder(`src/assets/${name}.png`, { name: `${name}.png` });
}

export function BuildMatchFiles(match: MatchBase): AttachmentBuilder[] {
    return [BuildAttachment(match.hltvUrl ? "hltv" : "liquipedia")];
}

// matches covered by hltv link to their hltv matchpage, all other matches to the liquipedia page of their event
export function ApplyMatchSource(embed: EmbedBuilder, match: MatchBase): EmbedBuilder {
    if(match.hltvUrl) {
        return embed
            .setAuthor({ name: 'hltv.org', iconURL: `attachment://hltv.png`, url: match.hltvUrl })
            .setURL(match.hltvUrl);
    }

    return embed.setAuthor({ name: 'liquipedia.net', iconURL: `attachment://liquipedia.png`, url: match.eventUrl });
}

export function BuildVersusString(match: MatchBase): string {
    return `${match.teamX?.name ?? "TBD"} vs ${match.teamY?.name ?? "TBD"}`;
}

// event, tier, format and links, shared by match alerts and result alerts
export function BuildMatchFields(match: Match | Result): APIEmbedField[] {
    const fields: APIEmbedField[] = [];

    const eventLink = `[${match.eventName}](${EscapeLinkUrl(match.eventUrl)})`;
    fields.push({ name: 'Event', value: match.stage ? `${eventLink}\n${match.stage}` : eventLink, inline: true });

    if(match.tierString)
        fields.push({ name: 'Tier', value: match.tierString, inline: true });

    fields.push({ name: 'Format', value: `Bo${match.bestOf}${match.environment ? ` (${match.environment})` : ""}`, inline: true });

    if("streams" in match) {
        const streams = match.streams
            .filter(stream => stream.url !== null)
            .slice(0, maxStreamsShown)
            .map(stream => `[${stream.channel}](${EscapeLinkUrl(stream.url!)})`);

        if(streams.length > 0)
            fields.push({ name: 'Streams', value: streams.join(" · ") });
    }

    const links: string[] = [];

    if(match.hltvUrl)
        links.push(`**[Matchpage](${EscapeLinkUrl(match.hltvUrl)})**`);

    if(match.faceitUrl)
        links.push(`**[FACEIT](${EscapeLinkUrl(match.faceitUrl)})**`);

    if(links.length > 0)
        fields.push({ name: '\u200b', value: links.join(" · ") });

    return fields;
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
