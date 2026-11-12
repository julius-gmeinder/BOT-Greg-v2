import { config } from "../src/config";
import { commands } from "../src/commands";
import { REST, Routes } from "discord.js";

const commandsData = Object.values(commands).map((command) => command.data);

const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

(async () => {

    rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body: [] })
        .then(() => console.log('Successfully deleted all application commands.'))
        .catch(console.error);

    rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body: commandsData })
        .then(() => console.log('Successfully refreshed all application commands.'))
        .catch(console.error);

})();

