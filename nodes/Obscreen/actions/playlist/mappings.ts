import type { ResourceMapperField } from 'n8n-workflow';

export const playlistMappings: Record<string, ResourceMapperField> = {
    NAME: {
        id: 'name',
        displayName: 'Name',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'string',
    },
    LOOP_MODE: {
        id: 'loopMode',
        displayName: 'Loop Mode',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'options',
        options: [
            {
                name: 'Sequential',
                value: 'sequential',
            },
            {
                name: 'Time Sync',
                value: 'timesync',
            },
            {
                name: 'Random',
                value: 'random',
            },
        ],
    },
    ENABLED: {
        id: 'enabled',
        displayName: 'Enabled',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'boolean',
    },
}