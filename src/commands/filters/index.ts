import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { filtersDelete } from "./delete";
import { filtersList } from "./list";
import { filtersAdd } from "./add";

export const data = new SlashCommandBuilder()
    .setName("filters")
    .setDescription("All filter related commands and subcommands (adding, removing and reviewing filters)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName("delete")
        .setDescription("Delete one or more of your servers filters")
    )
    .addSubcommand(subcommand => subcommand
        .setName("list")
        .setDescription("A list of all your servers filters")
    )
    .addSubcommand(subcommand => subcommand
        .setName("add")
        .setDescription("Add a filter to customize the match and result alerts your server receives")
        .addStringOption(option =>
            option.setName('team')
                .setDescription(`Filter alerts by team`)
                .setRequired(false)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('event')
                .setDescription(`Filter alerts by event`)
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('event-tier')
                .setDescription(`Filter alerts with liquipedias event tiers (the selected tier and above)`)
                .setRequired(false)
                .setAutocomplete(true))
        .addIntegerOption(option =>
            option.setName('vrs-rank')
                .setDescription(`Filter alerts by VRS rank (both teams have to be ranked within the top x)`)
                .setRequired(false)
                .setAutocomplete(true))
        .addBooleanOption(option =>
            option.setName('hltv-coverage')
                .setDescription(`True: only matches covered by HLTV, False: only matches not covered by HLTV`)
                .setRequired(false))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if(subcommand === "add")
        await filtersAdd(interaction);

    if(subcommand === "delete")
        await filtersDelete(interaction);

    if(subcommand === "list")
        await filtersList(interaction);
}
