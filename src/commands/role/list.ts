import { CommandInteraction } from "discord.js";
import containers from "../../utils/containerUtils";
import links from "../../services/api/links";
import { RoleLinksTreeItem } from "../../models";
import settings from "../../services/api/settings";
import { roleManagementDisabledMessage } from "../../utils/roleUtils";

export async function roleList(interaction: CommandInteraction) {
    // without role management the bot has no roles and no links
    const roleManagement = await settings.isRoleManagementEnabled(interaction.guildId!);

    if(roleManagement === false)
        return interaction.reply(containers.reply(containers.neutral(roleManagementDisabledMessage)));

    const res = await links.getRoleLinksTree(interaction.guildId!);

    if(res.status !== 200)
        return interaction.reply(containers.reply(containers.error("There has been an error running the command")));

    const data = await res.json() as RoleLinksTreeItem[];

    if(data.length === 0)
        return interaction.reply(containers.reply(containers.neutral("There are no links at the moment")));

    const container = containers.titled(
        containers.neturalHex,
        "Roles",
        `Found ***${data.length}*** role${data.length > 1 ? "s" : ""} on ***${interaction.guild!.name}***`
    );

    // one block per role of the bot, followed by the roles that are linked to it
    const blocks = data.map((item: RoleLinksTreeItem) => {
        if(item.linkedRoleDiscordIds.length === 0)
            return `<@&${item.botRoleDiscordId}>\n-# no links`;

        return `<@&${item.botRoleDiscordId}>\n🔗 ${item.linkedRoleDiscordIds.map(x => `<@&${x}>`).join(", ")}`;
    });

    container.addSeparatorComponents(containers.divider());
    container.addTextDisplayComponents(containers.text(blocks.join("\n\n")));

    return interaction.reply(containers.reply(container));
}
