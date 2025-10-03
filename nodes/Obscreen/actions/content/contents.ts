import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeProperties, ResourceMapperFields } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildApiUrl, executeApiRequest, getResourceId } from '../../utils';
import type { BulkUploadResult } from '../../types';
import { searchContents } from './search';

export const searchContentsMethod = searchContents;

export const contentOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['contents'],
		},
	},
	options: [
		{
			name: 'Create',
			value: 'create',
			description: 'Upload new content to Obscreen',
			action: 'Create content',
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete content permanently',
			action: 'Delete content',
		},
		{
			name: 'Get',
			value: 'get',
			description: 'Get content information by ID',
			action: 'Get content',
		},
		{
			name: 'Get Location',
			value: 'getLocation',
			description: 'Get content location by ID',
			action: 'Get content location',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'Retrieve a list of contents',
			action: 'Get many contents',
		},
		{
			name: 'Move to Folder',
			value: 'moveToFolder',
			description: 'Move multiple content items to another folder',
			action: 'Move content to folder',
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update existing content',
			action: 'Update content',
		},
		{
			name: 'Upload Multiple Files',
			value: 'uploadBulk',
			description: 'Upload multiple content files at once',
			action: 'Upload multiple files',
		},
	],
	default: 'get',
};

export const contentParameters: INodeProperties[] = [
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
				placeholder: 'e.g. 123',
			},
		],
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['delete', 'get', 'getLocation', 'update'],
			},
		},
	},
	{
		displayName: 'Folder Path',
		name: 'path',
		type: 'string',
		default: '',
		placeholder: 'e.g. /my-content',
		description: 'Path context (with path starting with /)',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create', 'createFolder', 'deleteFolder', 'getAll', 'moveToFolder', 'update'],
			},
		},
	},
	{
		displayName: 'Folder',
		name: 'folderId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
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
				resource: ['contents'],
				operation: ['create', 'createFolder', 'deleteFolder', 'moveToFolder', 'uploadBulk'],
			},
		},
	},
	{
		displayName: 'Content Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My Content',
		description: 'Name of the content',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create', 'createFolder', 'update'],
			},
			hide: {
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Content Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'Picture',
				value: 'picture',
			},
			{
				name: 'Video',
				value: 'video',
			},
		],
		default: 'picture',
		description: 'Type of the content',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Content Location',
		name: 'location',
		type: 'options',
		options: [
			{
				name: 'URL',
				value: 'url',
			},
			{
				name: 'YouTube',
				value: 'youtube',
			},
			{
				name: 'External Storage',
				value: 'external_storage',
			},
		],
		default: 'url',
		description: 'Content location type',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create'],
			},
			hide: {
				type: ['picture', 'video'],
			},
		},
	},
	{
		displayName: 'Content File',
		name: 'object',
		type: 'string',
		default: 'dataBinary',
		description: 'Content file to upload',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create'],
			},
			hide: {
				location: ['url', 'youtube', 'external_storage'],
			},
		},
	},
	{
		displayName: 'Content URLs',
		name: 'object',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add URL',
		default: {},
		options: [
			{
				displayName: 'Content URL',
				name: 'urls',
				values: [
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://example.com/image.jpg',
					},
				],
			},
		],
		description: 'Content files to upload',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['uploadBulk'],
			},
		},
	},
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
				resource: ['contents'],
				operation: ['moveToFolder'],
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'contentMappingColumns',
				mode: 'add',
				fieldWords: {
					singular: 'field',
					plural: 'fields',
				},
				addAllFields: true,
				multiKeyMatch: false,
				supportAutoMap: true,
			},
		},
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['update'],
			},
		},
	},
];

export async function contentMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	return {
		fields: [
			{
				id: 'name',
				displayName: 'Name',
				defaultMatch: false,
				canBeUsedToMatch: false,
				required: false,
				display: true,
				type: 'string',
			},
		],
	};
}

