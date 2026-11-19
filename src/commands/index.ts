import * as alerts from "./alerts";
import * as filters from "./filters"
import * as roles from "./misc/roles";
import * as commandsCommand from "./misc/commands";
import * as settings from "./settings";
import * as role from "./role";
import * as reset from "./misc/reset";
import * as matches from "./schedule/matches";
import * as results from "./schedule/results";
import * as events from "./schedule/events";

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
    matches,
    results,
    events,
};