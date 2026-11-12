import { AttachmentBuilder } from "discord.js";
import { MatchAlert, MatchDelay, NewsAlert, ResultAlert } from "../../models";

export function GetUnixTimestamp(date: string, time: string): number {
    const ms: number = new Date(`${date} ${time} UTC`).getTime();
    return Math.floor(ms / 1000);
}

export function BuildStarsString(starsAmount: number): string {
    if(starsAmount === 0)
        return "-";

    let stars: string = "";
    for (let i = 0; i < starsAmount; i++)
        stars += "⭐";
    return stars;
}

export function BuildRolesString(rolesArray: string[]): string {
    const rolesToPing: string[] = [];
    rolesArray.forEach((id: string) => rolesToPing.push(`<@&${id}>`));
    return rolesToPing.join(" ");
}

export function BuildAttachment(): AttachmentBuilder {
    return new AttachmentBuilder(`src/assets/hltv.png`, { name: "hltv.png" });
}

export function BuildNewsAttachment(path: string, name: string): AttachmentBuilder {
    return new AttachmentBuilder(path, { name: name });
}

export function BuildMatchAlertLogString(matchAlerts: MatchAlert[], elapsedTime: string): string {
    return `[matches] sent ${matchAlerts.length} match alerts (took ${elapsedTime}ms)\n${matchAlerts.map(a => `    "${a.match.teamX} vs ${a.match.teamY}" for ${a.guilds.length} servers`).join("\n")}`;
}

export function BuildMatchDelayLogString(matchDelays: MatchDelay[], elapsedTime: string): string {
    return `[delays] sent ${matchDelays.length} match delays (took ${elapsedTime}ms)\n${matchDelays.map(a => `    "${a.match.teamX} vs ${a.match.teamY}" for ${a.guilds.length} servers`).join("\n")}`;
}

export function BuildResultAlertLogString(resultAlerts: ResultAlert[], elapsedTime: string): string {
    return `[results] sent ${resultAlerts.length} result alerts (took ${elapsedTime}ms)\n${resultAlerts.map(a => `    "${a.result.teamX_Name} vs ${a.result.teamY_Name}" for ${a.guilds.length} servers`).join("\n")}`;
}

export function BuildNewsAlertLogString(newsAlerts: NewsAlert[], elapsedTime: string): string {
    return `[news] sent ${newsAlerts.length} news alerts (took ${elapsedTime}ms)\n${newsAlerts.map(a => `    "${a.news.headline}" for ${a.guilds.length} servers`).join("\n")}`;
}