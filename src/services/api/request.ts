import { config } from "../../config";
import fetch, { Response } from 'node-fetch-cjs';

const jsonHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

// builds a query string with encoded values, e. g. query({ guildDiscordId: "1" }) => "?guildDiscordId=1"
export function query(params: Record<string, string>): string {
    return "?" + new URLSearchParams(params).toString();
}

export async function get(path: string): Promise<Response> {
    return fetch(config.API_BASE + path, { headers: { 'Accept': 'application/json' } });
}

export async function send(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<Response> {
    return fetch(config.API_BASE + path, {
        method: method,
        headers: jsonHeaders,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

// error responses of the api are either a short code ("limit", "duplicate", "roleManagement", ...),
// a validation problem object or empty. Returns the code, or null if there is none
export async function readErrorCode(res: Response): Promise<string | null> {
    const text = await res.text().catch(() => "");

    if(text.length === 0)
        return null;

    try {
        const data = JSON.parse(text);
        return typeof data === "string" ? data : null;
    }
    catch {
        // plain text body
        return text;
    }
}
