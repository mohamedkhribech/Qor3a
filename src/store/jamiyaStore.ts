import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Jamiya, Member, Draw } from '../types';

interface JamiyaState {
    currentJamiya: Jamiya | null;
    currentDraw: Draw | null;

    // Actions
    setJamiya: (jamiya: Jamiya) => void;
    updateJamiyaParts: (parts: Partial<Jamiya>) => void;
    addMember: (name: string) => void;
    removeMember: (id: string) => void;
    setMembers: (members: Member[]) => void;
    setDraw: (draw: Draw) => void;
    reset: () => void;
}

// Mock initial ID generator until backend is hooked up
const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

export const useJamiyaStore = create<JamiyaState>()(
    persist(
        (set) => ({
            currentJamiya: null,
            currentDraw: null,

            setJamiya: (jamiya) => set({ currentJamiya: jamiya }),

            updateJamiyaParts: (parts) => set((state) => ({
                currentJamiya: state.currentJamiya
                    ? { ...state.currentJamiya, ...parts }
                    : {
                        id: generateId(),
                        name: '',
                        amount: 0,
                        startDate: new Date().toISOString(),
                        members: [],
                        isLocked: false,
                        ...parts
                    }
            })),

            addMember: (name) => set((state) => {
                const newMember: Member = { id: generateId(), name };
                const current = state.currentJamiya;
                if (!current) return state; // Should initialize first
                return {
                    currentJamiya: {
                        ...current,
                        members: [...current.members, newMember]
                    }
                };
            }),

            removeMember: (id) => set((state) => {
                if (!state.currentJamiya) return state;
                return {
                    currentJamiya: {
                        ...state.currentJamiya,
                        members: state.currentJamiya.members.filter(m => m.id !== id)
                    }
                };
            }),

            setMembers: (members) => set((state) => {
                if (!state.currentJamiya) return state;
                return { currentJamiya: { ...state.currentJamiya, members } };
            }),

            setDraw: (draw) => set({ currentDraw: draw }),

            reset: () => set({ currentJamiya: null, currentDraw: null })
        }),
        {
            name: 'qor3a-storage',
        }
    )
);
