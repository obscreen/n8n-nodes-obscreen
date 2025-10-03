import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { 
	buildApiUrl, 
	executeApiRequest, 
	getResourceId,
	isValidCronExpression,
	validateDateTimeFormat,
	validateTimeFormat,
	validateDayOfWeek
} from '../utils';
import type { SlidePositions } from '../types';

export const slideFields: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [],
};

export const slideOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['slides'],
		},
	},
	options: [
		{
			name: 'Create',
			value: 'create',
			description: 'Add a new slide to a playlist',
			action: 'Create slide',
		},
		{
			name: 'Create Notification',
			value: 'createNotification',
			description: 'Add a new slide notification to a playlist',
			action: 'Create notification slide',
		},
		{
			name: 'Delete',
			value: 'delete',
			description: 'Delete a slide permanently',
			action: 'Delete slide',
		},
		{
			name: 'Get',
			value: 'get',
			description: 'Get slide information by ID',
			action: 'Get slide',
		},
		{
			name: 'Update',
			value: 'update',
			description: 'Update an existing slide',
			action: 'Update slide',
		},
		{
			name: 'Update Notification',
			value: 'updateNotification',
			description: 'Update an existing slide notification',
			action: 'Update notification slide',
		},
		{
			name: 'Update Positions',
			value: 'updatePositions',
			description: 'Update positions of multiple slides',
			action: 'Update slide positions',
		},
	],
	default: 'get',
};

export const slideParameters: INodeProperties[] = [
	{
		displayName: 'Slide',
		name: 'slideId',
		type: 'resourceLocator',
		default: { mode: 'id', value: '' },
		required: true,
		modes: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 123',
			},
		],
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['delete', 'get', 'update', 'updateNotification'],
			},
		},
	},
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
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'createNotification', 'update', 'updateNotification'],
			},
		},
	},
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
				resource: ['slides'],
				operation: ['create', 'createNotification', 'update', 'updateNotification'],
			},
		},
	},
	{
		displayName: 'Enabled',
		name: 'enabled',
		type: 'boolean',
		default: true,
		description: 'Whether the slide is enabled',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'createNotification', 'update', 'updateNotification'],
			},
		},
	},
	{
		displayName: 'Duration',
		name: 'duration',
		type: 'number',
		default: 3,
		description: 'Duration of the slide in seconds',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'createNotification', 'update', 'updateNotification'],
			},
		},
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'number',
		default: 999,
		description: 'Position of the slide in the playlist',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'createNotification', 'update', 'updateNotification'],
			},
		},
	},
	{
		displayName: 'Delegate Duration',
		name: 'delegateDuration',
		type: 'boolean',
		default: false,
		description: 'Whether the duration should be delegated to video duration',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
			},
			hide: {
				operation: ['createNotification', 'updateNotification'],
			},
		},
	},
	{
		displayName: 'Scheduling Type',
		name: 'scheduling',
		type: 'options',
		options: [
			{
				name: 'Loop',
				value: 'loop',
				description: 'Play continuously in loop',
			},
			{
				name: 'Date Time',
				value: 'datetime',
				description: 'Schedule for specific date and time',
			},
			{
				name: 'In Week',
				value: 'inweek',
				description: 'Schedule for specific days/time of week',
			},
		],
		default: 'loop',
		description: 'How the slide should be scheduled',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
			},
			hide: {
				operation: ['createNotification', 'updateNotification'],
			},
		},
	},
	{
		displayName: 'Notification Scheduling Type',
		name: 'notificationScheduling',
		type: 'options',
		options: [
			{
				name: 'Date Time',
				value: 'datetime',
				description: 'Schedule for specific date and time',
			},
			{
				name: 'Cron',
				value: 'cron',
				description: 'Schedule using cron expression',
			},
		],
		default: 'datetime',
		description: 'How the notification should be scheduled',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['createNotification', 'updateNotification'],
			},
		},
	},
	// Date Time scheduling
	{
		displayName: 'Start Date Time',
		name: 'datetimeStart',
		type: 'string',
		default: '',
		placeholder: 'e.g. 2024-01-15 09:00',
		description: 'Start date and time for scheduling (format: Y-m-d H:M)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'createNotification', 'update', 'updateNotification'],
				scheduling: ['datetime'],
			},
		},
	},
	{
		displayName: 'End Date Time',
		name: 'datetimeEnd',
		type: 'string',
		default: '',
		placeholder: 'e.g. 2024-01-15 17:00',
		description: 'End date and time for scheduling (format: Y-m-d H:M)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'createNotification', 'update', 'updateNotification'],
				scheduling: ['datetime'],
			},
		},
	},
	{
		displayName: 'Notification Start Date Time',
		name: 'datetimeStart',
		type: 'string',
		default: '',
		placeholder: 'e.g. 2024-01-15 09:00',
		description: 'Start date and time for notification scheduling (format: Y-m-d H:M)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['createNotification', 'updateNotification'],
				notificationScheduling: ['datetime'],
			},
		},
	},
	{
		displayName: 'Notification End Date Time',
		name: 'datetimeEnd',
		type: 'string',
		default: '',
		placeholder: 'e.g. 2024-01-15 17:00',
		description: 'End date and time for notification scheduling (format: Y-m-d H:M)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['createNotification', 'updateNotification'],
				notificationScheduling: ['datetime'],
			},
		},
	},
	// Cron scheduling for notifications
	{
		displayName: 'Cron Start Expression',
		name: 'cronStart',
		type: 'string',
		default: '',
		placeholder: 'e.g. 0 9 * * * * *',
		description: 'Cron expression for notification scheduling start (format: * * * * * * *)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['createNotification', 'updateNotification'],
				notificationScheduling: ['cron'],
			},
		},
	},
	{
		displayName: 'Cron End Expression',
		name: 'cronEnd',
		type: 'string',
		default: '',
		placeholder: 'e.g. 0 17 * * * * *',
		description: 'Cron expression for notification scheduling end (format: * * * * * * *)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['createNotification', 'updateNotification'],
				notificationScheduling: ['cron'],
			},
		},
	},
	// In week scheduling
	{
		displayName: 'Start Day',
		name: 'dayStart',
		type: 'number',
		default: 1,
		description: 'Start day for inweek scheduling (1 for Monday to 7 for Sunday)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				scheduling: ['inweek'],
			},
		},
	},
	{
		displayName: 'Start Time',
		name: 'timeStart',
		type: 'string',
		default: '',
		placeholder: 'e.g. 09:00',
		description: 'Start time for inweek scheduling (format: H:M)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				scheduling: ['inweek'],
			},
		},
	},
	{
		displayName: 'End Day',
		name: 'dayEnd',
		type: 'number',
		default: 5,
		description: 'End day for inweek scheduling (1 for Monday to 7 for Sunday)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				scheduling: ['inweek'],
			},
		},
	},
	{
		displayName: 'End Time',
		name: 'timeEnd',
		type: 'string',
		default: '',
		placeholder: 'e.g. 17:00',
		description: 'End time for inweek scheduling (format: H:M)',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				scheduling: ['inweek'],
			},
		},
	},
	// Update positions
	{
		displayName: 'Slide Positions',
		name: 'positions',
		type: 'string',
		default: '',
		placeholder: 'e.g. {"123": 1, "456": 2}',
		description: 'JSON object with slide IDs as keys and their new positions as values',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['updatePositions'],
			},
		},
	},
];

