import { ContainerBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder } from "discord.js";
import { successHex, neturalHex, warningHex, errorHex } from "../utils/colorUtils"

export const genericErrorMessage = "There has been an error running the command";

export const supportHint = "Try revising the bots permissions, reinvite Greg or reset your servers configuration.\n\nIf the issue persists, feel free to join our [community server](https://discord.gg/xBh6jbNjvT) and contact our team.";

export default {
    successHex,
    neturalHex,
    warningHex,
    errorHex,
    success,
    neutral,
    warning,
    error,
    titled,
    text,
    divider,
    spacer,
    reply,
    publicReply,
    edit
}

function success(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(successHex)
        .addTextDisplayComponents(text(message));
}

function neutral(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(neturalHex)
        .addTextDisplayComponents(text(message));
}

function warning(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(warningHex)
        .addTextDisplayComponents(text(message));
}

function error(message: string): ContainerBuilder {
    return new ContainerBuilder()
        .setAccentColor(errorHex)
        .addTextDisplayComponents(text(message));
}

// container with a heading, followed by a divider and the body.
// More components (texts, action rows, ...) can be added to the returned container
function titled(color: number, title: string, body?: string): ContainerBuilder {
    const container = new ContainerBuilder()
        .setAccentColor(color)
        .addTextDisplayComponents(text(`## ${title}`));

    if(body)
        container.addSeparatorComponents(divider()).addTextDisplayComponents(text(body));

    return container;
}

function text(content: string): TextDisplayBuilder {
    return new TextDisplayBuilder().setContent(content);
}

function divider(spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small): SeparatorBuilder {
    return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

function spacer(spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small): SeparatorBuilder {
    return new SeparatorBuilder().setDivider(false).setSpacing(spacing);
}

// unlike embeds, the text of a container can mention roles and users, which is never wanted for these messages
const allowedMentions = { parse: [] };

// payload for an ephemeral reply
function reply(...containers: ContainerBuilder[]) {
    const flags: Array<MessageFlags.Ephemeral | MessageFlags.IsComponentsV2> = [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2];
    return { components: containers, flags, allowedMentions };
}

// payload for a reply (or a channel message) that everyone can see
function publicReply(...containers: ContainerBuilder[]) {
    return { components: containers, flags: MessageFlags.IsComponentsV2 as const, allowedMentions };
}

// payload for editing / updating a reply. Deferred replies are not flagged as components v2 yet, so the flag is always set
function edit(...containers: ContainerBuilder[]) {
    return { components: containers, flags: MessageFlags.IsComponentsV2 as const, allowedMentions };
}
