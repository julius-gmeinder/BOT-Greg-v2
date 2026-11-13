import { ChatInputCommandInteraction } from "discord.js";
import settings from "../../services/api/settings"
import containers from "../../utils/containerUtils";

export async function censorResults(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value");

    const res = await settings.toggleCensorResults({
        guildDiscordId: interaction.guildId!,
        newValue: newValue!
    });

    if(res.status == 409)
    {
        if(newValue)
            return interaction.reply(containers.reply(containers.error("Results were already censored")));
        
        if(!newValue)
            return interaction.reply(containers.reply(containers.error("Results were already uncensored")));
    }

    if(res.status == 204)
    {
        if(newValue)
            return interaction.reply(containers.reply(containers.success("Results are now censored")));

        if(!newValue)
            return interaction.reply(containers.reply(containers.success("Results are now uncensored")));
    }
    
    return interaction.reply(containers.reply(containers.error("There has been an error running the command")));
}