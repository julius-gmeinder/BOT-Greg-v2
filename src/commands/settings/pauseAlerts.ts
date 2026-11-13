import { ChatInputCommandInteraction } from "discord.js";
import settings from "../../services/api/settings"
import containers from "../../utils/containerUtils";

export async function pauseAlerts(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value");

    const res = await settings.togglePauseAlerts({
        guildDiscordId: interaction.guildId!,
        newValue: newValue!
    });

    if(res.status == 409)
    {
        if(newValue)
            return interaction.reply(containers.reply(containers.error("Alerts were already paused")));
        
        if(!newValue)
            return interaction.reply(containers.reply(containers.error("Alerts were already unpaused")));
    }

    if(res.status == 204)
    {
        if(newValue)
            return interaction.reply(containers.reply(containers.success("Alerts are now paused")));

        if(!newValue)
            return interaction.reply(containers.reply(containers.success("Alerts are now unpaused")));
    }
    
    return interaction.reply(containers.reply(containers.error("There has been an error running the command")));
}