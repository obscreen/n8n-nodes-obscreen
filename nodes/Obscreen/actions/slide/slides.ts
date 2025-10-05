import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeProperties, ResourceMapperFields } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { 
	executeApiRequest, 
	getResourceId,
	isValidCronExpression,
	validateDateTimeFormat,
	validateTimeFormat,
	validateDayOfWeek,
	newResourceMapper,
	newResourceLocator
} from '../../utils';
import { slideMappings } from './mappings';
export { searchSlides } from './search';

export const slideOperations: INodeProperties[] = [
	/**
	 * Operation
	 */
	{
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
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of slides',
				action: 'Get many slides',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing slide',
				action: 'Update slide',
			},
			{
				name: 'Update Positions',
				value: 'updatePositions',
				description: 'Update positions of multiple slides',
				action: 'Update slide positions',
			},
		],
		default: 'get',
	},
	/**
	 * Slide Mode
	 */
	{
		displayName: 'Slide Mode',
		name: 'slideMode',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				name: 'Regular',
				value: 'regular',
				description: 'Regular slide are displayed in the playlist in the order they are added',
				action: 'Regular slide',
			},
			{
				name: 'Notification',
				value: 'notification',
				description: 'Notification slide are displayed in the playlist at specific times',
				action: 'Notification slide',
			},
		],
		default: 'regular',
	},
];

