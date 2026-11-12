import { AutocompleteInteraction } from "discord.js";
import { autocompleteFiltersAdd } from "./add";

export async function autocomplete(interaction: AutocompleteInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if(subcommand === "add")
        await autocompleteFiltersAdd(interaction);
}
