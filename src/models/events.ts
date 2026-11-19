export type Event = {
    eventId: number,
    eventName: string,
    eventRelUrl: string,
    eventUrl: string,
    // utc, serialized without offset. Null if liquipedia does not know the date yet
    startDate: string | null,
    endDate: string | null,
    environment: string,
    tier: number | null,
    tierString: string | null,
    lpTier: string,
    valveTier: string,
    prizePool: number | null,
    teamsAttending: number | null,
    region: string | null,
    country: string | null,
    city: string | null,
    locationString: string | null,
    isOngoing: boolean
}
