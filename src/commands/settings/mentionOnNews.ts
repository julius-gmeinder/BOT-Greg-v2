import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import settings from "../../services/API/settings"
import embeds from "../../utils/embedUtils";

export async function mentionOnNews(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value");

    const res = await settings.toggleMentionOnNews({
        guildId: interaction.guildId!,
        newValue: newValue!
    });

    if(res.status == 409)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.error("Mentions on news were already active")], flags: [MessageFlags.Ephemeral]});
        
        if(!newValue)
            return interaction.reply({ embeds: [embeds.error("Mentions on news were already disabled")], flags: [MessageFlags.Ephemeral]});
    }

    if(res.status == 204)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.success("Mentions on news are now active")], flags: [MessageFlags.Ephemeral]});

        if(!newValue)
            return interaction.reply({ embeds: [embeds.success("Mentions on news are now disabled")], flags: [MessageFlags.Ephemeral]});
    }
    
    return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});
}