export async function executeSlideOperation(
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
				create: createSlide.bind(this),
				createNotification: createSlideNotification.bind(this),
				delete: deleteSlide.bind(this),
				get: getSlide.bind(this),
				update: updateSlide.bind(this),
				updateNotification: updateSlideNotification.bind(this),
				updatePositions: updateSlidePositions.bind(this),
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

async function createSlide(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentIdValue = this.getNodeParameter('contentId', itemIndex, '') as any;
	const contentId = parseInt(getResourceId(contentIdValue), 10);
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);
	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
	const duration = this.getNodeParameter('duration', itemIndex, 3) as number;
	const position = this.getNodeParameter('position', itemIndex, 999) as number;
	const delegateDuration = this.getNodeParameter('delegateDuration', itemIndex, false) as boolean;
	const scheduling = this.getNodeParameter('scheduling', itemIndex, 'loop') as string;

	const params: Record<string, any> = {
		content_id: contentId,
		playlist_id: playlistId,
		enabled: enabled.toString(),
		duration,
		position,
		delegate_duration: delegateDuration.toString(),
		scheduling,
	};

	// Add scheduling-specific parameters
	if (scheduling === 'datetime') {
		const datetimeStart = this.getNodeParameter('datetimeStart', itemIndex, '') as string;
		const datetimeEnd = this.getNodeParameter('datetimeEnd', itemIndex, '') as string;
		
		if (datetimeStart) {
			if (!validateDateTimeFormat(datetimeStart)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 09:00)');
			}
			params.datetime_start = datetimeStart;
		}
		
		if (datetimeEnd) {
			if (!validateDateTimeFormat(datetimeEnd)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
			}
			params.datetime_end = datetimeEnd;
		}
	} else if (scheduling === 'inweek') {
		const dayStart = this.getNodeParameter('dayStart', itemIndex, 1) as number;
		const dayEnd = this.getNodeParameter('dayEnd', itemIndex, 5) as number;
		const timeStart = this.getNodeParameter('timeStart', itemIndex, '') as string;
		const timeEnd = this.getNodeParameter('timeEnd', itemIndex, '') as string;

		if (!validateDayOfWeek(dayStart)) {
			throw new NodeOperationError(this.getNode(), 'Start day must be between 1 (Monday) and 7 (Sunday)');
		}
		
		if (!validateDayOfWeek(dayEnd)) {
			throw new NodeOperationError(this.getNode(), 'End day must be between 1 (Monday) and 7 (Sunday)');
		}
		
		if (timeStart && !validateTimeFormat(timeStart)) {
			throw new NodeOperationError(this.getNode(), 'Invalid time format. Use H:M format (e.g. 09:00)');
		}
		
		if (timeEnd && !validateTimeFormat(timeEnd)) {
			throw new NodeOperationError(this.getNode(), 'Invalid time format. Use H:M format (e.g. 17:00)');
		}

		params.day_start = dayStart;
		params.day_end = dayEnd;
		if (timeStart) params.time_start = timeStart;
		if (timeEnd) params.time_end = timeEnd;
	}

	const endpoint = '/api/slides/';
	const url = buildApiUrl(endpoint, params);

	const response = await executeApiRequest.call(this, 'POST', url);
	return response;
}

