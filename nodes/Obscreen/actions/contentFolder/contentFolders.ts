import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { executeApiRequest, getResourceId } from '../../utils';

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
        {
            name: 'Update Folder',
            value: 'updateFolder',
            description: 'Update a content folder',
            action: 'Update content folder',
        },
    ],
    default: 'getAllFolders',
};

export const contentFolderParameters: INodeProperties[] = [
	/** Folder Name */
	{
		displayName: 'Folder Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My Folder',
		description: 'Name of the folder',
		displayOptions: {
			show: {
				resource: ['contentFolders'],
				operation: ['createFolder', 'updateFolder'],
			},
		},
	},
	/**
	 * Folder Selector
	 */
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
				operation: [ 'deleteFolder', 'updateFolder'],
			},
		},
	},
	/**
	 * Parent Folder Selector
	 */
	{
		displayName: 'Parent Folder',
		name: 'parentFolderId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a parent folder...',
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
				operation: ['createFolder'],
			},
		},
	},
];

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
				updateFolder: updateContentFolder.bind(this),
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

async function createContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const parentFolderId = this.getNodeParameter('parentFolderId', itemIndex, '') as any;
	
	const endpoint = '/api/contents/folders';
	const body = {
		name,
		folder_id: getResourceId(parentFolderId),
	};
	
	return await executeApiRequest.call(this, 'POST', endpoint, body);
}

async function deleteContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as any;
	
	const endpoint = `/api/contents/folders/${folderId}`;
	await executeApiRequest.call(this, 'DELETE', endpoint);
	return { deleted: true };
}

async function getAllContentFolders(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const endpoint = '/api/contents/folders';
	return await executeApiRequest.call(this, 'GET', endpoint);
}

async function updateContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as any;
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	
	const endpoint = `/api/contents/folders/${folderId}`;
	const body = {
		name,
		folder_id: getResourceId(folderId),
	};
	return await executeApiRequest.call(this, 'PUT', endpoint, body);
}
