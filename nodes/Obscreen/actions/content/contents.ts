import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildApiUrl, executeApiRequest, getResourceId, newResourceLocator, nonEmptyString } from '../../utils';
export { searchContents, searchContentTypes } from './search';

const BINARY_TYPES = ['picture', 'video'];
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
				description: 'Create a content',
				action: 'Create content',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a content',
				action: 'Delete content',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a content',
				action: 'Get content',
			},
			{
				name: 'Get Location',
				value: 'getLocation',
				description: 'Get content location',
				action: 'Get content location',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many contents',
				action: 'Get many contents',
			},
			{
				name: 'Get Types',
				value: 'getTypes',
				description: 'Get available content types',
				action: 'Get types',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a content',
				action: 'Update content',
			},
		],
		default: 'get',
	},
	/**
	 * Folder Attach Mode
	 */
	{
		displayName: 'Folder Attach Mode',
		name: 'folderAttachMode',
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
	},
	/**
	 * Folder Inspect Mode
	 */
	{
		displayName: 'Folder Inspect Mode',
		name: 'folderInspectMode',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'All Folders',
				value: 'allFolders',
				action: 'All folders',
			},
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
		],
		default: 'allFolders',
	}
];

export const contentParameters: INodeProperties[] = [
	/**
	 * Content Selector
	 */
	newResourceLocator({
		displayName: 'Content',
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
		displayName: 'Folder',
		name: 'folderId',
		label: 'folder',
		searchListMethod: 'searchFolders',
		show: {
			resource: ['contents'],
			operation: ['create', 'update'],
			folderAttachMode: ['pickFromList'],
		},
	}),
	newResourceLocator({
		displayName: 'Folder',
		name: 'folderId',
		label: 'folder',
		searchListMethod: 'searchFolders',
		show: {
			resource: ['contents'],
			operation: ['getAll'],
			folderInspectMode: ['pickFromList'],
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
				operation: ['create', 'update'],
				folderAttachMode: ['absolutePath'],
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
				operation: ['getAll'],
				folderInspectMode: ['absolutePath'],
			},
		},
	},
	/**
	 * Content Type Selector
	 */
	newResourceLocator({
		displayName: 'Content Type',
		name: 'contentType',
		label: 'content type',
		searchListMethod: 'searchContentTypes',
		show: {
			resource: ['contents'],
			operation: ['create', 'getAll'],
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
	{
		displayName: 'Content Name Query Search',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My Content',
		description: 'Partial name of the content',
		displayOptions: {
			show: {
				resource: ['contents'],
				operation: ['getAll'],
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

const getFormDataClass = () => { try { return eval('require')('form-data'); } catch { try { return eval('require')('form-data'); } catch { return null; } } };
async function createContent(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const folderAttachMode = this.getNodeParameter('folderAttachMode', itemIndex, '') as string;
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as string;
	const path = this.getNodeParameter('path', itemIndex, '') as string;
	const type = getResourceId(this.getNodeParameter('contentType', itemIndex, 'url') as string);
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const location = this.getNodeParameter('location', itemIndex, '') as string;
	const object = this.getNodeParameter('object', itemIndex, '') as string;

	const endpoint = '/api/contents/';

	// Utiliser FormData de manière cachée
	const FormDataClass = getFormDataClass();
	if (!FormDataClass) {
		throw new NodeOperationError(this.getNode(), 'FormData not available');
	}
	
	const body = new FormDataClass();
	body.append('name', name);
	body.append('type', type);

	switch (folderAttachMode) {
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
		const binaryData = this.helpers.assertBinaryData(itemIndex, object);
		if (!binaryData) {
			throw new NodeOperationError(this.getNode(), 'Binary data is required');
		}
		const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, object);
		body.append('object', binaryDataBuffer, {
			filename: binaryData.fileName || 'file',
			contentType: binaryData.mimeType || 'application/octet-stream',
			knownLength: binaryDataBuffer.length,
		});
	}

	const response = await executeApiRequest.call(this, 'POST', endpoint, body, true);
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
	const folderInspectMode = this.getNodeParameter('folderInspectMode', itemIndex, '') as string;
	const folderId = this.getNodeParameter('folderId', itemIndex, '') as string;
	const path = this.getNodeParameter('path', itemIndex, '') as string;
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const contentType = getResourceId(this.getNodeParameter('contentType', itemIndex, '') as string);

	const params: Record<string, any> = {
		name,
	};

	if (nonEmptyString(contentType)) {
		params.type = contentType;
	}

	switch (folderInspectMode) {
		case 'absolutePath':
			params.folder_path = getResourceId(path);
			break;
		case 'pickFromList':
			params.folder_id = getResourceId(folderId);
			break;
	}

	const endpoint = '/api/contents/';
	const url = buildApiUrl(endpoint, params);
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
	const name = this.getNodeParameter('name', itemIndex, '') as string;

	const body: Record<string, string> = {};
	
	if (nonEmptyString(name)) {
		body.name = name;
	}

	const endpoint = `/api/contents/${contentId}`;

	const response = await executeApiRequest.call(this, 'PUT', endpoint, body);
	return response;
}
