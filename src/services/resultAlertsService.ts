import { Client, TextChannel } from "discord.js";
import { Result, ResultAlert } from "../models";
import containers, { supportHint } from "../utils/containerUtils";
import emojis from "../utils/emojiUtils";
import { BuildAlertContainer, BuildAlertPayload } from "./helpers/alertsHelper";

export default async function SendResultAlerts(client: Client<boolean>, resultAlerts: ResultAlert[]) {
    resultAlerts.forEach((resultAlert: ResultAlert) => {
        const { result } = resultAlert;
        const { teamXMapScore, teamYMapScore, isForfeit } = result;

        const teamXName = result.teamX?.name ?? "TBD";
        const teamYName = result.teamY?.name ?? "TBD";

        let outcome = `🤝 The match ended in a draw`;
        if(teamXMapScore !== teamYMapScore)
            outcome = `🏆 ${teamXMapScore > teamYMapScore ? teamXName : teamYName} won the match${isForfeit ? " by forfeit" : ""}`;

        const mapsString = BuildMapsString(result);

        const score = `${BuildScoreEmoji(teamXMapScore, teamYMapScore)} - ${BuildScoreEmoji(teamYMapScore, teamXMapScore)}`;
        const censoredScore = `${emojis.getQuestionMark()} - ${emojis.getQuestionMark()}`;

        resultAlert.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelDiscordId) as TextChannel;

            if(!channel)
                return;

            // no roles (disabled role management) => no mention, regardless of the setting
            const roleDiscordIds = guild.mentionOnResults ? guild.roleDiscordIds : [];

            // the role mentions are part of the container, so it is built for every guild.
            // Censored results show neither the score nor the outcome, and no maps, as their round scores would spoil the result
            const container = BuildAlertContainer(
                containers.successHex,
                `${teamXName} ${guild.censorResults ? censoredScore : score} ${teamYName}`,
                guild.censorResults ? `⏱️ The match has ended` : outcome,
                result,
                guild.censorResults ? null : mapsString,
                roleDiscordIds
            );

            await channel.send(BuildAlertPayload(container, roleDiscordIds)).catch(async (err) => {
                console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id})`);
                await channel.send(containers.publicReply(containers.error(`There has been an error sending out a result alert\n\n${supportHint}`))).catch((err) => console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id}) unable to send error message`));
            });
        });
    });
}

// green for the winning team, red for the losing team, blue for a draw
function BuildScoreEmoji(score: number, opponentScore: number): string {
    let color = emojis.Colors.Blue;
    if(score !== opponentScore)
        color = score > opponentScore ? emojis.Colors.Green : emojis.Colors.Red;

    return emojis.getNumber(color, score);
}

// e. g. "<map emoji> Mirage 13 - 9", only maps that were actually played
function BuildMapsString(result: Result): string | null {
    const maps = result.maps
        .filter(map => map.mapPlayed)
        .map(map => `${emojis.getMap(emojis.toMap(map.name))} ${map.name} **${map.teamXScore} - ${map.teamYScore}**`);

    return maps.length > 0 ? maps.join("\n") : null;
}
