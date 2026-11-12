import { config } from "../../config";
import fetch, { Response } from 'node-fetch-cjs';
import { ToggleSetting } from "../../models";

export default {
    toggleMentionOnDelays,
    toggleMentionOnResults,
    toggleCensorResults,
    togglePauseAlerts,
    toggleMentionOnNews,
    toggleAlwaysShowNewsImage
}

async function toggleMentionOnDelays({guildId, newValue}: ToggleSetting): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Settings/ToggleMentionOnDelays`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            newValue: newValue
        })
    });
    return res;
}

async function toggleMentionOnResults({guildId, newValue}: ToggleSetting): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Settings/ToggleMentionOnResults`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            newValue: newValue
        })
    });
    return res;
}

async function toggleCensorResults({guildId, newValue}: ToggleSetting): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Settings/ToggleCensorResults`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            newValue: newValue
        })
    });
    return res;
}

async function togglePauseAlerts({guildId, newValue}: ToggleSetting): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Settings/TogglePauseAlerts`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            newValue: newValue
        })
    });
    return res;
}

async function toggleMentionOnNews({guildId, newValue}: ToggleSetting): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Settings/ToggleMentionOnNews`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            newValue: newValue
        })
    });
    return res;
}

async function toggleAlwaysShowNewsImage({guildId, newValue}: ToggleSetting): Promise<Response> {
    const res = await fetch(config.API_BASE + `api/Settings/ToggleAlwaysShowNewsImage`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guildId: guildId,
            newValue: newValue
        })
    });
    return res;
}