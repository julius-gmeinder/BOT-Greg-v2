import * as alerts from "./alerts";
import * as filters from "./filters"
import * as roles from "./misc/roles";
import * as commandsCommand from "./misc/commands";
import * as settings from "./settings";
import * as role from "./role";
import * as reset from "./misc/reset";

export const commands = {
    //admin
    alerts,
    filters,
    settings,
    role,
    reset,

    //user
    commands: commandsCommand,
    roles,
};