import { ChatInputCommandInteraction } from "discord.js";
import settings from "../../services/api/settings"
import containers from "../../utils/containerUtils";

export async function mentionOnDelays(interaction: ChatInputCommandInteraction) {
    const newValue = interaction.options.getBoolean("value");

    const res = await settings.toggleMentionOnDelays({
        guildDiscordId: interaction.guildId!,
        newValue: newValue!
    });

    if(res.status == 409)
    {
        if(newValue)
            return interaction.reply(containers.reply(containers.error("Mentions on delays were already active")));
        
        if(!newValue)
            return interaction.reply(containers.reply(containers.error("Mentions on delays were already disabled")));
    }

    if(res.status == 204)
    {
        if(newValue)
            return interaction.reply(containers.reply(containers.success("Mentions on delays are now active")));

        if(!newValue)
            return interaction.reply(containers.reply(containers.success("Mentions on delays are now disabled")));
    }
    
    return interaction.reply(containers.reply(containers.error("There has been an error running the command")));
}