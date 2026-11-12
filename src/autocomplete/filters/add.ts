import { AutocompleteInteraction } from "discord.js";
import autocomplete from "../../services/API/autocomplete";
import { AutocompleteDTO, AutocompleteIntDTO } from "../../models";

export async function autocompleteFiltersAdd(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    if(focused.name === "team") {
        const res = await autocomplete.getTeams(focused.value)

        if(res.status !== 200)
            return;

        const teams = await res.json() as Array<AutocompleteDTO>;
        return interaction.respond(teams);
    }

    if(focused.name === "event") {
        const res = await autocomplete.getEvents(focused.value)

        if(res.status !== 200)
            return;

        const events = await res.json() as Array<AutocompleteDTO>;
        return interaction.respond(events);
    }

    // the value of a tier is a number (0 Major - 4 C-Tier)
    if(focused.name === "event-tier"){
        const res = await autocomplete.getTiers()

        if(res.status !== 200)
            return;

        const tiers = await res.json() as Array<AutocompleteIntDTO>;
        return interaction.respond(tiers);
    }

    if(focused.name === "vrs-rank") {
        const res = await autocomplete.getVrs()

        if(res.status !== 200)
            return;

        const vrs = await res.json() as Array<AutocompleteIntDTO>;
        return interaction.respond(vrs);
    }
}
