import { EmbedBuilder } from "discord.js";
import { successHex, neutralHex, warningHex, errorHex } from "../utils/colorUtils"

export default {
    successHex,
    neutralHex,
    warningHex,
    errorHex,
    success,
    neutral,
    warning,
    error
}

function success(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(successHex)
        .setDescription(message);
}

function neutral(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(neutralHex)
        .setDescription(message);
}

function warning(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(warningHex)
        .setDescription(message);
}

function error(message: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(errorHex)
        .setDescription(message);
}