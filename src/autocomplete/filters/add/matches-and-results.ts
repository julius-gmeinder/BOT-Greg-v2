import { AutocompleteInteraction } from "discord.js";
import autocomplete from "../../../services/API/autocomplete";
import { AutocompleteDTO, AutocompleteIntDTO } from "../../../models";

export async function autocompleteFiltersAddMatchesResults(interaction: AutocompleteInteraction) {
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

    if(focused.name === "event-tier"){
        const res = await autocomplete.getTiers()

        if(res.status !== 200)
            return;

        const tiers = await res.json() as Array<AutocompleteDTO>;
        return interaction.respond(tiers);
    }

    if(focused.name === "stars") {
        const res = await autocomplete.getStars()

        if(res.status !== 200)
            return;

        const stars = await res.json() as Array<AutocompleteIntDTO>;
        return interaction.respond(stars);
    }

    if(focused.name === "vrs-rank") {
        const res = await autocomplete.getVrs()

        if(res.status !== 200)
            return;

        const vrs = await res.json() as Array<AutocompleteIntDTO>;
        return interaction.respond(vrs);
    }
}