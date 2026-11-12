import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { mentionOnDelays } from "./mentionOnDelays";
import { mentionOnResults } from "./mentionOnResults";
import { censorResults } from "./censorResults";
import { pauseAlerts } from "./pauseAlerts";
import { roleManagement } from "./roleManagement";

export const data = new SlashCommandBuilder()
    .setName("settings")
    .setDescription("All settings related subcommands (censoring results, mentioning on match delays, ...")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName("role-management")
        .setDescription("Let Greg create and mention roles: an alert role and a role per filter (default is off/false)")
        .addBooleanOption(option =>
            option.setName('value')
                .setDescription(`Role management`)
                .setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
        .setName("mention-on-delays")
        .setDescription("Choose if you want to be mentioned when a match gets delayed (default is off/false)")
        .addBooleanOption(option =>
            option.setName('value')
                .setDescription(`Mentions on match delays`)
                .setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
        .setName("mention-on-results")
        .setDescription("Choose if you want to be mentioned for result alerts (default is on/true)")
        .addBooleanOption(option =>
            option.setName('value')
                .setDescription(`Mentions on result alerts`)
                .setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
        .setName("censor-results")
        .setDescription("Choose to censor the score on a result alert (default is off/false)")
        .addBooleanOption(option =>
            option.setName('value')
                .setDescription(`Censored Results`)
                .setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
        .setName("pause-alerts")
        .setDescription("Pause your server from receiving any alerts (default is off/false)")
        .addBooleanOption(option =>
            option.setName('value')
                .setDescription(`Pause Alerts`)
                .setRequired(true))
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if(subcommand === "role-management")
        await roleManagement(interaction);

    if(subcommand === "mention-on-delays")
        await mentionOnDelays(interaction);

    if(subcommand === "mention-on-results")
        await mentionOnResults(interaction);

    if(subcommand === "censor-results")
        await censorResults(interaction);

    if(subcommand === "pause-alerts")
        await pauseAlerts(interaction);
}