export const slideParameters: INodeProperties[] = [
	/**
	 * Slide Selector
	 */
	newResourceLocator({
		displayName: 'Slide',
		name: 'slideId',
		label: 'slide',
		searchListMethod: 'searchSlides',
		show: {
			resource: ['slides'],
			operation: ['delete', 'get', 'update'],
		},
	}),
	/**
	 * Content Selector
	 */
	newResourceLocator({
		displayName: 'Content',
		label: 'content',
		name: 'contentId',
		searchListMethod: 'searchContents',
		show: {
			resource: ['slides'],
			operation: ['create', 'update'],
		},
	}),
	/**
	 * Playlist Selector
	 */
	newResourceLocator({
		displayName: 'Playlist',
		name: 'playlistId',
		label: 'playlist',
		searchListMethod: 'searchPlaylists',
		show: {
			resource: ['slides'],
			operation: ['create', 'update'],
		},
	}),
	/**
	 * Regular Start Scheduling Type
	 */
	{
		displayName: 'Scheduling Start',
		name: 'schedulingStart',
		type: 'options',
		options: [
			{
				name: 'Always in Loop',
				value: 'loop',
				description: 'Play continuously in loop',
			},
			{
				name: 'Date & Time',
				value: 'datetime',
				description: 'Schedule for specific date and time',
			},
			{
				name: 'Moment in Week',
				value: 'inweek',
				description: 'Schedule for specific days/time of week',
			},
		],
		default: 'loop',
		description: 'How the slide should be scheduled at start',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				slideMode: ['regular'],
			},
		},
	},
	/**
	 * Notification Start Scheduling Type
	 */
	{
		displayName: 'Scheduling Start',
		name: 'schedulingStart',
		type: 'options',
		options: [
			{
				name: 'Date & Time',
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
				operation: ['create', 'update'],
				slideMode: ['notification'],
			},
		},
	},
	/**
	 * Date Time Start
	 */
	{
		displayName: 'Start Date Time',
		name: 'datetimeStart',
		type: 'dateTime',
		default: '',
		placeholder: 'e.g. 2024-01-15 09:00',
		description: 'Start date and time for scheduling (format: Y-m-d H:M)',
		hint: 'Seconds are ignored; Using the time zone configured in your instance',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				schedulingStart: ['datetime'],
			},
		},
	},
	/**
	 * Regular End Scheduling Type
	 */
	{
		displayName: 'Scheduling End',
		name: 'schedulingEnd',
		type: 'options',
		options: [
			{
				name: 'Follow Loop',
				value: 'loop',
				description: 'Follow the loop of the playlist',
			},
			{
				name: 'Date & Time',
				value: 'datetime',
				description: 'Schedule for specific date and time',
			},
		],
		default: 'loop',
		description: 'How the slide should be scheduled at end',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				slideMode: ['regular'],
				schedulingStart: ['datetime'],
			},
		},
	},
	/**
	 * Notification End Scheduling Type
	 */
	{
		displayName: 'Scheduling End',
		name: 'schedulingEnd',
		type: 'options',
		options: [
			{
				name: 'Date & Time',
				value: 'datetime',
				description: 'Hide notification at specific date and time',
			},
			{
				name: 'Duration',
				value: 'duration',
				description: 'Hide notification after specific duration',
			},
		],
		default: 'datetime',
		description: 'How the slide should be scheduled at end',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				slideMode: ['notification'],
				schedulingStart: ['datetime'],
			},
		},
	},
	/**
	 * Date Time End
	 */
	{
		displayName: 'End Date Time',
		name: 'datetimeEnd',
		type: 'dateTime',
		default: '',
		placeholder: 'e.g. 2024-01-15 09:00',
		description: 'End date and time for scheduling (format: Y-m-d H:M)',
		hint: 'Seconds are ignored; Using the time zone configured in your instance',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				schedulingStart: ['datetime'],
				schedulingEnd: ['datetime'],
			},
		},
	},
	/**
	 * Start Day Of Week
	 */
	{
		displayName: 'Start Day',
		name: 'dayStart',
		type: 'options',
		default: 1,
		description: 'Start day for inweek scheduling (1 for Monday to 7 for Sunday)',
        options: [
            { name: 'Monday', value: 1 },
            { name: 'Tuesday', value: 2 },
            { name: 'Wednesday', value: 3 },
            { name: 'Thursday', value: 4 },
            { name: 'Friday', value: 5 },
            { name: 'Saturday', value: 6 },
            { name: 'Sunday', value: 7 },
        ],
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				schedulingStart: ['inweek'],
			},
		},
	},
	/**
	 * Start Time
	 */
	{
		displayName: 'Start Time',
		name: 'timeStart',
		type: 'string',
		default: '09:00',
		validateType: 'time',
		placeholder: 'e.g. 09:00',
		description: 'Start time for inweek scheduling (format: H:M)',
		hint: 'Take into account the time zone configured in your Obscreen instance',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				schedulingStart: ['inweek'],
			},
		},
	},
	/**
	 * End Day Of Week
	 */
	{
		displayName: 'End Day',
		name: 'dayEnd',
		type: 'options',
		default: 1,
		description: 'End day for inweek scheduling (1 for Monday to 7 for Sunday)',
		options: [
			{ name: 'Monday', value: 1 },
			{ name: 'Tuesday', value: 2 },
			{ name: 'Wednesday', value: 3 },
			{ name: 'Thursday', value: 4 },
			{ name: 'Friday', value: 5 },
			{ name: 'Saturday', value: 6 },
			{ name: 'Sunday', value: 7 },
		],
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				schedulingStart: ['inweek'],
			},
		},
	},
	/**
	 * End Time
	 */
	{
		displayName: 'End Time',
		name: 'timeEnd',
		type: 'string',
		default: '17:00',
		placeholder: 'e.g. 17:00',
		validateType: 'time',
		description: 'End time for inweek scheduling (format: H:M)',
		hint: 'Take into account the time zone configured in your Obscreen instance',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['create', 'update'],
				schedulingStart: ['inweek'],
			},
		},
	},
	/**
	 * Cron scheduling for notifications
	 */
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
				operation: ['create', 'update'],
				schedulingStart: ['cron'],
			},
		},
	},
	/**
	 * Update positions
	 */
	{
		displayName: 'Slide Positions',
		name: 'positions',
		type: 'json',
		default: '',
		placeholder: 'e.g. {"123": 1, "456": 2}',
		description: 'JSON object with slide IDs as keys and their new positions as values',
		hint: 'JSON object with slide IDs as keys and their new positions as values (e.g. {"123": 1, "456": 2})',
		displayOptions: {
			show: {
				resource: ['slides'],
				operation: ['updatePositions'],
			},
		},
	},
	/**
	 * Fields for Create
	 */
	newResourceMapper({
		resourceMapperMethod: 'slideCreateMappingColumns',
		show: {
			resource: ['slides'],
			operation: ['create'],
		},
	}),
	/**
	 * Fields for Update
	 */
	newResourceMapper({
		resourceMapperMethod: 'slideUpdateMappingColumns',
		show: {
			resource: ['slides'],
			operation: ['update'],
		},
	}),
];

