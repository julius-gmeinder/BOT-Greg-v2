import { AutocompleteInteraction } from "discord.js";
import { autocompleteFiltersAddMatchesResults } from "./add/matches-and-results";
import { autocompleteFiltersAddNews } from "./add/news";

export async function autocomplete(interaction: AutocompleteInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if(subcommandGroup === "add") {
        if(subcommand === "matches-and-results") {
            await autocompleteFiltersAddMatchesResults(interaction);
        }

        if(subcommand === "news") {
            await autocompleteFiltersAddNews(interaction);
        }
    }
}