async function createSlideNotification(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const contentIdValue = this.getNodeParameter('contentId', itemIndex, '') as any;
	const contentId = parseInt(getResourceId(contentIdValue), 10);
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);
	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
	const duration = this.getNodeParameter('duration', itemIndex, 3) as number;
	const position = this.getNodeParameter('position', itemIndex, 999) as number;
	const notificationScheduling = this.getNodeParameter('notificationScheduling', itemIndex, 'datetime') as string;

	const params: Record<string, any> = {
		content_id: contentId,
		playlist_id: playlistId,
		enabled: enabled.toString(),
		duration,
		position,
		scheduling: notificationScheduling,
	};

	if (notificationScheduling === 'datetime') {
		const datetimeStart = this.getNodeParameter('datetimeStart', itemIndex, '') as string;
		const datetimeEnd = this.getNodeParameter('datetimeEnd', itemIndex, '') as string;
		
		if (datetimeStart) {
			if (!validateDateTimeFormat(datetimeStart)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 09:00)');
			}
			params.datetime_start = datetimeStart;
		}
		
		if (datetimeEnd) {
			if (!validateDateTimeFormat(datetimeEnd)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
			}
			params.datetime_end = datetimeEnd;
		}
	} else if (notificationScheduling === 'cron') {
		const cronStart = this.getNodeParameter('cronStart', itemIndex, '') as string;
		const cronEnd = this.getNodeParameter('cronEnd', itemIndex, '') as string;
		
		if (cronStart) {
			if (!isValidCronExpression(cronStart)) {
				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
			}
			params.cron_start = cronStart;
		}
		
		if (cronEnd) {
			if (!isValidCronExpression(cronEnd)) {
				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
			}
			params.cron_end = cronEnd;
		}
	}

	const endpoint = '/api/slides/notifications';
	const url = buildApiUrl(endpoint, params);

	const response = await executeApiRequest.call(this, 'POST', url);
	return response;
}

async function deleteSlide(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const slideIdValue = this.getNodeParameter('slideId', itemIndex, '') as any;
	const slideId = getResourceId(slideIdValue);

	const endpoint = `/api/slides/${slideId}`;
	await executeApiRequest.call(this, 'DELETE', endpoint);
	return { deleted: true };
}

async function getSlide(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const slideIdValue = this.getNodeParameter('slideId', itemIndex, '') as any;
	const slideId = getResourceId(slideIdValue);

	const endpoint = `/api/slides/${slideId}`;
	const response = await executeApiRequest.call(this, 'GET', endpoint);
	return response;
}

