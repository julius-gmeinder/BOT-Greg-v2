import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import settings from "../../services/api/settings"
import embeds from "../../utils/embedUtils";

export async function mentionOnDelays(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value");

    const res = await settings.toggleMentionOnDelays({
        guildDiscordId: interaction.guildId!,
        newValue: newValue!
    });

    if(res.status == 409)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.error("Mentions on delays were already active")], flags: [MessageFlags.Ephemeral]});
        
        if(!newValue)
            return interaction.reply({ embeds: [embeds.error("Mentions on delays were already disabled")], flags: [MessageFlags.Ephemeral]});
    }

    if(res.status == 204)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.success("Mentions on delays are now active")], flags: [MessageFlags.Ephemeral]});

        if(!newValue)
            return interaction.reply({ embeds: [embeds.success("Mentions on delays are now disabled")], flags: [MessageFlags.Ephemeral]});
    }
    
    return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});
}