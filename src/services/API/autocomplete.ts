import { Response } from 'node-fetch-cjs';
import { get, query } from "./request";

export default {
    getTeams,
    getEvents,
    getTiers,
    getVrs
}

async function getTeams(input: string): Promise<Response> {
    return get(`api/Autocomplete/teams${query({ input: input })}`);
}

async function getEvents(input: string): Promise<Response> {
    return get(`api/Autocomplete/events${query({ input: input })}`);
}

async function getTiers(): Promise<Response> {
    return get(`api/Autocomplete/tiers`);
}

async function getVrs(): Promise<Response> {
    return get(`api/Autocomplete/vrs`);
}
