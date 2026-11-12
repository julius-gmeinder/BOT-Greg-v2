import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, ComponentType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import embedUtils from "../../utils/embedUtils";
import guilds from "../../services/API/guilds";
import roles from "../../services/API/roles";
import { DeleteRoles, HasHigherRole, HasManageRoles, missingHigherRoleMessage, missingManageRolesMessage } from "../../utils/roleUtils";

export const data = new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Resets this servers entire configuration (alerts, filters, settings, roles and role-links)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false);

export async function execute(interaction: CommandInteraction) {
    const reply = await interaction.reply({
        embeds: [embedUtils.error(
            "Continuing will reset this servers entire configuration\n(alerts, filters, settings, roles and role-links)\n\n" +
            "Your server will be in the same state as a new server: role management disabled and only the default filter (matches covered by HLTV)"
        ).setTitle("Reset Configuration?")],
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
            // the roles of the bot have to be deleted after the reset, so the permissions are checked before anything is reset.
            // Servers with disabled role management have no roles, they need no permissions
            const rolesRes = await roles.getRoles(interaction.guildId!);

            if(rolesRes.status !== 200)
                return buttonInteraction.update({embeds: [embedUtils.error("There has been an error running the command")], components: []});

            const currentRoleIds = await rolesRes.json() as string[];

            if(currentRoleIds.length > 0) {
                if(!HasManageRoles(interaction.guild))
                    return buttonInteraction.update({ embeds: [embedUtils.error(missingManageRolesMessage)], components: [] });

                if(!HasHigherRole(interaction.guild, currentRoleIds))
                    return buttonInteraction.update({ embeds: [embedUtils.error(missingHigherRoleMessage)], components: [] });
            }

            const res = await guilds.reset(interaction.guildId!);

            if(res.status === 200) {
                // empty if the role management was disabled
                const roleIds: string[] = await res.json() as string[];
                await DeleteRoles(interaction.guild, roleIds);

                return buttonInteraction.update({embeds: [embedUtils.success("Your configuration has been successfully reset\n\n*The default filter is back, you will only get alerts for matches covered by HLTV once you set your channels with `/alerts config`*")], components: []});
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
