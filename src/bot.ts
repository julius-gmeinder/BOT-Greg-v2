import { ActivityType, Client, GatewayIntentBits, Events } from "discord.js";
import { commands } from "./commands";
import { config } from "./config";
import guilds from "./services/api/guilds";
import SendMatchAlerts from "./services/matchAlertsService";
import SendMatchDelays from "./services/matchDelaysService";
import SendResultAlerts from "./services/resultAlertsService";
import { GuildData, MatchAlert, MatchDelay, ResultAlert } from "./models";
import { BuildMatchAlertLogString, BuildMatchDelayLogString, BuildResultAlertLogString } from "./services/helpers/alertsHelper";
import embedUtils from "./utils/embedUtils";
import { autocompletes } from "./autocomplete";
import { AutoPoster } from 'topgg-autoposter';
import ConnectAlertStream from "./services/alertStreamService";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	],
});

client.login(config.DISCORD_TOKEN);

client.once(Events.ClientReady, async () => {
    console.log(`[guilds] syncing guilds with database`);

    const guildData: GuildData[] = client.guilds.cache.map((guild) => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount
    }));

    await guilds.sync(guildData)
        .catch((err) => console.log(`[guilds] [error] unable to sync guilds with the api. ${err}`));

    client.user?.setPresence({
        activities: [{ 
            name: `liquipedia.net 🔎`,
            type: ActivityType.Watching
        }],
        status: "dnd"
    });

    console.log("[status] BOT Greg is online 😎");
});

client.on(Events.GuildCreate, async (guild) => {
    console.log(`[guilds] joined ${guild.name} (${guild.id}) with ${guild.memberCount} members`);

    await guilds.add({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount
    }).catch((err) => console.log(`[guilds] [error] unable to add ${guild.name} (${guild.id}). ${err}`));
});

client.on(Events.GuildDelete, async (guild) => {
    console.log(`[guilds] left ${guild.name} (${guild.id}) with ${guild.memberCount} members`);
    await guilds.remove(guild.id)
        .catch((err) => console.log(`[guilds] [error] unable to remove ${guild.name} (${guild.id}). ${err}`));
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
                    const errorMessage = {
                        embeds: [embedUtils.error(
                            `There has been an error running the command.\n
                            Try revising the bots permissions, reinvite Greg or reset your servers configuration.\n\n
                            If the issue persists, feel free to join our [community server](https://discord.gg/xBh6jbNjvT) and contact our team.`
                        )]
                    };

                    // commands that already deferred or replied can not be replied to a second time
                    const sendError = interaction.deferred || interaction.replied
                        ? interaction.editReply(errorMessage)
                        : interaction.reply(errorMessage);

                    return await sendError.catch((err: any) => console.log(`[error] ${err} encountered on ${interaction.guild.name} (${interaction.guild.id}) unable to send error message`));
                });

            const subcommandName = interaction.options._subcommand !== null ? ` ${interaction.options._subcommand}` : "";
            const groupName = interaction.options._group !== null ? ` ${interaction.options._group}` : "";
            
            const { guild, user } = interaction;
            console.log(`[commands] /${commandName}${groupName}${subcommandName} executed in ${guild.name} (${guild.id}) by ${user.username} (${user.id})`);
        }
    }
});

// the api pushes alerts through a server-sent-events stream, reconnecting is handled by the stream service
ConnectAlertStream({
    matchAlerts: async (matchAlerts: MatchAlert[]) => {
        const startTime = performance.now();
        await SendMatchAlerts(client, matchAlerts);
        const endTime = performance.now();
        const elapsedTime = (endTime - startTime).toFixed(2);
        console.log(BuildMatchAlertLogString(matchAlerts, elapsedTime));
    },
    matchDelays: async (matchDelays: MatchDelay[]) => {
        const startTime = performance.now();
        await SendMatchDelays(client, matchDelays);
        const endTime = performance.now();
        const elapsedTime = (endTime - startTime).toFixed(2);
        console.log(BuildMatchDelayLogString(matchDelays, elapsedTime));
    },
    resultAlerts: async (resultAlerts: ResultAlert[]) => {
        const startTime = performance.now();
        await SendResultAlerts(client, resultAlerts);
        const endTime = performance.now();
        const elapsedTime = (endTime - startTime).toFixed(2);
        console.log(BuildResultAlertLogString(resultAlerts, elapsedTime));
    }
});

// TOP.GG Stats
const autoPoster = AutoPoster(config.TOPGG_TOKEN, client);
autoPoster.on("posted", () => console.log("[top.gg] successfully updated stats"));
autoPoster.on("error", (error) => console.log(`[top.gg] [error] ${error}`));
