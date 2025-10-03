import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { buildApiUrl, executeApiRequest, getResourceId } from '../utils';

export const playlistFields: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [],
};

export const playlistOperations: INodeProperties = {
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
			description: 'Create a new playlist',
			action: 'Create playlist',
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a playlist permanently',
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
			description: 'Retrieve a list of playlists',
			action: 'Get many playlists',
		},
		{
			name: 'Get Notifications',
			value: 'getNotifications',
			description: 'Get notifications associated with a playlist',
			action: 'Get playlist notifications',
		},
		{
			name: 'Get Slides',
			value: 'getSlides',
			description: 'Get slides associated with a playlist',
			action: 'Get playlist slides',
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update an existing playlist',
			action: 'Update playlist',
		},
	],
	default: 'get',
};

export const playlistParameters: INodeProperties[] = [
	{
		displayName: 'Playlist',
		name: 'playlistId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a playlist...',
				typeOptions: {
					searchListMethod: 'searchPlaylists',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. playlist-123',
			},
		],
		displayOptions: {
			show: {
				resource: ['playlists'],
				operation: ['delete', 'get', 'getNotifications', 'getSlides', 'update'],
			},
		},
	},
	{
		displayName: 'Playlist Name',
		name: 'name',
		type: 'string',
		default: '',
		placeholder: 'e.g. My Playlist',
		displayOptions: {
			show: {
				resource: ['playlists'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description: 'Whether the playlist is enabled',
		displayOptions: {
			show: {
				resource: ['playlists'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Loop Mode',
		name: 'loopMode',
		type: 'options',
		options: [
			{
				name: 'Sequential',
				value: 'sequential',
				description: 'Play content in order',
			},
			{
				name: 'Time Sync',
				value: 'timesync',
				description: 'Synchronize with time',
			},
			{
				name: 'Random',
				value: 'random',
				description: 'Play content randomly',
			},
		],
		default: 'sequential',
		description: 'How content is played in the playlist',
		displayOptions: {
			show: {
				resource: ['playlists'],
				operation: ['create', 'update'],
			},
		},
	},
];

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
	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
	const loopMode = this.getNodeParameter('loopMode', itemIndex, 'sequential') as string;

	const endpoint = '/api/playlists/';
	const url = buildApiUrl(endpoint, { 
		name, 
		enabled: enabled.toString(), 
		loop_mode: loopMode 
	});

	const response = await executeApiRequest.call(this, 'POST', url);
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
	const endpoint = '/api/playlists';
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
	const name = this.getNodeParameter('name', itemIndex, '') as string;
	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
	const loopMode = this.getNodeParameter('loopMode', itemIndex, 'sequential') as string;

	const params: Record<string, string> = {};
	
	if (name) params.name = name;
	params.enabled = enabled.toString();
	params.loop_mode = loopMode;

	const endpoint = `/api/playlists/${playlistId}`;
	const url = buildApiUrl(endpoint, params);

	const response = await executeApiRequest.call(this, 'PUT', url);
	return response;
}
