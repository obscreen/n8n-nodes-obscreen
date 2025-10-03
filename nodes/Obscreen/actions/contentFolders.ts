import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { executeApiRequest } from '../utils';

export const contentFolderOperations: INodeProperties = {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
        show: {
            resource: ['contentFolders'],
        },
    },
    options: [
        {
            name: 'Create Folder',
            value: 'createFolder',
            description: 'Create a new content folder',
            action: 'Create content folder',
        },
        {
            name: 'Delete Folder',
            value: 'deleteFolder',
            description: 'Delete a content folder',
            action: 'Delete content folder',
        },
        {
            name: 'Get Many',
            value: 'getAllFolders',
            description: 'Retrieve a list of content folders',
            action: 'Get many content folders',
        },
    ],
    default: 'getAllFolders',
};

export const contentFolderParameters: INodeProperties[] = [
	{
		displayName: 'Folder Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My Folder',
		description: 'Name of the folder to create',
		displayOptions: {
			show: {
				resource: ['contentFolders'],
				operation: ['createFolder'],
			},
		},
		required: true,
	},
	{
		displayName: 'Folder Path',
		name: 'path',
		type: 'string',
		default: '',
		placeholder: 'e.g. /drive/MyFolder',
		description: 'Path where the folder should be created',
		displayOptions: {
			show: {
				resource: ['contentFolders'],
				operation: ['createFolder'],
			},
		},
	},
	{
		displayName: 'Folder',
		name: 'folderId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a folder...',
				typeOptions: {
					searchListMethod: 'searchFolders',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 456',
			},
		],
		displayOptions: {
			show: {
				resource: ['contentFolders'],
				operation: ['deleteFolder'],
			},
		},
	},
];

async function createContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const path = this.getNodeParameter('path', itemIndex, '') as string;
	
	const endpoint = '/api/contents/folders';
	const body = {
		name,
		path,
	};
	
	return await executeApiRequest.call(this, 'POST', endpoint, body);
}

async function deleteContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const folderIdValue = this.getNodeParameter('folderId', itemIndex, '') as any;
	const folderId = folderIdValue.mode === 'list' ? folderIdValue.value : folderIdValue.value;
	
	const endpoint = `/api/contents/folders/${folderId}`;
	await executeApiRequest.call(this, 'DELETE', endpoint);
	return { deleted: true };
}

async function getAllContentFolders(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const endpoint = '/api/contents/folders';
	return await executeApiRequest.call(this, 'GET', endpoint);
}

export async function executeContentFolderOperation(
	this: IExecuteFunctions,
	item: any,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any[]> {
	try {
		const returnData = [];

		for (let i = 0; i < this.getInputData().length; i++) {
			const resourceOperations: Record<string, Function> = {
				createFolder: createContentFolder.bind(this),
				deleteFolder: deleteContentFolder.bind(this),
				getAllFolders: getAllContentFolders.bind(this),
			};

			const operationFunction = resourceOperations[operation];
			if (!operationFunction) {
				throw new Error(`The operation "${operation}" is not supported`);
			}

			const result = await operationFunction(i);
			returnData.push({
				json: result,
				pairedItem: i,
			});
		}

		return returnData;
	} catch (error) {
		throw error;
	}
}
