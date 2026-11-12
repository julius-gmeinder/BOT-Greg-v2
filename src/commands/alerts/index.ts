import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { alertsConfigAsync } from "./config";

export const data = new SlashCommandBuilder()
    .setName("alerts")
    .setDescription("All alerts related commands and subcommands (enabling and disabling alerts)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName("config")
        .setDescription("Enable or disable your alerts, choose a channel for match alerts, result alerts and news alerts!")
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if(subcommand === "config")
        await alertsConfigAsync(interaction);
}