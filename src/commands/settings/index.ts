import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, ContainerBuilder, MessageFlags, PermissionFlagsBits, SectionBuilder, SeparatorSpacingSize, SlashCommandBuilder } from "discord.js";
import settings from "../../services/api/settings";
import { readErrorCode } from "../../services/api/request";
import containers, { genericErrorMessage } from "../../utils/containerUtils";
import { DeleteRoles } from "../../utils/roleUtils";
import { GuildSettings, GuildSettingsRes, SettingsStateItem } from "../../models";
import { checkRoleDeletionAsync, CreatedRoles, createRolesAsync, getCreatedRoleIds } from "./roleManagement";

export const data = new SlashCommandBuilder()
    .setName("settings")
    .setDescription("View and change the settings of this server (pause alerts, censor results, role management, ...)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

type SettingKey = keyof GuildSettings;
type SettingsState = Record<SettingKey, SettingsStateItem>;

// these settings only control mentions, so they have no effect while the role management is disabled
const mentionSettings: SettingKey[] = ["mentionOnDelays", "mentionOnResults"];

export async function execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const currentSettingsRes = await settings.getSettings(interaction.guildId!);

    if(currentSettingsRes.status !== 200)
        return interaction.editReply(containers.edit(containers.error(genericErrorMessage)));

    const currentSettings = await currentSettingsRes.json() as GuildSettings;
    const state = initState(currentSettings);

    const reply = await interaction.editReply(containers.edit(buildContainer(interaction, state, currentSettings)));

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 120_000
    });

    collector.on('collect', async (buttonInteraction) => {
        await buttonInteraction.deferUpdate();

        // custom ids: "<interaction id>:<action>" or "<interaction id>:toggle:<setting>"
        const [, action, key] = buttonInteraction.customId.split(":");

        if(action === "cancel") {
            collector.stop('finished');
            return buttonInteraction.editReply(containers.edit(containers.neutral("Your settings have not been updated")));
        }

        if(action === "save") {
            collector.stop('finished');

            await buttonInteraction.editReply(containers.edit(containers.success("Saving settings...")));

            const savedContainer = await saveAsync(interaction, currentSettings, state);
            return buttonInteraction.editReply(containers.edit(savedContainer));
        }

        if(action === "toggle" && key in state) {
            const setting = state[key as SettingKey];
            setting.enabled = !setting.enabled;
        }

        await buttonInteraction.editReply(containers.edit(buildContainer(interaction, state, currentSettings)));
    });

    collector.on('end', async (_, reason) => {
        if(reason === "finished")
            return;

        return interaction.editReply(containers.edit(containers.neutral("The command has expired. Your settings have not been updated")));
    });
}

// the order of the state is the order of the settings in the container
function initState(currentSettings: GuildSettings): SettingsState {
    return {
        alertsPaused: {
            title: "Pause alerts",
            enabledDesc: "Alerts are **paused**, this server does not receive any alerts",
            disabledDesc: "Alerts are sent as usual",
            enabled: currentSettings.alertsPaused
        },
        censorResults: {
            title: "Censor results",
            enabledDesc: "The score of result alerts is **censored**",
            disabledDesc: "Result alerts show the score",
            enabled: currentSettings.censorResults
        },
        roleManagement: {
            title: "Role management",
            enabledDesc: "Greg has an alert role and a role per filter, which he **mentions** in his alerts",
            disabledDesc: "Greg does not create any roles and sends his alerts **without mentions**",
            enabled: currentSettings.roleManagement
        },
        mentionOnDelays: {
            title: "Mention on delays",
            enabledDesc: "Roles are **mentioned** when a match gets delayed",
            disabledDesc: "Match delays are sent without mentions",
            enabled: currentSettings.mentionOnDelays
        },
        mentionOnResults: {
            title: "Mention on results",
            enabledDesc: "Roles are **mentioned** for result alerts",
            disabledDesc: "Result alerts are sent without mentions",
            enabled: currentSettings.mentionOnResults
        }
    };
}

function readState(state: SettingsState): GuildSettings {
    return {
        alertsPaused: state.alertsPaused.enabled,
        censorResults: state.censorResults.enabled,
        roleManagement: state.roleManagement.enabled,
        mentionOnDelays: state.mentionOnDelays.enabled,
        mentionOnResults: state.mentionOnResults.enabled
    };
}