async function updateSlide(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const slideIdValue = this.getNodeParameter('slideId', itemIndex, '') as any;
	const slideId = getResourceId(slideIdValue);
	const contentId = this.getNodeParameter('contentId', itemIndex, '') as string;
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);
	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
	const duration = this.getNodeParameter('duration', itemIndex, 3) as number;
	const position = this.getNodeParameter('position', itemIndex, 999) as number;
	const delegateDuration = this.getNodeParameter('delegateDuration', itemIndex, false) as boolean;
	const scheduling = this.getNodeParameter('scheduling', itemIndex, 'loop') as string;

	const params: Record<string, any> = {
		enabled: enabled.toString(),
		duration,
		position,
		delegate_duration: delegateDuration.toString(),
		scheduling,
	};

	if (contentId) params.content_id = parseInt(contentId, 10);
	if (playlistId) params.playlist_id = playlistId;

	if (scheduling === 'datetime') {
		const datetimeStart = this.getNodeParameter('datetimeStart', itemIndex, '') as string;
		const datetimeEnd = this.getNodeParameter('datetimeEnd', itemIndex, '') as string;
		
		if (datetimeStart) {
			if (!validateDateTimeFormat(datetimeStart)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 09:00)');
			}
			params.datetime_start = datetimeStart;
		}
		
		if (datetimeEnd) {
		if (!validateDateTimeFormat(datetimeEnd)) {
			throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
		}
			params.datetime_end = datetimeEnd;
		}
	} else if (scheduling === 'inweek') {
		const dayStart = this.getNodeParameter('dayStart', itemIndex, 1) as number;
		const dayEnd = this.getNodeParameter('dayEnd', itemIndex, 5) as number;
		const timeStart = this.getNodeParameter('timeStart', itemIndex, '') as string;
		const timeEnd = this.getNodeParameter('timeEnd', itemIndex, '') as string;

		if (!validateDayOfWeek(dayStart)) {
			throw new NodeOperationError(this.getNode(), 'Start day must be between 1 (Monday) and 7 (Sunday)');
		}
		
		if (!validateDayOfWeek(dayEnd)) {
			throw new NodeOperationError(this.getNode(), 'End day must be between 1 (Monday) and 7 (Sunday)');
		}
		
		if (timeStart && !validateTimeFormat(timeStart)) {
			throw new NodeOperationError(this.getNode(), 'Invalid time format. Use H:M format (e.g. 09:00)');
		}
		
		if (timeEnd && !validateTimeFormat(timeEnd)) {
			throw new NodeOperationError(this.getNode(), 'Invalid time format. Use H:M format (e.g. 17:00)');
		}

		params.day_start = dayStart;
		params.day_end = dayEnd;
		if (timeStart) params.time_start = timeStart;
		if (timeEnd) params.time_end = timeEnd;
	}

	const endpoint = `/api/slides/${slideId}`;
	const url = buildApiUrl(endpoint, params);

	const response = await executeApiRequest.call(this, 'PUT', url);
	return response;
}

async function updateSlideNotification(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const slideIdValue = this.getNodeParameter('slideId', itemIndex, '') as any;
	const slideId = getResourceId(slideIdValue);
	const contentId = this.getNodeParameter('contentId', itemIndex, '') as string;
	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
	const playlistId = getResourceId(playlistIdValue);
	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
	const duration = this.getNodeParameter('duration', itemIndex, 3) as number;
	const position = this.getNodeParameter('position', itemIndex, 999) as number;
	const notificationScheduling = this.getNodeParameter('notificationScheduling', itemIndex, 'datetime') as string;

	const params: Record<string, any> = {
		enabled: enabled.toString(),
		duration,
		position,
		scheduling: notificationScheduling,
	};
	
	if (contentId) params.content_id = parseInt(contentId, 10);
	if (playlistId) params.playlist_id = playlistId;

	if (notificationScheduling === 'datetime') {
		const datetimeStart = this.getNodeParameter('datetimeStart', itemIndex, '') as string;
		const datetimeEnd = this.getNodeParameter('datetimeEnd', itemIndex, '') as string;
		
		if (datetimeStart) {
			if (!validateDateTimeFormat(datetimeStart)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 09:00)');
			}
			params.datetime_start = datetimeStart;
		}
		
		if (datetimeEnd) {
			if (!validateDateTimeFormat(datetimeEnd)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
			}
			params.datetime_end = datetimeEnd;
		}
	} else if (notificationScheduling === 'cron') {
		const cronStart = this.getNodeParameter('cronStart', itemIndex, '') as string;
		const cronEnd = this.getNodeParameter('cronEnd', itemIndex, '') as string;
		
		if (cronStart) {
			if (!isValidCronExpression(cronStart)) {
				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
			}
			params.cron_start = cronStart;
		}
		
		if (cronEnd) {
			if (!isValidCronExpression(cronEnd)) {
				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
			}
			params.cron_end = cronEnd;
		}
	}

	const endpoint = `/api/slides/notifications/${slideId}`;
	const url = buildApiUrl(endpoint, params);

	const response = await executeApiRequest.call(this, 'PUT', url);
	return response;
}

async function updateSlidePositions(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const positionsString = this.getNodeParameter('positions', itemIndex, '') as string;
	
	try {
		const positions = JSON.parse(positionsString) as SlidePositions;
		
		const endpoint = '/api/slides/positions';
		const body = { positions: positions.positions };
		
		const response = await executeApiRequest.call(this, 'POST', endpoint, body);
		return response;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Invalid JSON format for positions. Use format: {"123": 1, "456": 2}');
	}
}
