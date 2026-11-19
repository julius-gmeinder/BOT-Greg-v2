import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import schedule from "../../services/api/schedule";
import { Result } from "../../models";
import containers, { genericErrorMessage } from "../../utils/containerUtils";
import { SendPaginated } from "../../utils/paginationUtils";
import { BuildEmptyContainer, BuildResultEntry, BuildSummary, IsCensored } from "../../services/helpers/scheduleHelper";

export const data = new SlashCommandBuilder()
    .setName("results")
    .setDescription("Recent results (filtered by your servers filters by default)")
    .setDMPermission(false)
    .addBooleanOption(option =>
        option.setName("server-filters")
            .setDescription("Only show results that pass your servers filters (default: true)")
            .setRequired(false))
    .addStringOption(option =>
        option.setName("search")
            .setDescription("Search by team, event, tier or stage")
            .setRequired(false)
            .setMaxLength(100));

export async function execute(interaction: ChatInputCommandInteraction) {
    // the api can be slow when its cache is cold
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const useFilters = interaction.options.getBoolean("server-filters") ?? true;
    const search = interaction.options.getString("search")?.trim() || null;

    const [res, censored] = await Promise.all([
        schedule.getResults(interaction.guildId!, useFilters, search),
        IsCensored(interaction.guildId!)
    ]);

    if(res.status !== 200)
        return interaction.editReply(containers.edit(containers.error(genericErrorMessage)));

    const results = await res.json() as Result[];

    if(results.length === 0)
        return interaction.editReply(containers.edit(BuildEmptyContainer("result", useFilters, search, "from the last 24 hours")));

    return SendPaginated(interaction, {
        color: containers.successHex,
        title: "Results",
        summary: BuildSummary(results.length, "result", useFilters, search),
        entries: results.map(result => BuildResultEntry(result, censored))
    });
}