export async function slideCreateMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	return {
		fields: [
			slideMappings.DURATION,
			slideMappings.DELEGATE_DURATION,
			slideMappings.POSITION,
			slideMappings.ENABLED,
		],
	};
}

export async function slideUpdateMappingColumns(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	return {
		fields: [
			slideMappings.DURATION,
			slideMappings.DELEGATE_DURATION,
			slideMappings.ENABLED,
		],
	};
}

async function getAllSlides(this: IExecuteFunctions, itemIndex: number): Promise<any> {
	const endpoint = '/api/slides';
	return await executeApiRequest.call(this, 'GET', endpoint);
}

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
			delete: deleteSlide.bind(this),
			get: getSlide.bind(this),
			getAll: getAllSlides.bind(this),
			update: updateSlide.bind(this),
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

	const body: Record<string, any> = {
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
			body.datetime_start = datetimeStart;
		}
		
		if (datetimeEnd) {
			if (!validateDateTimeFormat(datetimeEnd)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
			}
			body.datetime_end = datetimeEnd;
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

		body.day_start = dayStart;
		body.day_end = dayEnd;
		if (timeStart) body.time_start = timeStart;
		if (timeEnd) body.time_end = timeEnd;
	}

	const endpoint = '/api/slides/';

	const response = await executeApiRequest.call(this, 'POST', endpoint, body);
	return response;
}

// async function createSlideNotification(
// 	this: IExecuteFunctions,
// 	itemIndex: number,
// 	resource: string,
// 	operation: string
// ): Promise<any> {
// 	const contentIdValue = this.getNodeParameter('contentId', itemIndex, '') as any;
// 	const contentId = parseInt(getResourceId(contentIdValue), 10);
// 	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
// 	const playlistId = getResourceId(playlistIdValue);
// 	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
// 	const duration = this.getNodeParameter('duration', itemIndex, 3) as number;
// 	const position = this.getNodeParameter('position', itemIndex, 999) as number;
// 	const notificationScheduling = this.getNodeParameter('notificationScheduling', itemIndex, 'datetime') as string;

// 	const body: Record<string, any> = {
// 		content_id: contentId,
// 		playlist_id: playlistId,
// 		enabled: enabled.toString(),
// 		duration,
// 		position,
// 		scheduling: notificationScheduling,
// 	};

// 	if (notificationScheduling === 'datetime') {
// 		const datetimeStart = this.getNodeParameter('datetimeStart', itemIndex, '') as string;
// 		const datetimeEnd = this.getNodeParameter('datetimeEnd', itemIndex, '') as string;
		
// 		if (datetimeStart) {
// 			if (!validateDateTimeFormat(datetimeStart)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 09:00)');
// 			}
// 			body.datetime_start = datetimeStart;
// 		}
		
// 		if (datetimeEnd) {
// 			if (!validateDateTimeFormat(datetimeEnd)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
// 			}
// 			body.datetime_end = datetimeEnd;
// 		}
// 	} else if (notificationScheduling === 'cron') {
// 		const cronStart = this.getNodeParameter('cronStart', itemIndex, '') as string;
// 		const cronEnd = this.getNodeParameter('cronEnd', itemIndex, '') as string;
		
// 		if (cronStart) {
// 			if (!isValidCronExpression(cronStart)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
// 			}
// 			body.cron_start = cronStart;
// 		}
		
// 		if (cronEnd) {
// 			if (!isValidCronExpression(cronEnd)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
// 			}
// 			body.cron_end = cronEnd;
// 		}
// 	}

// 	const endpoint = '/api/slides/notifications';

