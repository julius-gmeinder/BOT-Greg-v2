export type MatchPlayer = {
    name: string,
    country: string
}

export type MatchTeam = {
    name: string,
    nameShort: string,
    players: Array<MatchPlayer>
}

// platform: 0 Twitch, 1 Youtube, 2 Kick
export type MatchStream = {
    platform: number,
    channel: string,
    url: string | null
}

export type MatchBase = {
    matchId: string,
    eventId: number,
    eventName: string,
    eventRelUrl: string,
    eventUrl: string,
    // utc, serialized without offset
    dateTime: string,
    bestOf: number,
    environment: string,
    stage: string | null,
    lpTier: string,
    valveTier: string,
    tier: number | null,
    tierString: string | null,
    hltvUrl: string | null,
    faceitUrl: string | null,
    isHltvCovered: boolean,
    // only null for matches with unknown teams (TBD), those are never alerted
    teamX: MatchTeam | null,
    teamY: MatchTeam | null
}

export type Match = MatchBase & {
    streams: Array<MatchStream>
}

export type ResultMap = {
    name: string,
    teamXScore: number | null,
    teamYScore: number | null,
    mapPlayed: boolean
}

export type Result = MatchBase & {
    teamXMapScore: number,
    teamYMapScore: number,
    isForfeit: boolean,
    maps: Array<ResultMap>
}
