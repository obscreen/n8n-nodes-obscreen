import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { executeApiRequest, getResourceId, newResourceLocator } from '../../utils';
export { searchContents, searchContentTypes } from './search';
import FormData from 'form-data';

const BINARY_TYPES = ['picture', 'video', 'html'];
const TEXT_TYPES = ['url', 'youtube', 'html', 'text', 'external_storage', 'playlist_embed'];

export const contentOperations: INodeProperties[] = [
	{
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
				description: 'Create content',
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
				name: 'Get Types',
				value: 'getTypes',
				description: 'Get content types',
				action: 'Get types',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update existing content',
				action: 'Update content',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Folder Destination Mode',
		name: 'folderDestinationMode',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Pick From List',
				value: 'pickFromList',
				description: 'Pick a folder from list',
				action: 'Pick from list',
			},
			{
				name: 'Absolute Path',
				value: 'absolutePath',
				description: 'Absolute path of the folder',
				action: 'Absolute path',
			},
			{
				name: 'Root Folder',
				value: 'rootFolder',
				action: 'Root folder',
			},
		],
		default: 'pickFromList',
	}
];

export const contentParameters: INodeProperties[] = [
	/**
	 * Content Selector
	 */
	newResourceLocator({
		name: 'contentId',
		label: 'content',
		searchListMethod: 'searchContents',
		show: {
			resource: ['contents'],
			operation: ['delete', 'get', 'getLocation', 'update'],
		},
	}),
	/**
	 * Folder ID Selector
	 */
	newResourceLocator({
		name: 'folderId',
		label: 'folder',
		searchListMethod: 'searchFolders',
		show: {
			resource: ['contents'],
			operation: ['create', 'getAll', 'update'],
			folderDestinationMode: ['pickFromList'],
		},
	}),
	/**
	 * Folder Path
	 */
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
				operation: ['create', 'getAll', 'update'],
				folderDestinationMode: ['absolutePath'],
			},
		},
	},
	/**
	 * Content Type Selector
	 */
	newResourceLocator({
		name: 'contentType',
		label: 'content type',
		searchListMethod: 'searchContentTypes',
		show: {
			resource: ['contents'],
			operation: ['create'],
		},
	}),
	/**
	 * Content Location
	 */
	{
		displayName: 'Content Text Payload',
		name: 'location',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create'],
			},
			hide: {
				contentType: [...BINARY_TYPES, ''],
			},
		},
	},
	/**
	 * Content File
	 */
	{
		displayName: 'Content Binary Input',
		name: 'object',
		type: 'string',
		default: 'data',
		description: 'File to upload as binary content',
		hint: 'You must use binary input name (e.g. "data")',
		placeholder: 'data',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['create'],
			},
			hide: {
				contentType: [...TEXT_TYPES, ''],
			},
		},
	},
	/**
	 * Content Name
	 */
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
				operation: ['create', 'update'],
			},
		},
	},
];

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
			getTypes: getContentTypes.bind(this),
			update: updateContent.bind(this),
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
	const folderDestinationMode = this.getNodeParameter('folderDestinationMode', itemIndex, '') as string;
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as string;
	const path = this.getNodeParameter('path', itemIndex, '') as string;
	const type = getResourceId(this.getNodeParameter('contentType', itemIndex, 'url') as string);
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const location = this.getNodeParameter('location', itemIndex, '') as string;
	const object = this.getNodeParameter('object', itemIndex, '') as string;

	const endpoint = '/api/contents/';

	const body = new FormData();
	body.append('name', name);
	body.append('type', type);

	switch (folderDestinationMode) {
		case 'pickFromList':
			body.append('parent_folder_id', getResourceId(folderId));
			break;
		case 'absolutePath':
			body.append('parent_folder_path', path);
			break;
	}

	if (location) {
		body.append('location', location);
	}

	if (BINARY_TYPES.includes(type)) {
		const binaryData = this.getInputData()[itemIndex].binary?.[object];
		if (!binaryData) {
			throw new Error(`No binary data found in "${object}" at item ${itemIndex}.`);
		}
		const fileBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, object);
		body.append('object', fileBuffer, {
			filename: binaryData.fileName || 'file',
			contentType: binaryData.mimeType || 'application/octet-stream',
			knownLength: binaryData.data.length,
		});
	}

	const response = await executeApiRequest.call(this, 'POST', endpoint, body);
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

	const body: Record<string, any> = {
		path,
		folder_id: getResourceId(folderId),
	};

	const endpoint = '/api/contents/';
	const response = await executeApiRequest.call(this, 'GET', endpoint, body);
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

async function getContentTypes(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const endpoint = '/api/contents/types';
	const response = await executeApiRequest.call(this, 'GET', endpoint);
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

	const body: Record<string, string> = {};
	
	// Map the fields from Resource Mapper to API parameters
	if (fields.name !== undefined && fields.name !== '') {
		body.name = fields.name;
	}

	const endpoint = `/api/contents/${contentId}`;

	const response = await executeApiRequest.call(this, 'PUT', endpoint, body);
	return response;
}
