import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'discord.js';

/*
 * Application emojis.
 *
 * Every emoji is identified by its file, relative to src/assets/emojis.
 * The file directly corresponds to the emojis name on the discord dev portal:
 * numbers/green/01.png => numbers_green_01
 *
 * To add a map:    add the file to src/assets/emojis/maps, add it to Maps and mapFiles, upload it to the dev portal.
 * To add a number: add the files for every color, raise maxNumber, upload them to the dev portal.
 * To add a color:  add the files for every number, add it to Colors, upload them to the dev portal.
 */

const emojiAssetsDir = 'src/assets/emojis';

/* ---------- shared ---------- */

// emoji name -> inline string (<:name:id>), filled by loadEmojis()
const inlineStrings = new Map<string, string>();

// numbers/green/01.png => numbers_green_01
const toEmojiName = (file: string): string => {
    const withoutExtension = file.replace(/\.[^.]+$/, '');
    return withoutExtension.replace(/\//g, '_');
};

// falls back to :name:, if the emoji is not loaded or not uploaded to the application
const toInlineString = (file: string): string => {
    const name = toEmojiName(file);
    return inlineStrings.get(name) ?? `:${name}:`;
};

const toAssetPath = (file: string): string => {
    return path.join(emojiAssetsDir, file);
};

/* ---------- numbers ---------- */

enum Colors {
    Blue = 'blue',
    Green = 'green',
    Red = 'red',
}

const minNumber = 1;
const maxNumber = 50;

const hasNumberEmoji = (number: number): boolean => {
    return Number.isInteger(number) && number >= minNumber && number <= maxNumber;
};

const numberFile = (color: Colors, number: number): string => {
    if (!hasNumberEmoji(number)) {
        throw new RangeError(`There is no number emoji for ${number}, only for ${minNumber} - ${maxNumber}`);
    }
    return `numbers/${color}/${String(number).padStart(2, '0')}.png`;
};

/**
 * Returns the inline string of a number emoji, to use in an embed or container.
 * Falls back to the plain number, if there is no emoji for it.
 */
const getNumber = (color: Colors, number: number): string => {
    if (!hasNumberEmoji(number)) return number.toString();
    return toInlineString(numberFile(color, number));
};

const getNumberPath = (color: Colors, number: number): string => {
    return toAssetPath(numberFile(color, number));
};

const getNumberFile = (color: Colors, number: number): Promise<Buffer> => {
    return readFile(getNumberPath(color, number));
};

/* ---------- maps ---------- */

enum Maps {
    Ancient = 'Ancient',
    Anubis = 'Anubis',
    Cache = 'Cache',
    Dust2 = 'Dust II',
    Inferno = 'Inferno',
    Mirage = 'Mirage',
    Nuke = 'Nuke',
    Overpass = 'Overpass',
    Vertigo = 'Vertigo',
    Default = 'Default', // for maps without their own emoji
}

const mapFiles: Record<Maps, string> = {
    [Maps.Ancient]: 'maps/ancient.png',
    [Maps.Anubis]: 'maps/anubis.png',
    [Maps.Cache]: 'maps/cache.png',
    [Maps.Dust2]: 'maps/dust2.png',
    [Maps.Inferno]: 'maps/inferno.png',
    [Maps.Mirage]: 'maps/mirage.png',
    [Maps.Nuke]: 'maps/nuke.png',
    [Maps.Overpass]: 'maps/overpass.png',
    [Maps.Vertigo]: 'maps/vertigo.png',
    [Maps.Default]: 'maps/default.png', // TODO: file not added yet
};

const toMap = (name: string): Maps => {
    const normalized = name.trim().toLowerCase();
    return Object.values(Maps).find(map => map.toLowerCase() === normalized) ?? Maps.Default;
};

const getMap = (map: Maps): string => {
    return toInlineString(mapFiles[map]);
};

const getMapPath = (map: Maps): string => {
    return toAssetPath(mapFiles[map]);
};

const getMapFile = (map: Maps): Promise<Buffer> => {
    return readFile(getMapPath(map));
};

/* ---------- loading ---------- */

const allEmojiFiles = (): string[] => {
    const files = Object.values(mapFiles);

    for (const color of Object.values(Colors)) {
        for (let number = minNumber; number <= maxNumber; number++) {
            files.push(numberFile(color, number));
        }
    }

    return files;
};

/**
 * Fetches the application emojis from discord and remembers their inline strings.
 * Emoji ids differ per application, so they have to be resolved at runtime.
 * Has to be called once after the client is ready, before getNumber() / getMap() return usable results.
 */
const loadEmojis = async (client: Client<true>): Promise<void> => {
    const applicationEmojis = await client.application.emojis.fetch();

    inlineStrings.clear();
    for (const emoji of applicationEmojis.values()) {
        if (emoji.name) inlineStrings.set(emoji.name, emoji.toString());
    }

    const notUploaded = allEmojiFiles()
        .map(toEmojiName)
        .filter(name => !inlineStrings.has(name));

    if (notUploaded.length > 0) {
        console.warn(`[emojiUtils] ${notUploaded.length} emoji(s) are not uploaded to the application: ${notUploaded.join(', ')}`);
    }
};

export default {
    Colors,
    Maps,
    loadEmojis,
    getNumber,
    getNumberPath,
    getNumberFile,
    toMap,
    getMap,
    getMapPath,
    getMapFile,
}

export {
    Colors,
    Maps,
    loadEmojis,
    getNumber,
    getNumberPath,
    getNumberFile,
    toMap,
    getMap,
    getMapPath,
    getMapFile,
}
