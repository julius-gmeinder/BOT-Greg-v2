import { AttachmentBuilder, Client, EmbedBuilder, TextChannel } from "discord.js";
import embeds from "../utils/embedUtils";
import { NewsAlert } from "../models";
import { BuildAttachment, BuildNewsAttachment, BuildRolesString } from "./helpers/alertsHelper";
import { config } from "../config";

export default async function SendNewsAlerts(client: Client<boolean>, newsAlerts: NewsAlert[]) {
    newsAlerts.forEach((newsAlert: NewsAlert) => {
        const { url, headline, isFeatured, isShort } = newsAlert.news;
        const { date, time, description, imageLocation, eventName } = newsAlert.news.newsPage;

        const embed = new EmbedBuilder()
            .setColor(embeds.neturalHex)
            .setAuthor({ name: 'hltv.org', iconURL: `attachment://hltv.png`, url: url })
            .setTitle(headline)
            .setURL(url)
            .setTimestamp();

        if(description)
            embed.setDescription(description);
        
        const imageEmbed = EmbedBuilder.from(embed);
        
        const defAttachmment = BuildAttachment();
        const embedFiles: AttachmentBuilder[] = [ defAttachmment ];
        const imageEmbedFiles: AttachmentBuilder[] = [ defAttachmment ];

        if(imageLocation) {
            const imageName = "news-image.png";
            imageEmbedFiles.push(BuildNewsAttachment(`${config.API_BASE}${imageLocation}`, imageName));
            imageEmbed.setImage(`attachment://${imageName}`);
        }

        newsAlert.guilds.forEach(async (guild) => {
            const channel = client.channels.cache.get(guild.channelId) as TextChannel;

            if(!channel)
                return;

            const imageCondition = imageLocation && (isFeatured || guild.alwaysShowNewsImage);
            const embedToSend = imageCondition ? imageEmbed : embed;
            const filesToSend = imageCondition ? imageEmbedFiles : embedFiles;

            await channel.send({ 
                content: guild.mentionOnNews ? BuildRolesString(guild.roleIds) : "",
                files: filesToSend,
                embeds: [embedToSend]
            }).catch(async (err) => {
                console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id})`);
                await channel.send({ 
                    embeds: [embeds.error(
                        `There has been an error sending out a news alert\n
                        Try revising the bots permissions, reinvite Greg or reset your servers configuration.\n\n
                        If the issue persists, feel free to join our [community server](https://discord.gg/xBh6jbNjvT) and contact our team.`
                    )]
                }).catch((err) => console.log(`[error] ${err} encountered on ${channel.guild.name} (${channel.guild.id}) unable to send error message`));
            });
        });
    });
}