import { CommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from "discord.js";
import { commands } from "..";
import { CommandInfo } from "../../models";
import embeds from "../../utils/embedUtils";

export const data = new SlashCommandBuilder()
    .setName("commands")
    .setDescription("A list of all commands")
    .setDMPermission(false);

export async function execute(interaction: CommandInteraction) {
    const commandsData = Object.values(commands).map((command) => command.data);

    const member = interaction.guild?.members.cache.get(interaction.user.id!);
    const memberIsAdmin = member?.permissions.has(PermissionFlagsBits.Administrator);

    const commandsInfo: CommandInfo[] = [];

    commandsData.forEach(command => {
        const perms: "admin" | "user" = command.toJSON().default_member_permissions === "8" ? "admin" : "user";
        const subcommandsExist: boolean = command.options.length > 0 ? true : false; 

        if(!subcommandsExist) {
            commandsInfo.push({
                name: `/${command.name}`,
                desc: command.description,
                perms: perms
            });
        }

        if(subcommandsExist) {
            command.options.forEach(option => {
                if(option instanceof SlashCommandSubcommandBuilder) {
                    commandsInfo.push({
                        name: `/${command.name} ${option.toJSON().name}`,
                        desc: option.toJSON().description,
                        perms: perms
                    });
                }

                if(option instanceof SlashCommandSubcommandGroupBuilder) {
                    option.options.forEach(groupOption => {
                        commandsInfo.push({
                            name: `/${command.name} ${option.toJSON().name} ${groupOption.toJSON().name}`,
                            desc: groupOption.toJSON().description,
                            perms: perms
                        });
                    })
                }
            })
        }
    });

    const userCommandsEmbed = new EmbedBuilder()
        .setTitle("Commands")
        .setColor(embeds.neturalHex)
        .setTimestamp()
        .setThumbnail(interaction.guild!.members.me!.displayAvatarURL())
        .addFields(
            commandsInfo.filter(command => command.perms === "user").map(command => {
                return { name: command.name, value: command.desc};
            })
        );

    const adminCommandsEmbed = new EmbedBuilder()
        .setTitle("Admin Commands")
        .setDescription("Roles are optional: by default Greg sends his alerts without mentions and does not create any roles.\nEnable `/settings role-management` to get an alert role and a role per filter (needed for `/roles` and `/role link`)")
        .setColor(embeds.warningHex)
        .setTimestamp()
        .setThumbnail(interaction.guild!.members.me!.displayAvatarURL())
        .addFields(
            commandsInfo.filter(command => command.perms === "admin").map(command => {
                return { name: command.name, value: command.desc};
            })
        );

    if(memberIsAdmin)
        return interaction.reply({ embeds: [userCommandsEmbed, adminCommandsEmbed], flags: [MessageFlags.Ephemeral]});
    
    return interaction.reply({ embeds: [userCommandsEmbed], flags: [MessageFlags.Ephemeral]});
}