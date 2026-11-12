import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, ComponentType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import embedUtils from "../../utils/embedUtils";
import guilds from "../../services/API/guilds";

export const data = new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Resets this servers entire configuration (alerts, filters, roles and role-links)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

export async function execute(interaction: CommandInteraction) {
    const reply = await interaction.reply({
        embeds: [embedUtils.error("Continuing will reset this servers entire configuration\n(alerts, filters, roles and role-links)").setTitle("Reset Configuration?")], 
        components: [BuildActionRow()], 
        flags: [MessageFlags.Ephemeral]
    });

    const collector = await reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
    });

    collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
        if(buttonInteraction.customId == "reset") {
            const res = await guilds.reset(interaction.guildId!);

            if(res.status === 200) {
                const roleIds: string[] = await res.json() as string[];

                if(!hasManageRoles(interaction))
                    return buttonInteraction.update({ embeds: [embedUtils.error("**Insufficient Permissions**\nThe bot does not have the required `Manage Roles` permissions")], components: [] });
 
                if(!hasHigherRole(interaction, roleIds)) 
                    return buttonInteraction.update({ embeds: [embedUtils.error("**Insufficient Permissions**\nMake sure that one of the bots roles is above all of the alerts roles")], components: [] });

                roleIds.forEach(async (roleId: string) => {
                    if(roleId !== null) {
                        const role = await interaction.guild?.roles.cache.get(roleId);
                        await role?.delete();
                    }
                });
                return buttonInteraction.update({embeds: [embedUtils.success("Your configuration has been successfully reset")], components: []});
            }
            return buttonInteraction.update({embeds: [embedUtils.error("There has been an error running the command")], components: []});
        }

        if(buttonInteraction.customId == "cancel")
            return buttonInteraction.update({embeds: [embedUtils.neutral("Your configuration has not been reset")], components: []});
    });

    collector.on("end", async (collected) => {
        if(collected.size === 0)
        await reply.edit({embeds: [embedUtils.neutral("No button was pressed. Your configuration has not been reset")], components: []});
    });
}

function BuildActionRow() {
    const btnDelete = new ButtonBuilder()
        .setCustomId('reset')
        .setLabel('Reset Configuration')
        .setStyle(ButtonStyle.Danger);

    const btnCancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

    const buttons = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(btnCancel, btnDelete);

    return buttons;
}

function hasManageRoles(interaction: CommandInteraction): boolean {
    const permissions = interaction.guild?.members.me?.permissions;
    return permissions?.has(PermissionFlagsBits.ManageRoles) ?? false;
}

function hasHigherRole(interaction: CommandInteraction, roleIds: string[]): boolean {
    const highestBotRole = interaction.guild!.members.me!.roles.highest;
    return roleIds.every(id => {
        const role = interaction.guild?.roles.cache.get(id);

        if (!role) 
            return true; 

        return highestBotRole.position > role.position;
    });
}