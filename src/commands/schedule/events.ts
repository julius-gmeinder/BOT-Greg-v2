import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import schedule from "../../services/api/schedule";
import { Event } from "../../models";
import containers, { genericErrorMessage } from "../../utils/containerUtils";
import { SendPaginated } from "../../utils/paginationUtils";
import { BuildEmptyContainer, BuildEventEntry, BuildSummary } from "../../services/helpers/scheduleHelper";

export const data = new SlashCommandBuilder()
    .setName("events")
    .setDescription("Ongoing and upcoming events (filtered by your servers filters by default)")
    .setDMPermission(false)
    .addBooleanOption(option =>
        option.setName("server-filters")
            .setDescription("Only show events that pass your servers filters, only their event and tier count (default: true)")
            .setRequired(false))
    .addStringOption(option =>
        option.setName("search")
            .setDescription("Search by event name, tier or location")
            .setRequired(false)
            .setMaxLength(100));

export async function execute(interaction: ChatInputCommandInteraction) {
    // events can take a few seconds when the cache of the api is cold
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const useFilters = interaction.options.getBoolean("server-filters") ?? true;
    const search = interaction.options.getString("search")?.trim() || null;

    const res = await schedule.getEvents(interaction.guildId!, useFilters, search);

    if(res.status !== 200)
        return interaction.editReply(containers.edit(containers.error(genericErrorMessage)));

    const events = await res.json() as Event[];

    if(events.length === 0)
        return interaction.editReply(containers.edit(BuildEmptyContainer("event", useFilters, search)));

    return SendPaginated(interaction, {
        color: containers.neutralHex,
        title: "Events",
        summary: BuildSummary(events.length, "event", useFilters, search, "Filtered by your servers filters (only their event and tier count)"),
        entries: events.map(BuildEventEntry)
    });
}
