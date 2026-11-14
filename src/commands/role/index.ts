import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { roleLink } from "./link";
import { roleUnlink } from "./unlink";
import { roleList } from "./list";

export const data = new SlashCommandBuilder()
    .setName("role")
    .setDescription("All role subcommands (role links and unlinks), requires the role management of /settings")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName("link")
        .setDescription("Link your own roles to the bots roles, they will be mentioned too when an alert is sent!")
    )
    .addSubcommand(subcommand => subcommand
        .setName("unlink")
        .setDescription("Unlink two roles that were previously linked up")
    )
    .addSubcommand(subcommand => subcommand
        .setName("list")
        .setDescription("A list of all of the bots roles and their links")
    )

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if(subcommand === "link")
        await roleLink(interaction);

    if(subcommand === "unlink")
        await roleUnlink(interaction);

    if(subcommand === "list")
        await roleList(interaction);
}