// 	const response = await executeApiRequest.call(this, 'POST', endpoint, body);
// 	return response;
// }

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
	const fields = (this.getNodeParameter('fields', itemIndex, {}) as any).value;

	const body: Record<string, any> = {};
	
	// Map the fields from Resource Mapper to API parameters
	if (fields.enabled !== undefined) {
		body.enabled = fields.enabled.toString();
	}
	if (fields.duration !== undefined) {
		body.duration = fields.duration;
	}
	if (fields.position !== undefined) {
		body.position = fields.position;
	}
	if (fields.delegateDuration !== undefined) {
		body.delegate_duration = fields.delegateDuration.toString();
	}
	if (fields.scheduling !== undefined) {
		body.scheduling = fields.scheduling;
	}

	if (contentId) body.content_id = parseInt(contentId, 10);
	if (playlistId) body.playlist_id = playlistId;

	if (fields.scheduling === 'datetime') {
		const datetimeStart = this.getNodeParameter('datetimeStart', itemIndex, '') as string;
		const datetimeEnd = this.getNodeParameter('datetimeEnd', itemIndex, '') as string;
		
		if (datetimeStart) {
			if (!validateDateTimeFormat(datetimeStart)) {
				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 09:00)');
			}
			body.datetime_start = datetimeStart;
		}
		
		if (datetimeEnd) {
		if (!validateDateTimeFormat(datetimeEnd)) {
			throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
		}
			body.datetime_end = datetimeEnd;
		}
	} else if (fields.scheduling === 'inweek') {
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

		body.day_start = dayStart;
		body.day_end = dayEnd;
		if (timeStart) body.time_start = timeStart;
		if (timeEnd) body.time_end = timeEnd;
	}

	const endpoint = `/api/slides/${slideId}`;

	const response = await executeApiRequest.call(this, 'PUT', endpoint, body);
	return response;
}

// async function updateSlideNotification(
// 	this: IExecuteFunctions,
// 	itemIndex: number,
// 	resource: string,
// 	operation: string
// ): Promise<any> {
// 	const slideIdValue = this.getNodeParameter('slideId', itemIndex, '') as any;
// 	const slideId = getResourceId(slideIdValue);
// 	const contentId = this.getNodeParameter('contentId', itemIndex, '') as string;
// 	const playlistIdValue = this.getNodeParameter('playlistId', itemIndex, '') as any;
// 	const playlistId = getResourceId(playlistIdValue);
// 	const enabled = this.getNodeParameter('enabled', itemIndex, true) as boolean;
// 	const duration = this.getNodeParameter('duration', itemIndex, 3) as number;
// 	const position = this.getNodeParameter('position', itemIndex, 999) as number;
// 	const notificationScheduling = this.getNodeParameter('notificationScheduling', itemIndex, 'datetime') as string;

// 	const body: Record<string, any> = {
// 		enabled: enabled.toString(),
// 		duration,
// 		position,
// 		scheduling: notificationScheduling,
// 	};
	
// 	if (contentId) body.content_id = parseInt(contentId, 10);
// 	if (playlistId) body.playlist_id = playlistId;

// 	if (notificationScheduling === 'datetime') {
// 		const datetimeStart = this.getNodeParameter('datetimeStart', itemIndex, '') as string;
// 		const datetimeEnd = this.getNodeParameter('datetimeEnd', itemIndex, '') as string;
		
// 		if (datetimeStart) {
// 			if (!validateDateTimeFormat(datetimeStart)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 09:00)');
// 			}
// 			body.datetime_start = datetimeStart;
// 		}
		
// 		if (datetimeEnd) {
// 			if (!validateDateTimeFormat(datetimeEnd)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid datetime format. Use Y-m-d H:M format (e.g. 2024-01-15 17:00)');
// 			}
// 			body.datetime_end = datetimeEnd;
// 		}
// 	} else if (notificationScheduling === 'cron') {
// 		const cronStart = this.getNodeParameter('cronStart', itemIndex, '') as string;
// 		const cronEnd = this.getNodeParameter('cronEnd', itemIndex, '') as string;
		
// 		if (cronStart) {
// 			if (!isValidCronExpression(cronStart)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
// 			}
// 			body.cron_start = cronStart;
// 		}
		
// 		if (cronEnd) {
// 			if (!isValidCronExpression(cronEnd)) {
// 				throw new NodeOperationError(this.getNode(), 'Invalid cron expression format. Use * * * * * * * format');
// 			}
// 			body.cron_end = cronEnd;
// 		}
// 	}

// 	const endpoint = `/api/slides/notifications/${slideId}`;

// 	const response = await executeApiRequest.call(this, 'PUT', endpoint, body);
// 	return response;
// }

async function updateSlidePositions(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const positionsString = this.getNodeParameter('positions', itemIndex, '') as string;
	
	try {
		const positions = JSON.parse(positionsString) as Record<string, number>;
		
		const endpoint = '/api/slides/positions';
		const body = { positions: positions };
		
		const response = await executeApiRequest.call(this, 'POST', endpoint, body);
		return response;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Invalid JSON format for positions. Use format: {"123": 1, "456": 2}');
	}
}
