import { ActivityType, Client, GatewayIntentBits, Events } from "discord.js";
import { commands } from "./commands";
import { config } from "./config";
import guilds from "./services/API/guilds";
import * as signalR from "@microsoft/signalr";
import SendMatchAlerts from "./services/matchAlertsService";
import SendMatchDelays from "./services/matchDelaysService";
import SendResultAlerts from "./services/resultAlertsService";
import { GuildData, MatchAlert, MatchDelay, NewsAlert, ResultAlert } from "./models";
import { BuildMatchAlertLogString, BuildMatchDelayLogString, BuildNewsAlertLogString, BuildResultAlertLogString } from "./services/helpers/alertsHelper";
import embedUtils from "./utils/embedUtils";
import { autocompletes } from "./autocomplete";
import { AutoPoster } from 'topgg-autoposter';
import SendNewsAlerts from "./services/newsAlertsService";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	],
});

client.login(config.DISCORD_TOKEN);

client.once(Events.ClientReady, async () => {
    console.log(`[guilds] syncing guilds with database`);

    const guildData: GuildData[] = [];

    await Promise.all(client.guilds.cache.map(async (guild) => {
        const guildOwner = await guild.fetchOwner();
        const guildOwnerName = guildOwner.user.username

        guildData.push({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            owner: guildOwnerName
        });
    }));

    await guilds.sync(guildData);

    client.user?.setPresence({
        activities: [{ 
            name: `hltv.org 🔎`,
            type: ActivityType.Watching
        }],
        status: "dnd"
    });

    console.log("[status] BOT Greg is online 😎");
});

client.on(Events.GuildCreate, async (guild) => {
    console.log(`[guilds] joined ${guild.name} (${guild.id}) with ${guild.memberCount} members`);

    const guildOwner = await guild.fetchOwner();
    const guildOwnerName = guildOwner.user.username

    await guilds.add({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        owner: guildOwnerName
    });
});

client.on(Events.GuildDelete, async (guild) => {
    console.log(`[guilds] left ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
    await guilds.remove(guild.id);
});

client.on(Events.InteractionCreate, async (interaction: any) => {

    if(interaction.isAutocomplete())
    {
        const { commandName } = interaction
        if (autocompletes[commandName as keyof typeof autocompletes]) {
            autocompletes[commandName as keyof typeof autocompletes]
                .autocomplete(interaction)
                .catch(async (err) => {
                    console.log(`[error] ${err} encountered on ${interaction.guild.name} (${interaction.guild.id})`);
                });
        }
    }

    if(interaction.isCommand())
    {
        const { commandName } = interaction;
        if (commands[commandName as keyof typeof commands]) {
            commands[commandName as keyof typeof commands]
                .execute(interaction)
                .catch(async (err) => {
                    console.log(`[error] ${err} encountered on ${interaction.guild.name} (${interaction.guild.id})`);
                    return await interaction.reply({
                        embeds: [embedUtils.error(
                            `There has been an error running the command.\n
                            Try revising the bots permissions, reinvite Greg or reset your servers configuration.\n\n
                            If the issue persists, feel free to join our [community server](https://discord.gg/xBh6jbNjvT) and contact our team.`
                        )]
                    }).catch((err: any) => console.log(`[error] ${err} encountered on ${interaction.guild.name} (${interaction.guild.id}) unable to send error message`));
                });

            const subcommandName = interaction.options._subcommand !== null ? ` ${interaction.options._subcommand}` : "";
            const groupName = interaction.options._group !== null ? ` ${interaction.options._group}` : "";
            
            const { guild, user } = interaction;
            console.log(`[commands] /${commandName}${groupName}${subcommandName} executed in ${guild.name} (${guild.id}) by ${user.username} (${user.id})`);
        }
    }
});

const connection = new signalR.HubConnectionBuilder()
    .withUrl(config.API_BASE + "hub")
    .withAutomaticReconnect([0, 1000, 5000, 10000, 30000, 60000])
    .configureLogging(signalR.LogLevel.None)
    .build()

connection.start()
    .then(() => console.log(`[signalR] connection to ${config.API_BASE} established`))
    .catch((err) => console.log(`[signalR] an error occured while starting the connection. ${err}`));

connection.onreconnecting((err) => console.log(`[signalR] an error occured and the connection was disrupted, trying to reconnect. ${err}`));

connection.onreconnected((connectionId) => console.log(`[signalR] connection to ${config.API_BASE} reestablished`));

connection.on("matchAlerts", async (matchAlerts: MatchAlert[]) => {
    const startTime = performance.now();
    await SendMatchAlerts(client, matchAlerts);
    const endTime = performance.now();
    const elapsedTime = (endTime - startTime).toFixed(2);
    console.log(BuildMatchAlertLogString(matchAlerts, elapsedTime));
});

connection.on("matchDelays", async (matchDelays: MatchDelay[]) => {
    const startTime = performance.now();
    await SendMatchDelays(client, matchDelays);
    const endTime = performance.now();
    const elapsedTime = (endTime - startTime).toFixed(2);
    console.log(BuildMatchDelayLogString(matchDelays,elapsedTime));
});

connection.on("resultAlerts", async (resultAlerts: ResultAlert[]) => {
    const startTime = performance.now();
    await SendResultAlerts(client, resultAlerts);
    const endTime = performance.now();
    const elapsedTime = (endTime - startTime).toFixed(2);
    console.log(BuildResultAlertLogString(resultAlerts, elapsedTime));
});

connection.on("newsAlerts", async (newsAlerts: NewsAlert[]) => {
    const startTime = performance.now();
    await SendNewsAlerts(client, newsAlerts);
    const endTime = performance.now();
    const elapsedTime = (endTime - startTime).toFixed(2);
    console.log(BuildNewsAlertLogString(newsAlerts, elapsedTime));
});

// TOP.GG Stats
const autoPoster = AutoPoster(config.TOPGG_TOKEN, client);
autoPoster.on("posted", () => console.log("[top.gg] successfully updated stats"));
autoPoster.on("error", (error) => console.log(`[top.gg] [error] ${error}`));
