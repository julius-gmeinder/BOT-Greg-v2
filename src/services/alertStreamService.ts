import fetch from 'node-fetch-cjs';
import { config } from "../config";
import logger from "../utils/logger";

type StreamHandler = (data: any) => Promise<void> | void;

export const reconnectDelays = [0, 1000, 5000, 5000, 5000, 10000, 10000, 10000, 10000, 30000, 60000];

// the api sends a heartbeat every 30 seconds, without any event for this long the connection is considered dead
const heartbeatTimeout = 75_000;

// connects to the server-sent-events stream of the api (replaces the signalr hub) and keeps the connection alive.
// handlers: one function per event name ("matchAlerts", "matchDelays", "resultAlerts"), it receives the parsed data of the event.
// There is no replay, alerts that are sent while the bot is not connected are lost
export default function ConnectAlertStream(handlers: Record<string, StreamHandler>): void {
    run(handlers).catch((err) => logger.error("stream", "the alert stream stopped unexpectedly", err));
}

async function run(handlers: Record<string, StreamHandler>): Promise<never> {
    const url = config.API_BASE + "api/Alerts/stream";
    let attempt = 0;

    for (;;) {
        const controller = new AbortController();
        let watchdog: NodeJS.Timeout | undefined;

        const resetWatchdog = () => {
            clearTimeout(watchdog);
            watchdog = setTimeout(() => controller.abort(), heartbeatTimeout);
        };

        try {
            resetWatchdog();

            const res = await fetch(url, {
                headers: { 'Accept': 'text/event-stream' },
                signal: controller.signal
            });

            if (!res.ok || !res.body)
                throw new Error(`unexpected response (status ${res.status})`);

            logger.info("stream", `connection to ${config.API_BASE} established`);

            const decoder = new TextDecoder();
            const parser = createParser((eventName, data) => {
                // the connection only counts as stable once an event arrived, otherwise the delays keep growing
                attempt = 0;
                dispatch(handlers, eventName, data);
            });

            for await (const chunk of res.body) {
                resetWatchdog();
                parser(decoder.decode(chunk as Buffer, { stream: true }));
            }

            logger.warn("stream", "the connection was closed by the api, trying to reconnect");
        }
        catch (err) {
            if (controller.signal.aborted)
                logger.warn("stream", `no heartbeat for ${heartbeatTimeout / 1000} seconds, trying to reconnect`);
            else
                logger.warn("stream", `an error occured and the connection was disrupted, trying to reconnect. ${err}`);
        }
        finally {
            clearTimeout(watchdog);
        }

        const delay = reconnectDelays[Math.min(attempt, reconnectDelays.length - 1)];
        attempt++;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

function dispatch(handlers: Record<string, StreamHandler>, eventName: string, data: string) {
    const handler = handlers[eventName];

    // e. g. the heartbeat, it only resets the watchdog
    if (!handler)
        return;

    // a failing handler must not end the stream
    Promise.resolve()
        .then(() => handler(JSON.parse(data)))
        .catch((err) => logger.error("stream", `an error was encountered while handling "${eventName}"`, err));
}

// minimal server-sent-events parser: collects the "event" and "data" fields, an empty line ends the event
function createParser(onEvent: (eventName: string, data: string) => void) {
    let buffer = "";
    let eventName = "";
    let dataLines: string[] = [];

    return (text: string) => {
        buffer += text;

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            if (line === "") {
                if (dataLines.length > 0)
                    onEvent(eventName || "message", dataLines.join("\n"));

                eventName = "";
                dataLines = [];
                continue;
            }

            // comment
            if (line.startsWith(":"))
                continue;

            const separatorIndex = line.indexOf(":");
            const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
            let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);

            if (value.startsWith(" "))
                value = value.slice(1);

            if (field === "event")
                eventName = value;

            if (field === "data")
                dataLines.push(value);
        }
    };
}
