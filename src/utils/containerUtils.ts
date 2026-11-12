import { ContainerBuilder, TextDisplayBuilder } from "discord.js";
import { successHex, neturalHex, warningHex, errorHex } from "../utils/colorUtils"

export default {
    successHex,
    neturalHex,
    warningHex,
    errorHex,
    success,
    neutral,
    warning,
    error
}

function success(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(successHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(message));
}

function neutral(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(neturalHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(message));
}

function warning(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(warningHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(message));
}

function error(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(errorHex)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(message));
}