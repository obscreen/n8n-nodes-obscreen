import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';

export function nonEmptyString(value: string): boolean {
	return value !== undefined && value !== null && value !== '';
}

export function buildApiUrl(endpoint: string, params?: Record<string, any>): string {
	let url = endpoint;
	
	if (params) {
		const queryStringParts: string[] = [];
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				queryStringParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
			}
		});
		
		if (queryStringParts.length > 0) {
			url += `?${queryStringParts.join('&')}`;
		}
	}
	
	return url;
}

export function isValidCronExpression(cron: string): boolean {
	const cronFields = cron.split(' ');
	return cronFields.length >= 6 && cronFields.length <= 7;
}

export function validateDateTimeFormat(dateTime: string): boolean {
	// Format: YYYY-MM-DD HH:mm
	const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
	return dateTimeRegex.test(dateTime);
}

export function validateDateTimeFormatWithoutSeconds(dateTime: string): boolean {
	// Format: YYYY-MM-DD HH:mm
	const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
	return dateTimeRegex.test(dateTime);
}

export function validateTimeFormat(time: string): boolean {
	// Format: HH:mm
	const timeRegex = /^\d{2}:\d{2}$/;
	return timeRegex.test(time);
}

export function validateDayOfWeek(day: number): boolean {
	return day >= 1 && day <= 7;
}

export function handleApiError(
	error: any,
	node: any,
	itemIndex: number,
	operation: string,
	resource: string
): never {
	const errorDescription = `Check your credentials and parameters. The "${resource}" ${operation.toLowerCase()} operation failed.`;
	
	const context: any = { itemIndex, resource, operation };
	
	if (error.response?.status === 401) {
		context.contextMessage = 'Invalid API key or instance URL';
	} else if (error.response?.status === 404) {
		context.contextMessage = `${resource} not found`;
	} else if (error.response?.status >= 500) {
		context.contextMessage = 'Server error - please try again later';
	}
	
	throw new NodeOperationError(node, error, {
		...context,
		description: errorDescription,
	});
}

export function getResourceFields(resource: string): string[] {
	const fieldMappings: Record<string, string[]> = {
		contents: ['id', 'name', 'type', 'location', 'folder_id'],
		playlists: ['id', 'name', 'enabled', 'loop_mode'],
		slides: ['id', 'name', 'content_id', 'playlist_id', 'duration', 'position', 'enabled'],
	};
	
	return fieldMappings[resource] || [];
}

export async function executeApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	url: string,
	body?: any,
	additionalOptions?: Record<string, any>
): Promise<any> {
	const credentials = await this.getCredentials('obscreenApi') as { instanceUrl?: string; apiKey?: string };
	const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '');

	const options: any = {
		method,
		url: `${baseUrl}${url}`,
		returnFullResponse: true,
		json: true,
		skipSslCertificateValidation: true,
		headers: {
			'Content-Type': body instanceof FormData ? 'multipart/form-data' : 'application/json',
			...(additionalOptions?.headers || {}),
		},
		...additionalOptions,
	};

	if (body) {
		options.body = body;
	}

	this.logger.debug('executeApiRequest called with:', { method, url, options, body, additionalOptions });

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'obscreenApi', options);
		this.logger.debug('executeApiRequest response:', { response });
		return response.body;
	} catch (error) {
		this.logger.debug('Error in executeApiRequest:', { error, options });
		throw error;
	}
}

export function formatFileUploadError(error: any, filename: string): string {
	if (error.response?.status === 413) {
		return `File "${filename}" is too large`;
	}
	if (error.response?.status === 415) {
		return `File "${filename}" has unsupported format`;
	}
	return `Failed to upload "${filename}": ${error.message}`;
}

export function getResourceId(resourceLocatorValue: any): string {
	if (typeof resourceLocatorValue === 'string') {
		return resourceLocatorValue;
	}
	if (resourceLocatorValue?.value || typeof resourceLocatorValue.value === 'string') {
		return resourceLocatorValue.value;
	}

	throw new Error('Invalid resource locator value');
}


interface GetResourceMapperProps {
	name?: string;
	resourceMapperMethod: string;
	show: Record<string, string[]>;
}
export function newResourceMapper({
	name = 'fields',
	resourceMapperMethod,
	show
}: GetResourceMapperProps): INodeProperties {
	return {
		displayName: 'Fields',
		name: name,
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: resourceMapperMethod,
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
			show: show
		},
	}
}

interface GetResourceLocatorProps {
	displayName: string;
	name: string;
	label?: string;
	searchListMethod: string;
	show?: Record<string, string[]>;
}
export function newResourceLocator({displayName, name, label, searchListMethod, show}: GetResourceLocatorProps): INodeProperties {
	const properties: INodeProperties = {
		displayName: displayName,
		name: name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: `Select a${typeof label === 'string' && label !== '' ? '' : 'n'} ${label || 'item'}...`,
				typeOptions: {
					searchListMethod: searchListMethod,
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
	};

	if (show) {
		if (!properties.displayOptions) {
			properties.displayOptions = {};
		}
		properties.displayOptions.show = show;
	}

	return properties;
}