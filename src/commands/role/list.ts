import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import embedUtils from "../../utils/embedUtils";
import links from "../../services/api/links";
import { RoleLinksTreeItem } from "../../models";
import settings from "../../services/api/settings";
import { roleManagementDisabledMessage } from "../../utils/roleUtils";

export async function roleList(interaction: CommandInteraction) {
    // without role management the bot has no roles and no links
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(roleManagement === false)
        return interaction.reply({ embeds: [embedUtils.neutral(roleManagementDisabledMessage)], flags: [MessageFlags.Ephemeral] });

    const res = await links.getRoleLinksTree(interaction.guildId!);
    const embeds = [];
	
    if(res.status === 200) {
        const data = await res.json() as RoleLinksTreeItem[];
        
        if(data.length === 0)
            return interaction.reply({ embeds: [embedUtils.neutral("There are no links at the moment")], flags: [MessageFlags.Ephemeral] });

        const roleLinksPerEmbed: number = 8;
        const pageAmount: number = (data.length - (data.length % roleLinksPerEmbed)) / roleLinksPerEmbed + 1;
        let pageNumber: number = 1;

        for (let i = 0; i < data.length; i += roleLinksPerEmbed) {
            const chunk: Array<RoleLinksTreeItem> = data.slice(i, i + roleLinksPerEmbed);

            const embed = new EmbedBuilder()
                .setColor(embedUtils.neturalHex)
                .setFooter({ text: `Page ${pageNumber} of ${pageAmount}`});

            chunk.forEach((item: RoleLinksTreeItem) => {

                let linkedRoleIds: string = "-";
                if(item.linkedRoleDiscordIds.length > 0)
                    linkedRoleIds = item.linkedRoleDiscordIds.map(x => `<@&${x}>`).join("\n");

                embed.addFields(
                    { name: `*Role*`, value: `<@&${item.botRoleDiscordId}>`, inline: true},
                    { name: `*Links*`, value: `${linkedRoleIds}`, inline: true},
                    { name: `\u200b`, value: `\u200b`, inline: true}
                )
            });

            embeds.push(embed);
            pageNumber++;
        }

        embeds[0].setColor(embedUtils.neturalHex)
            .setTitle("Roles")
            .setDescription(`Found ***${data.length}*** role${data.length > 1 ? "s" : ""} on ***${interaction.guild!.name}***`)
            .setThumbnail(interaction.guild!.iconURL());

        return interaction.reply({ embeds: embeds, flags: [MessageFlags.Ephemeral] });
    }

    return interaction.reply({ embeds: [embedUtils.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});
}