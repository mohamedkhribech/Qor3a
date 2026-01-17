import type { SeedInputs } from '../shared/seed';

export interface Member {
    id: string; // UUID
    name: string;
    avatar?: string;
    jam3iyaId?: string;
}

export interface Jamiya {
    id: string; // UUID
    name: string;
    amount: number;
    startDate: string; // ISO Date
    members: Member[];
    isLocked: boolean;
}

export interface DrawResult {
    month: number;
    memberId: string;
    memberName: string;
    score: string;
}

export interface Draw {
    id: string;
    jamiyaId: string;
    seed: string;
    inputs: SeedInputs;
    results: DrawResult[];
    createdAt: string;
    isLocked: boolean;
}
