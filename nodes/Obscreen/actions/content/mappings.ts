import type { ResourceMapperField } from 'n8n-workflow';

export const contentMappings: Record<string, ResourceMapperField> = {
    NAME: {
        id: 'name',
        displayName: 'Name',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'string',
    },
    TYPE: {
        id: 'type',
        displayName: 'Type',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: true,
        display: true,
        type: 'options',
        options: [
            {
                name: 'Picture',
                value: 'picture',
            },
            {
                name: 'URL',
                value: 'url',
            },
            {
                name: 'Video',
                value: 'video',
            },
        ],
    },
    LOCATION: {
        id: 'location',
        displayName: 'Location',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'options',
    },
    OBJECT: {
        id: 'object',
        displayName: 'Object',
        defaultMatch: false,
        canBeUsedToMatch: false,
        required: false,
        display: true,
        type: 'object',
    },
}