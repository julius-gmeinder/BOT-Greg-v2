import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { filtersDelete } from "./delete";
import { filtersList } from "./list";
import { filtersAddMatRes } from "./add/matches-and-results";
import { filtersAddNews } from "./add/news";

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
    .addSubcommandGroup(group => group
        .setName("add")
        .setDescription("Add a filter to customize the alerts your server receives")
        .addSubcommand(subcommand => subcommand
            .setName("matches-and-results")
            .setDescription("Add a filter for match and result alerts")
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
            .addStringOption(option =>
                option.setName('event-tier')
                    .setDescription(`Filter alerts with liquipedias event tiers`)
                    .setRequired(false)
                    .setAutocomplete(true))
            .addIntegerOption(option =>
                option.setName('vrs-rank')
                    .setDescription(`Filter alerts by VRS rank`)
                    .setRequired(false)
                    .setAutocomplete(true))
            .addIntegerOption(option =>
                option.setName('stars')
                    .setDescription(`Filter alerts with HLTVs star rating`)
                    .setRequired(false)
                    .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
            .setName("news")
            .setDescription("Add a filter for news alerts")
            .addStringOption(option =>
                option.setName('article-type')
                    .setDescription(`Filter alerts by article type`)
                    .setRequired(true)
                    .setAutocomplete(true)))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if(subcommandGroup === "add") {
        if(subcommand === "matches-and-results")
            await filtersAddMatRes(interaction);

        if(subcommand === "news")
            await filtersAddNews(interaction);
    }

    if(subcommand === "delete")
        await filtersDelete(interaction);

    if(subcommand === "list")
        await filtersList(interaction);
}