function buildContainer(interaction: ChatInputCommandInteraction, state: SettingsState, currentSettings: GuildSettings) {
    const container = containers.titled(containers.neutralHex, "Settings")
        .addSeparatorComponents(containers.divider(SeparatorSpacingSize.Large));

    // disabling the role management deletes roles, which can not be undone
    const deletesRoles = currentSettings.roleManagement && !state.roleManagement.enabled;
    const createsRoles = !currentSettings.roleManagement && state.roleManagement.enabled;

    (Object.entries(state) as Array<[SettingKey, SettingsStateItem]>).forEach(([key, setting]) => {
        let content = `### ${setting.title}\n${setting.enabled ? setting.enabledDesc : setting.disabledDesc}`;

        if(key === "roleManagement" && createsRoles)
            content += "\n-# Saving creates an alert role and a role for each of your filters";

        if(key === "roleManagement" && deletesRoles)
            content += "\n⚠️ Saving **deletes all roles** Greg created on this server (the alert role and the roles of your filters) and **all role-links**. Members lose these roles";

        if(mentionSettings.includes(key) && !state.roleManagement.enabled)
            content += "\n-# Has no effect without role management";

        container.addSectionComponents(new SectionBuilder()
            .addTextDisplayComponents(containers.text(content))
            .setButtonAccessory(new ButtonBuilder()
                .setCustomId(`${interaction.id}:toggle:${key}`)
                .setLabel(setting.enabled ? "Disable" : "Enable")
                .setStyle(setting.enabled ? ButtonStyle.Secondary : ButtonStyle.Success)
            )
        );

        container.addSeparatorComponents(containers.spacer());
    });

    container.addSeparatorComponents(containers.divider(SeparatorSpacingSize.Large));

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${interaction.id}:cancel`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`${interaction.id}:save`)
            .setLabel(deletesRoles ? 'Save and delete roles' : 'Save Settings')
            .setStyle(deletesRoles ? ButtonStyle.Danger : ButtonStyle.Primary)
    ));

    return container;
}

// saves all settings with one request and returns the container to show afterwards.
// The roles of the role management are created before and deleted after the api is called, as the api never talks to discord
async function saveAsync(interaction: ChatInputCommandInteraction, currentSettings: GuildSettings, state: SettingsState): Promise<ContainerBuilder> {
    const guild = interaction.guild!;
    const newSettings = readState(state);

    const nothingChanged = (Object.keys(newSettings) as SettingKey[]).every(key => newSettings[key] === currentSettings[key]);

    if(nothingChanged)
        return containers.neutral("Nothing was changed. Your settings have not been updated");

    let createdRoles: CreatedRoles | null = null;

    try {
        if(newSettings.roleManagement && !currentSettings.roleManagement) {
            const result = await createRolesAsync(guild);

            if(typeof result === "string")
                return containers.error(result);

            createdRoles = result;
        }

        if(!newSettings.roleManagement && currentSettings.roleManagement) {
            const errorMessage = await checkRoleDeletionAsync(guild);

            if(errorMessage !== null)
                return containers.error(errorMessage);
        }

        const res = await settings.setSettings(guild.id, {
            ...newSettings,
            alertRoleDiscordId: createdRoles?.alertRoleDiscordId,
            filterRoles: createdRoles?.filterRoles
        });

        if(res.status !== 200) {
            // nothing was saved, so the created roles are not needed
            await deleteCreatedRolesAsync(interaction, createdRoles);

            const errorCode = await readErrorCode(res);

            if(errorCode === "roleManagement")
                return containers.error("The role management has been enabled by someone else in the meantime. Your settings have not been updated, please try again");

            if(errorCode === "filterRoles")
                return containers.error("Your filters have been changed while the roles were created. Your settings have not been updated, please try again");

            return containers.error(genericErrorMessage);
        }

        // the api removed the roles and their links, the bot has to delete them in discord
        const { newSettings: savedSettings, roleDiscordIdsToDelete } = await res.json() as GuildSettingsRes;
        await DeleteRoles(guild, roleDiscordIdsToDelete);

        return buildSavedContainer(state, currentSettings, savedSettings, createdRoles, roleDiscordIdsToDelete.length);
    }
    catch (err) {
        // e. g. the api could not be reached
        console.log(`[error] ${err} encountered on ${guild.name} (${guild.id}) while saving the settings`);
        await deleteCreatedRolesAsync(interaction, createdRoles);
        return containers.error(genericErrorMessage);
    }
}

async function deleteCreatedRolesAsync(interaction: ChatInputCommandInteraction, createdRoles: CreatedRoles | null) {
    if(createdRoles !== null)
        await DeleteRoles(interaction.guild, getCreatedRoleIds(createdRoles));
}

function buildSavedContainer(state: SettingsState, oldSettings: GuildSettings, newSettings: GuildSettings, createdRoles: CreatedRoles | null, deletedRolesCount: number) {
    const settingsString = (Object.keys(state) as SettingKey[])
        .map(key => `${state[key].title}: ${buildValueString(oldSettings[key], newSettings[key])}`)
        .join("\n");

    const container = containers.titled(containers.successHex, "Settings saved", settingsString);

    if(createdRoles !== null) {
        const filterRoles = createdRoles.filterRoles;

        container.addSeparatorComponents(containers.divider());
        container.addTextDisplayComponents(containers.text(
            `### Roles\n` +
            `<@&${createdRoles.alertRoleDiscordId}> is mentioned for every alert\n` +
            (filterRoles.length > 0 ? `\nEvery filter got its own role, which is mentioned if the filter matches\n${filterRoles.map(x => `<@&${x.roleDiscordId}>`).join("\n")}\n` : "") +
            `\n*Members can choose their roles with \`/roles\`\nYou can link your own roles to them with \`/role link\`*`
        ));
    }

    if(oldSettings.roleManagement && !newSettings.roleManagement) {
        container.addSeparatorComponents(containers.divider());
        container.addTextDisplayComponents(containers.text(
            `### Roles\n` +
            (deletedRolesCount > 0 ? `Greg deleted his **${deletedRolesCount}** roles and all role-links\n` : "") +
            `Alerts are sent without mentions. Your filters and channels stay untouched`
        ));
    }

    return container;
}

function buildValueString(oldVal: boolean, newVal: boolean) {
    if(oldVal === newVal)
        return newVal ? "on" : "off";

    return newVal ? "**enabled ✨**" : "**disabled 💥**";
}