export async function executeContentOperation(
	this: IExecuteFunctions,
	item: INodeExecutionData,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<INodeExecutionData[]> {
	try {
		const returnData = [];

		for (let i = 0; i < this.getInputData().length; i++) {
		const resourceOperations: Record<string, Function> = {
			create: createContent.bind(this),
			delete: deleteContent.bind(this),
			get: getContent.bind(this),
			getAll: getAllContents.bind(this),
			getLocation: getContentLocation.bind(this),
			moveToFolder: moveContentToFolder.bind(this),
			update: updateContent.bind(this),
			uploadBulk: uploadBulkContent.bind(this),
		};

			const operationFunction = resourceOperations[operation];
			if (!operationFunction) {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported`);
			}

			const operationData = await operationFunction.call(this, i, resource, operation);
			
			if (Array.isArray(operationData)) {
				returnData.push(...operationData);
			} else {
				returnData.push(operationData);
			}
		}

		return returnData.map(data => ({ json: data }));
	} catch (error) {
		if (this.continueOnFail()) {
			return [{ json: { error: error.message }, pairedItem: itemIndex }];
		} else {
			throw error;
		}
	}
}

async function createContent(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const type = this.getNodeParameter('type', itemIndex, 'picture') as string;
	const path = this.getNodeParameter('path', itemIndex, '') as string;
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as string;
	const location = this.getNodeParameter('location', itemIndex, 'url') as string;

	const endpoint = '/api/contents/';
	const url = buildApiUrl(endpoint, { name, type, path, folder_id: getResourceId(folderId), location });

	let body: any = {};
	
	if (location === 'url' || location === 'youtube' || location === 'external_storage') {
		// For URL-based content, no file upload
	} else {
		// For file upload content
		// For file upload content, we'll send as multipart form data
		body = {
			multipart: {
				object: '=dataBinary',
			},
		};
	}

	const response = await executeApiRequest.call(this, 'POST', url, body);
	return response;
}


async function deleteContent(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentIdValue = this.getNodeParameter('contentId', itemIndex, '') as any;
	const contentId = getResourceId(contentIdValue);

	const endpoint = `/api/contents/${contentId}`;
	await executeApiRequest.call(this, 'DELETE', endpoint);
	return { deleted: true };
}


async function getContent(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentIdValue = this.getNodeParameter('contentId', itemIndex, '') as any;
	const contentId = getResourceId(contentIdValue);

	const endpoint = `/api/contents/${contentId}`;
	const response = await executeApiRequest.call(this, 'GET', endpoint);
	return response;
}

async function getAllContents(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const path = this.getNodeParameter('path', itemIndex, '') as string;
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as string;

	const endpoint = '/api/contents/';
	const url = buildApiUrl(endpoint, { path, folder_id: getResourceId(folderId) });

	const response = await executeApiRequest.call(this, 'GET', url);
	return response;
}

async function getContentLocation(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentIdValue = this.getNodeParameter('contentId', itemIndex, '') as any;
	const contentId = getResourceId(contentIdValue);

	const endpoint = `/api/contents/location/${contentId}`;
	const response = await executeApiRequest.call(this, 'GET', endpoint);
	return response;
}

async function moveContentToFolder(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentCollection = this.getNodeParameter('contentCollection', itemIndex, []) as any;
	const contentIds = contentCollection['contentIds'].map((item: any) => {
		return parseInt(getResourceId(item['contentId']));
	});

	const path = this.getNodeParameter('path', itemIndex, '') as string;
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as number;

	const endpoint = '/api/contents/folder/move-bulk';
	const url = buildApiUrl(endpoint, { path });

	const body = {
		entity_ids: contentIds,
		folder_id: getResourceId(folderId),
		path: path,
	};

	const response = await executeApiRequest.call(this, 'POST', url, body);
	return response;
}

async function updateContent(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentIdValue = this.getNodeParameter('contentId', itemIndex, '') as any;
	const contentId = getResourceId(contentIdValue);
	const fields = (this.getNodeParameter('fields', itemIndex, {}) as any).value;

	const params: Record<string, string> = {};
	
	// Map the fields from Resource Mapper to API parameters
	if (fields.name !== undefined && fields.name !== '') {
		params.name = fields.name;
	}

	const endpoint = `/api/contents/${contentId}`;
	const url = buildApiUrl(endpoint, params);

	const response = await executeApiRequest.call(this, 'PUT', url);
	return response;
}

async function uploadBulkContent(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<BulkUploadResult> {
	const path = this.getNodeParameter('path', itemIndex, '') as string;
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as string;
	const urlsData = this.getNodeParameter('object.urls', itemIndex, []) as Array<{ url: string }>;

	const endpoint = '/api/contents/upload-bulk';
	const url = buildApiUrl(endpoint, { path, folder_id: folderId });

	const result: BulkUploadResult = {
		successful: 0,
		failed: 0,
		results: [],
	};

	for (const urlData of urlsData) {
		try {
			const body = {
				multipart: {
					object: urlData.url,
				},
			};

			await executeApiRequest.call(this, 'POST', url, body);
			result.successful++;
			result.results.push({ filename: urlData.url, success: true });
		} catch (error) {
			result.failed++;
			result.results.push({
				filename: urlData.url,
				success: false,
				error: error.message,
			});
		}
	}

	return result;
}
