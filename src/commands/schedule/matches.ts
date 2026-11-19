import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import schedule from "../../services/api/schedule";
import { Match, MatchLive } from "../../models";
import containers, { genericErrorMessage } from "../../utils/containerUtils";
import { SendPaginated } from "../../utils/paginationUtils";
import { BuildEmptyContainer, BuildLiveMatchEntry, BuildSummary, BuildUpcomingMatchEntry, IsCensored } from "../../services/helpers/scheduleHelper";

export const data = new SlashCommandBuilder()
    .setName("matches")
    .setDescription("Upcoming or live matches (filtered by your servers filters by default)")
    .setDMPermission(false)
    .addStringOption(option =>
        option.setName("status")
            .setDescription("Upcoming (default) or live matches")
            .setRequired(false)
            .addChoices(
                { name: "Upcoming", value: "upcoming" },
                { name: "Live", value: "live" }
            ))
    .addBooleanOption(option =>
        option.setName("server-filters")
            .setDescription("Only show matches that pass your servers filters (default: true)")
            .setRequired(false))
    .addStringOption(option =>
        option.setName("search")
            .setDescription("Search by team, event, tier or stage")
            .setRequired(false)
            .setMaxLength(100));

export async function execute(interaction: ChatInputCommandInteraction) {
    // the api can be slow when its cache is cold
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const status = interaction.options.getString("status") === "live" ? "live" : "upcoming";
    const useFilters = interaction.options.getBoolean("server-filters") ?? true;
    const search = interaction.options.getString("search")?.trim() || null;
    const live = status === "live";

    // only live matches show a score, which can be censored
    const [res, censored] = await Promise.all([
        schedule.getMatches(interaction.guildId!, useFilters, status, search),
        live ? IsCensored(interaction.guildId!) : Promise.resolve(false)
    ]);

    if(res.status !== 200)
        return interaction.editReply(containers.edit(containers.error(genericErrorMessage)));

    const matches = await res.json() as Array<Match | MatchLive>;

    if(matches.length === 0)
        return interaction.editReply(containers.edit(BuildEmptyContainer(live ? "live match" : "match", useFilters, search, live ? null : "starting within the next 24 hours")));

    return SendPaginated(interaction, {
        color: containers.neutralHex,
        title: live ? "Live Matches" : "Upcoming Matches",
        summary: BuildSummary(matches.length, "match", useFilters, search),
        entries: matches.map(match => live ? BuildLiveMatchEntry(match as MatchLive, censored) : BuildUpcomingMatchEntry(match))
    });
}
