import { ContainerBuilder, escapeMarkdown } from "discord.js";
import { Event, GuildSettings, MatchBase, MatchLive, Result } from "../../models";
import settings from "../api/settings";
import containers from "../../utils/containerUtils";
import emojis from "../../utils/emojiUtils";
import { EscapeLinkUrl, GetUnixTimestamp } from "./alertsHelper";

function Join(parts: Array<string | null | undefined>, separator = " · "): string {
    return parts.filter(part => part).join(separator);
}

// team and event names come from liquipedia and must not change the formatting
function Escape(text: string): string {
    return escapeMarkdown(text, { maskedLink: true });
}

function TeamNames(match: MatchBase): [string, string] {
    return [Escape(match.teamX?.name ?? "TBD"), Escape(match.teamY?.name ?? "TBD")];
}

function MatchLink(match: MatchBase): string {
    return match.hltvUrl
        ? `[HLTV](${EscapeLinkUrl(match.hltvUrl)})`
        : `[Liquipedia](${EscapeLinkUrl(match.eventUrl)})`;
}

// spoilers do not render inside of link texts, so the score is never part of a link
function ScoreString(teamXScore: number, teamYScore: number, censored: boolean): string {
    const score = `${teamXScore} : ${teamYScore}`;
    return censored ? `||${score}||` : score;
}

function EventLine(match: MatchBase, ...extra: Array<string | null>): string {
    return `-# ${Join([Escape(match.eventName), match.tierString, match.stage ? Escape(match.stage) : null, ...extra])}`;
}

export function BuildUpcomingMatchEntry(match: MatchBase): string {
    const timestamp = GetUnixTimestamp(match.dateTime);
    const [teamX, teamY] = TeamNames(match);

    const first = Join([`**<t:${timestamp}:t>**`, `<t:${timestamp}:R>`,`[${teamX} vs ${teamY}](${EscapeLinkUrl(match.hltvUrl ?? match.eventUrl)})`, `Bo${match.bestOf}`]);
    return `${first}\n${EventLine(match)}`;
}

export function BuildLiveMatchEntry(match: MatchLive, censored: boolean): string {
    const [teamX, teamY] = TeamNames(match);
    const score = ScoreString(match.teamXMapScore, match.teamYMapScore, censored);

    const first = Join([`${emojis.getLive()} **Live**`,`**${teamX} ${score} ${teamY}**`, `Bo${match.bestOf}`, MatchLink(match)]);
    return `${first}\n${EventLine(match, `started <t:${GetUnixTimestamp(match.dateTime)}:R>`)}`;
}

export function BuildResultEntry(result: Result, censored: boolean): string {
    const [teamX, teamY] = TeamNames(result);
    const score = ScoreString(result.teamXMapScore, result.teamYMapScore, censored);

    const first = Join([`**${teamX} ${score} ${teamY}**`, `<t:${GetUnixTimestamp(result.dateTime)}:R>${result.isForfeit ? " · FF" : ""}`, MatchLink(result)]);
    return `${first}\n-# ${Join([Escape(result.eventName), result.tierString, result.stage ? Escape(result.stage) : null, `Bo${result.bestOf}`])}`;
}

// index = tier of the api (0 Major - 4 C-Tier), same as the emojis of the tier autocomplete
const tierEmojis = ["🤯", "🤩", "🥱"];
const defaultTierEmoji = "💤";

function GetTierEmoji(tier: number | null): string {
    return (tier !== null ? tierEmojis[tier] : undefined) ?? defaultTierEmoji;
}

export function BuildEventEntry(event: Event): string {
    // ongoing events lead with the live emoji instead of the tier emoji, the tier is still part of the line
    const leadingEmoji = event.isOngoing ? emojis.getLive() : GetTierEmoji(event.tier);
    const first = Join([`${leadingEmoji} **[${Escape(event.eventName)}](${EscapeLinkUrl(event.eventUrl)})**`, event.tierString]);

    const dates = Join([
        event.startDate ? `<t:${GetUnixTimestamp(event.startDate)}:d>` : null,
        event.endDate ? `<t:${GetUnixTimestamp(event.endDate)}:d>` : null
    ], " – ");

    const prizePool = event.prizePool ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(event.prizePool) : null;
    const teams = event.teamsAttending ? `${event.teamsAttending} teams` : null;

    const second = Join([dates, event.locationString ? Escape(event.locationString) : null, prizePool, teams]);
    return second ? `${first}\n-# ${second}` : first;
}

// if the settings can not be loaded the results are censored, spoiling a result is worse than hiding it
export async function IsCensored(guildId: string): Promise<boolean> {
    try {
        const res = await settings.getSettings(guildId);

        if(res.status !== 200)
            return true;

        return (await res.json() as GuildSettings).censorResults;
    }
    catch {
        return true;
    }
}

// match => matches, result => results
function Plural(noun: string): string {
    return noun.endsWith("ch") ? `${noun}es` : `${noun}s`;
}

export function BuildSummary(count: number, noun: string, useFilters: boolean, search: string | null, filtersHint = "Filtered by your servers filters"): string {
    const lines = [`Found **${count}** ${count === 1 ? noun : Plural(noun)}`];

    if(useFilters)
        lines.push(`-# ${filtersHint}`);

    if(search)
        lines.push(`-# Search: "${Escape(search)}"`);

    return lines.join("\n");
}

// timeframe is e. g. "starting within the next 24 hours"
export function BuildEmptyContainer(noun: string, useFilters: boolean, search: string | null, timeframe: string | null = null): ContainerBuilder {
    const lines = [`### No ${Plural(noun)} found`];

    if(timeframe)
        lines.push(`Only ${Plural(noun)} ${timeframe} are listed`);

    const hints: string[] = [];

    if(useFilters)
        hints.push("`server-filters:False` to ignore your servers filters");

    if(search)
        hints.push("a different search");

    if(hints.length > 0)
        lines.push(`*Try ${hints.join(" or ")}*`);

    return containers.neutral(lines.join("\n"));
}
