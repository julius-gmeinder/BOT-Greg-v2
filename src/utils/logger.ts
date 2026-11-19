/*
 * Logger of the bot, writes the same format as the api (Utils/Logging.cs):
 * 21:05:01 INF [alerts] [matches] sent 2 match alerts (took 153.20ms)
 *
 * logger.info("guilds", "syncing guilds with database");
 * logger.warn("stream", "no heartbeat for 75 seconds, trying to reconnect");
 * logger.error(["alerts", "matches"], "unable to send the alert", err);
 *
 * Colors are used when the output is a terminal. LOG_COLORS=true / LOG_COLORS=false forces them on / off
 * (docker logs are not a terminal, so the Dockerfile turns them on).
 */

type LogLevel = "info" | "warn" | "error";

// same escape codes as the api (Utils/Logging.cs), so both apps look the same
const colors = {
    red: "\x1B[31m",
    green: "\x1B[32m",
    yellow: "\x1B[33m",
    blue: "\x1B[34m",
    magenta: "\x1B[35m",
    cyan: "\x1B[36m",
    gray: "\x1B[37m",

    brightRed: "\x1B[1m\x1B[31m",
    brightGreen: "\x1B[1m\x1B[32m",
    brightYellow: "\x1B[1m\x1B[33m",
    brightBlue: "\x1B[1m\x1B[34m",
    brightMagenta: "\x1B[1m\x1B[35m",
    brightCyan: "\x1B[1m\x1B[36m",
    white: "\x1B[1m\x1B[37m",

    dimmed: "\x1B[2m\x1B[37m",

    // back to the default text color, default background, normal intensity
    reset: "\x1B[39m\x1B[49m\x1B[22m",
};

// tags that are not listed here get a color from the fallbackColors, see getTagColor
const colorsByTag: Record<string, string> = {
    // same colors as in the api
    "stream": colors.brightCyan,
    "alerts": colors.brightMagenta,
    "matches": colors.brightGreen,
    "delays": colors.yellow,
    "results": colors.cyan,

    "status": colors.white,
    "guilds": colors.brightBlue,
    "commands": colors.green,
    "autocomplete": colors.green,
    "settings": colors.blue,
    "filters": colors.blue,
    "roles": colors.magenta,
    "emojis": colors.cyan,
    "top.gg": colors.gray,
};

// red and bright yellow are missing on purpose, they are reserved for errors and warnings
const fallbackColors = [
    colors.cyan,
    colors.magenta,
    colors.blue,
    colors.green,
    colors.brightCyan,
    colors.brightMagenta,
    colors.brightBlue,
    colors.brightGreen,
];

const levelNames: Record<LogLevel, string> = {
    info: "INF",
    warn: "WRN",
    error: "ERR",
};

const levelColors: Record<LogLevel, string> = {
    info: colors.green,
    warn: colors.brightYellow,
    error: colors.brightRed,
};

// undefined means the default text color of the terminal
const messageColors: Record<LogLevel, string | undefined> = {
    info: undefined,
    warn: colors.brightYellow,
    error: colors.brightRed,
};

function info(tags: string | string[], message: string): void {
    write("info", tags, message);
}

function warn(tags: string | string[], message: string): void {
    write("warn", tags, message);
}

// err is optional, its stack trace is written below the message
function error(tags: string | string[], message: string, err?: unknown): void {
    write("error", tags, message, err);
}

function write(level: LogLevel, tags: string | string[], message: string, err?: unknown): void {
    // checked on every call, because the .env file may not be loaded yet when this file is imported
    const useColors = shouldUseColors();

    const timestamp = getTimestamp() + " ";
    const levelName = levelNames[level];

    // following lines (multiline messages, stack traces) are indented, so they start below the tags
    const indentation = " ".repeat(timestamp.length + levelName.length + 1);

    let line = colorize(timestamp, colors.dimmed, useColors);
    line += colorize(levelName, levelColors[level], useColors) + " ";

    const tagList = Array.isArray(tags) ? tags : [tags];

    for (const tag of tagList)
        line += colorize(`[${tag}]`, getTagColor(tag), useColors) + " ";

    line += colorize(indent(message, indentation), messageColors[level], useColors);

    if (err !== undefined)
        line += "\n" + indentation + colorize(indent(getErrorText(err), indentation), colors.red, useColors);

    console.log(line);
}

// "21:05:01", local time
function getTimestamp(): string {
    const now = new Date();

    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

function getTagColor(tag: string): string {
    const color = colorsByTag[tag];

    if (color)
        return color;

    // the sum of the letters keeps the color of a tag the same forever
    let sum = 0;

    for (const letter of tag)
        sum += letter.charCodeAt(0);

    return fallbackColors[sum % fallbackColors.length];
}

function getErrorText(err: unknown): string {
    if (err instanceof Error && err.stack)
        return err.stack;

    return String(err);
}

function colorize(text: string, color: string | undefined, useColors: boolean): string {
    if (!useColors || !color)
        return text;

    return color + text + colors.reset;
}

function indent(text: string, indentation: string): string {
    return text.replace(/\r?\n/g, "\n" + indentation);
}

function shouldUseColors(): boolean {
    const setting = process.env.LOG_COLORS?.toLowerCase();

    if (setting === "true")
        return true;

    if (setting === "false")
        return false;

    // https://no-color.org
    if (process.env.NO_COLOR)
        return false;

    // color codes would only be noise in a file or a pipe
    return process.stdout.isTTY === true;
}

export default {
    info,
    warn,
    error,
}
