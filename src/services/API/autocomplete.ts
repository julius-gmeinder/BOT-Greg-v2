import { config } from "../../config";
import fetch, { Response } from 'node-fetch-cjs';

export default {
    getTeams,
    getEvents,
    getTiers,
    getVrs,
    getStars,
    getNewsTypes
}

async function getTeams(input:string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Autocomplete/teams?input=${input}`);
    return res;
}

async function getEvents(input:string): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Autocomplete/events?input=${input}`);
    return res;
}

async function getTiers(): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Autocomplete/tiers`);
    return res;
}

async function getVrs(): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Autocomplete/vrs`);
    return res;
}

async function getStars(): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Autocomplete/stars`);
    return res;
}

async function getNewsTypes(): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Autocomplete/newstypes`);
    return res;
}