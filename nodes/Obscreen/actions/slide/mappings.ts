import type { ResourceMapperField } from 'n8n-workflow';

export const slideMappings: Record<string, ResourceMapperField> = {
    ENABLED: {
        id: 'enabled',
        displayName: 'Enabled',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'boolean',
    },
    DURATION: {
        id: 'duration',
        displayName: 'Duration',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'number',
    },
    DELEGATE_DURATION: {
        id: 'delegateDuration',
        displayName: 'Use video\'s length (if applicable)',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'boolean',
    },
    POSITION: {
        id: 'position',
        displayName: 'Position',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'number',
    },
}