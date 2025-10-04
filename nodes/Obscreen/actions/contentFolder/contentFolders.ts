import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { executeApiRequest, getResourceId } from '../../utils';
export { searchFolders } from './search';

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
            name: 'Create',
            value: 'create',
            description: 'Create a new content folder',
            action: 'Create content folder',
        },
        {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a content folder',
            action: 'Delete content folder',
        },
        {
            name: 'Get',
            value: 'get',
            description: 'Retrieve content folder',
            action: 'Get content folder',
        },
        {
            name: 'Get Many',
            value: 'getAll',
            description: 'Retrieve a list of content folders',
            action: 'Get many content folders',
        },
		{
			name: 'Move Folder',
			value: 'moveFolderToFolder',
			description: 'Move folder to another folder',
			action: 'Move folder to another folder',
		},
		{
			name: 'Move Many Content Folder',
			value: 'moveContentsToFolder',
			description: 'Move multiple content items to another folder',
			action: 'Move many content to folder',
		},
        {
            name: 'Update',
            value: 'update',
            description: 'Update a content folder',
            action: 'Update content folder',
        },
    ],
    default: 'getAll',
};

export const contentFolderParameters: INodeProperties[] = [
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
				operation: [ 'delete', 'update', 'moveFolderToFolder', 'get'],
			},
		},
	},
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
				operation: ['create', 'update'],
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
				operation: ['create', 'update', 'moveContentsToFolder', 'moveFolderToFolder'],
			},
		},
	},
	/**
	 * Contents Collection
	 */
	{
		displayName: 'Contents',
		name: 'contentCollection',
		placeholder: 'Add Content',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'contentIds',
				displayName: 'Contents',
				values: [
					{
						displayName: 'Content',
						name: 'contentId',
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						required: true,
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select a content...',
								typeOptions: {
									searchListMethod: 'searchContents',
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
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['contentFolders'],
				operation: ['moveContentsToFolder'],
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
				create: createContentFolder.bind(this),
				delete: deleteContentFolder.bind(this),
				get: getContentFolder.bind(this),
				getAll: getAllContentFolders.bind(this),
				moveFolderToFolder: moveFolderToFolder.bind(this),
				moveContentsToFolder: moveContentsToFolder.bind(this),
				update: updateContentFolder.bind(this),
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
	const endpoint = '/api/contents-folders/';
	const body: Record<string, any> = {
		name,
	};

	try {
		body['parent_folder_id'] = String(getResourceId(parentFolderId));
	} catch (error) {}

	return await executeApiRequest.call(this, 'POST', endpoint, body);
}

async function deleteContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as any;
	const endpoint = `/api/contents-folders/${getResourceId(folderId)}`;
	await executeApiRequest.call(this, 'DELETE', endpoint);
	return { deleted: true };
}

async function getAllContentFolders(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const endpoint = '/api/contents-folders/';
	return await executeApiRequest.call(this, 'GET', endpoint);
}

async function moveFolderToFolder(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as number;
	const parentFolderId = this.getNodeParameter('parentFolderId', itemIndex, '') as number;
	const endpoint = `/api/contents-folders/${getResourceId(folderId)}`;

	const body = {
		parent_folder_id: getResourceId(parentFolderId),
	};

	const response = await executeApiRequest.call(this, 'PUT', endpoint, body);
	return response;
}

async function moveContentsToFolder(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentCollection = this.getNodeParameter('contentCollection', itemIndex, []) as any;
	const contentIds = contentCollection['contentIds'].map((item: any) => {
		return parseInt(getResourceId(item['contentId']));
	});

	const parentFolderId = this.getNodeParameter('parentFolderId', itemIndex, '') as number;
	const endpoint = '/api/contents-folders/move-bulk';

	const body = {
		entity_ids: contentIds,
		parent_folder_id: getResourceId(parentFolderId),
	};

	const response = await executeApiRequest.call(this, 'POST', endpoint, body);
	return response;
}

async function getContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as number;
	const endpoint = `/api/contents-folders/${getResourceId(folderId)}`;
	return await executeApiRequest.call(this, 'GET', endpoint);
}

async function updateContentFolder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as any;
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const parentFolderId = this.getNodeParameter('parentFolderId', itemIndex, '') as any;
	
	const endpoint = `/api/contents-folders/${getResourceId(folderId)}`;
	const body: Record<string, any> = {
		name,
	};

	try {
		body['parent_folder_id'] = String(getResourceId(parentFolderId));
	} catch (error) {}

	return await executeApiRequest.call(this, 'PUT', endpoint, body);
}
