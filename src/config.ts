import dotenv from "dotenv";

dotenv.config();

const { 
    DISCORD_TOKEN, 
    DISCORD_CLIENT_ID, 
    API_BASE,
    TOPGG_TOKEN
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !API_BASE || !TOPGG_TOKEN) {
    throw new Error("Missing environment variables");
}

export const config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    API_BASE,
    TOPGG_TOKEN
};