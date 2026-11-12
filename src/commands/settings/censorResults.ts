import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import settings from "../../services/api/settings"
import embeds from "../../utils/embedUtils";

export async function censorResults(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value");

    const res = await settings.toggleCensorResults({
        guildDiscordId: interaction.guildId!,
        newValue: newValue!
    });

    if(res.status == 409)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.error("Results were already censored")], flags: [MessageFlags.Ephemeral]});
        
        if(!newValue)
            return interaction.reply({ embeds: [embeds.error("Results were already uncensored")], flags: [MessageFlags.Ephemeral]});
    }

    if(res.status == 204)
    {
        if(newValue)
            return interaction.reply({ embeds: [embeds.success("Results are now censored")], flags: [MessageFlags.Ephemeral]});

        if(!newValue)
            return interaction.reply({ embeds: [embeds.success("Results are now uncensored")], flags: [MessageFlags.Ephemeral]});
    }
    
    return interaction.reply({ embeds: [embeds.error("There has been an error running the command")], flags: [MessageFlags.Ephemeral]});
}