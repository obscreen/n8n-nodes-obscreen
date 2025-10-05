import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeProperties, ResourceMapperFields } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { playlistMappings } from './mappings';
import { executeApiRequest, getResourceId, newResourceMapper, newResourceLocator, nonEmptyString } from '../../utils';
export { searchPlaylists } from './search';

export const playlistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['playlists'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create new playlist',
				action: 'Create playlist',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete playlist permanently',
				action: 'Delete playlist',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get playlist information by ID',
				action: 'Get playlist',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve list of playlists',
				action: 'Get many playlists',
			},
			{
				name: 'Get Notifications',
				value: 'getNotifications',
				description: 'Get notifications associated with playlist',
				action: 'Get playlist notifications',
			},
			{
				name: 'Get Slides',
				value: 'getSlides',
				description: 'Get slides associated with playlist',
				action: 'Get playlist slides',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update playlist',
				action: 'Update playlist',
			},
		],
		default: 'get',
	}
];

export const playlistParameters: INodeProperties[] = [
	/** Playlist Name */
	{
		displayName: 'Playlist Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My Playlist',
		description: 'Name of the playlist',
		displayOptions: {
			show: {
				resource: ['playlists'],
				operation: ['create'],
			},
		},
	},
	/**
	 * Playlist Selector
	 */
	newResourceLocator({
		displayName: 'Playlist',
		name: 'playlistId',
		label: 'playlist',
		searchListMethod: 'searchPlaylists',
		show: {
			resource: ['playlists'],
			operation: ['delete', 'get', 'getNotifications', 'getSlides', 'update'],
		},
	}),
	/**
	 * Fields for Create
	 */
	newResourceMapper({
		resourceMapperMethod: 'playlistCreateMappingColumns',
		show: {
			resource: ['playlists'],
			operation: ['create'],
		},
	}),
	/**
	 * Fields for Update
	 */
	newResourceMapper({
		resourceMapperMethod: 'playlistUpdateMappingColumns',
		show: {
			resource: ['playlists'],
			operation: ['update'],
		},
	}),
];

export async function playlistCreateMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	return {
		fields: [
			playlistMappings.LOOP_MODE,
			playlistMappings.ENABLED,
		],
	};
}

export async function playlistUpdateMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	return {
		fields: [
			playlistMappings.NAME,
			playlistMappings.LOOP_MODE,
			playlistMappings.ENABLED,
		],
	};
}

export async function executePlaylistOperation(
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
				create: createPlaylist.bind(this),
				delete: deletePlaylist.bind(this),
				get: getPlaylist.bind(this),
				getAll: getAllPlaylists.bind(this),
				getNotifications: getPlaylistNotifications.bind(this),
				getSlides: getPlaylistSlides.bind(this),
				update: updatePlaylist.bind(this),
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

async function createPlaylist(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const fields = (this.getNodeParameter('fields', itemIndex, {}) as any).value;

	const body: Record<string, any> = {
		name,
	};

	if (fields.enabled !== undefined) {
		body.enabled = fields.enabled;
	}
	if (fields.loopMode !== undefined) {
		body.loop_mode = fields.loopMode;
	}

	const endpoint = '/api/playlists/';

	const response = await executeApiRequest.call(this, 'POST', endpoint, body);
	return response;
}

async function deletePlaylist(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);

	const endpoint = `/api/playlists/${playlistId}`;
	await executeApiRequest.call(this, 'DELETE', endpoint);
	return { deleted: true };
}

async function getPlaylist(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);

	const endpoint = `/api/playlists/${playlistId}`;
	const response = await executeApiRequest.call(this, 'GET', endpoint);

	return response;
}

async function getAllPlaylists(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const endpoint = '/api/playlists/';
	const response = await executeApiRequest.call(this, 'GET', endpoint);

	return response;
}

async function getPlaylistNotifications(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);

	const endpoint = `/api/playlists/${playlistId}/notifications`;
	const response = await executeApiRequest.call(this, 'GET', endpoint);
	return response;
}

async function getPlaylistSlides(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);

	const endpoint = `/api/playlists/${playlistId}/slides`;
	const response = await executeApiRequest.call(this, 'GET', endpoint);
	return response;
}

async function updatePlaylist(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);
	const fields = (this.getNodeParameter('fields', itemIndex, {}) as any).value;

	const body: Record<string, any> = {};

	// Map the fields from Resource Mapper to API body
	if (nonEmptyString(fields.name)) {
		body.name = fields.name;
	}
	if (fields.enabled !== undefined) {
		body.enabled = fields.enabled;
	}
	if (fields.loopMode !== undefined) {
		body.loop_mode = fields.loopMode;
	}

	const endpoint = `/api/playlists/${playlistId}`;

	const response = await executeApiRequest.call(this, 'PUT', endpoint, body);
	return response;
}
