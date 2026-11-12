import { AutocompleteInteraction } from "discord.js";
import autocomplete from "../../../services/API/autocomplete";
import { AutocompleteDTO } from "../../../models";

export async function autocompleteFiltersAddNews(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if(focused.name === "article-type")
    {
        const res = await autocomplete.getNewsTypes()

        if(res.status !== 200)
            return;

        const newsTypes = await res.json() as Array<AutocompleteDTO>;
        return interaction.respond(newsTypes);
    }
}