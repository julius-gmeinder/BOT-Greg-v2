import { Filter } from "../models";

export type FilterProps = Pick<Filter, "team" | "event" | "eventTier" | "vrsRank" | "hltvCoverage">;

// index = value of the tier in the api (0 Major - 4 C-Tier)
const tierNames = ["Major", "S-Tier", "A-Tier", "B-Tier", "C-Tier"];

// discord limits for role names and select menu labels
const maxNameLength = 100;

export function GetTierName(tier: number | null): string | null {
    if(tier === null)
        return null;

    return tierNames[tier] ?? null;
}

export function IsValidTier(tier: number): boolean {
    return Number.isInteger(tier) && tier >= 0 && tier < tierNames.length;
}

// every new (or reset) guild starts with this filter. The api does not flag it, it is a normal filter
export function IsDefaultFilter(filter: FilterProps): boolean {
    return filter.hltvCoverage === true
        && filter.team === null
        && filter.event === null
        && filter.eventTier === null
        && filter.vrsRank === null;
}

// short name of a filter, e. g. "Vitality, S-Tier, Top 20"
export function BuildFilterName(filter: FilterProps): string {
    const parts: string[] = [];

    if(filter.team)
        parts.push(filter.team);

    if(filter.event)
        parts.push(filter.event);

    if(filter.eventTier !== null)
        parts.push(GetTierName(filter.eventTier) ?? `Tier ${filter.eventTier}`);

    if(filter.vrsRank)
        parts.push(`Top ${filter.vrsRank}`);

    if(filter.hltvCoverage !== null)
        parts.push(filter.hltvCoverage ? "HLTV covered" : "Not HLTV covered");

    if(parts.length === 0)
        return "All matches";

    return parts.join(", ");
}

export function BuildFilterRoleName(filter: FilterProps): string {
    return Truncate(`⭕ Alerts: ${BuildFilterName(filter)}`);
}

export function BuildFilterLabel(filter: Filter): string {
    return Truncate(`Filter ${filter.nr}: ${BuildFilterName(filter)}${IsDefaultFilter(filter) ? " (default)" : ""}`);
}

// embed field that lists the set properties in its name and the unset properties in its value
export function BuildFilterField(filter: FilterProps): { name: string, value: string, inline: boolean } {
    const valueFields: string[] = [];
    const emptyFields: string[] = [];

    filter.team ? valueFields.push(`Team: ${filter.team}`) : emptyFields.push("Team");
    filter.event ? valueFields.push(`Event: ${filter.event}`) : emptyFields.push("Event");
    filter.eventTier !== null ? valueFields.push(`Event Tier: ${GetTierName(filter.eventTier) ?? filter.eventTier}`) : emptyFields.push("Event Tier");
    filter.vrsRank ? valueFields.push(`VRS Rank: ${filter.vrsRank}`) : emptyFields.push("VRS Rank");
    filter.hltvCoverage !== null ? valueFields.push(`HLTV Coverage: ${filter.hltvCoverage ? "yes" : "no"}`) : emptyFields.push("HLTV Coverage");

    return {
        name: valueFields.length > 0 ? valueFields.join(", ") : "All matches",
        value: emptyFields.length > 0 ? `${emptyFields.join(", ")}: 🚫` : "\u200b",
        inline: false
    };
}

function Truncate(text: string): string {
    return text.length > maxNameLength ? `${text.slice(0, maxNameLength - 1)}…` : text;
}
