import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import settings from "../../services/API/settings"
import embeds from "../../utils/embedUtils";

export async function alwaysShowNewsImage(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value");

    const res = await settings.toggleAlwaysShowNewsImage({
        guildId: interaction.guildId!,
        newValue: newValue!
    });

    if(res.status == 409)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.error("Always show news images was already enabled")], flags: [MessageFlags.Ephemeral]});
        
        if(!newValue)
            return interaction.reply({ embeds: [embeds.error("Always show news images was already disabled")], flags: [MessageFlags.Ephemeral]});
    }

    if(res.status == 204)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.success("Always show news images are now enabled")], flags: [MessageFlags.Ephemeral]});

        if(!newValue)
            return interaction.reply({ embeds: [embeds.success("Always show news images are now disabled")], flags: [MessageFlags.Ephemeral]});
    }
    
    return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});
}