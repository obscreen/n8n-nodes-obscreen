import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Import actions from modular structure
import { contentOperations, contentParameters, executeContentOperation } from './actions/contents';
import { contentFolderOperations, contentFolderParameters, executeContentFolderOperation } from './actions/contentFolders';
import { playlistOperations, playlistParameters, executePlaylistOperation } from './actions/playlists';
import { slideOperations, slideParameters, executeSlideOperation } from './actions/slides';
import { processOperations, processParameters, executeProcessOperation } from './actions/process';

const SEARCH_LIMIT = 50;

export class Obscreen implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Obscreen',
		name: 'obscreen',
		icon: 'file:obscreen.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Automate digital signage using Obscreen',
		defaults: {
			name: 'Obscreen',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'obscreenApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Content',
						value: 'contents',
					},
					{
						name: 'Content Folder',
						value: 'contentFolders',
					},
					{
						name: 'Playlist',
						value: 'playlists',
					},
					{
						name: 'Process',
						value: 'process',
					},
					{
						name: 'Slide',
						value: 'slides',
					},
				],
				default: 'contents',
			},
			// Dynamic operation options based on resource selection
			contentOperations,
			contentFolderOperations,
			playlistOperations,
			slideOperations,
			processOperations,
			// Dynamic parameters based on resource and operation selections
			...contentParameters,
			...contentFolderParameters,
			...playlistParameters,
			...slideParameters,
			...processParameters,
		],
	};

	methods = {
		listSearch: {
			async searchPlaylists(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('obscreenApi') as { instanceUrl?: string; apiKey?: string };
				const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '') || '';
				
				const endpoint = '/api/playlists';
				const fullUrl = `${baseUrl}${endpoint}`;
				
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'obscreenApi', {
					method: 'GET',
					url: fullUrl,
					returnFullResponse: true,
				});
				
				const playlists = Array.isArray(response.body) ? response.body : [];
				
				// Filter playlists based on query if provided
				let filteredPlaylists = playlists;
				if (query) {
					filteredPlaylists = playlists.filter((playlist: any) => 
						playlist.name?.toLowerCase().includes(query.toLowerCase())
					);
				}
				
				// Format results for listSearch
				const results = filteredPlaylists.map((playlist: any) => ({
					name: playlist.name || `Playlist ${playlist.id}`,
					value: playlist.id,
					description: playlist.description || '',
					url: playlist.url || '',
				}));
				
				return {
					results: results.slice(0, SEARCH_LIMIT),
				};
			},
			async searchContents(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('obscreenApi') as { instanceUrl?: string; apiKey?: string };
				const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '') || '';
				
				const endpoint = '/api/contents/';
				const fullUrl = `${baseUrl}${endpoint}`;
				
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'obscreenApi', {
					method: 'GET',
					url: fullUrl,
					returnFullResponse: true,
				});
				
				const contents = Array.isArray(response.body) ? response.body : [];
				
				// Filter contents based on query if provided
				let filteredContents = contents;
				if (query) {
					filteredContents = contents.filter((content: any) => 
						content.name?.toLowerCase().includes(query.toLowerCase())
					);
				}
				
				// Format results for listSearch
				const results = filteredContents.map((content: any) => ({
					name: content.name || `Content ${content.id}`,
					value: content.id,
					description: content.description || '',
					url: content.url || '',
				}));
				
				return {
					results: results.slice(0, SEARCH_LIMIT),
				};
			},
			async searchFolders(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('obscreenApi') as { instanceUrl?: string; apiKey?: string };
				const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '') || '';
				
				const endpoint = '/api/contents/folders';
				const fullUrl = `${baseUrl}${endpoint}`;
				
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'obscreenApi', {
					method: 'GET',
					url: fullUrl,
					returnFullResponse: true,
				});
				
				const folders = Array.isArray(response.body) ? response.body : [];
				
				// Filter folders based on query if provided
				let filteredFolders = folders;
				if (query) {
					filteredFolders = folders.filter((folder: any) => 
						folder.name?.toLowerCase().includes(query.toLowerCase())
					);
				}
				
				// Format results for listSearch
				const results = filteredFolders.map((folder: any) => ({
					name: folder.name || `Folder ${folder.id}`,
					value: folder.id,
					description: folder.path || '',
					url: folder.url || '',
				}));
				
				return {
					results: results.slice(0, SEARCH_LIMIT),
				};
			},
			async searchSlides(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				const credentials = await this.getCredentials('obscreenApi') as { instanceUrl?: string; apiKey?: string };
				const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '') || '';
				
				const endpoint = '/api/slides';
				const fullUrl = `${baseUrl}${endpoint}`;
				
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'obscreenApi', {
					method: 'GET',
					url: fullUrl,
					returnFullResponse: true,
				});
				
				const slides = Array.isArray(response.body) ? response.body : [];
				
				// Filter slides based on query if provided (search by label)
				let filteredSlides = slides;
				if (query) {
					filteredSlides = slides.filter((slide: any) => 
						slide.label?.toLowerCase().includes(query.toLowerCase())
					);
				}
				
				// Format results for listSearch
				const results = filteredSlides.map((slide: any) => ({
					name: slide.label || `Slide ${slide.id}`,
					value: slide.id,
					description: slide.description || '',
					url: slide.url || '',
				}));
				
				return {
					results: results.slice(0, SEARCH_LIMIT),
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		
		const resource = this.getNodeParameter('resource', 0, 'contents') as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i, 'get') as string;

				let operationResult: INodeExecutionData[];

				switch (resource) {
					case 'contents':
						operationResult = await executeContentOperation.call(this, items[i], i, resource, operation);
						break;
					case 'contentFolders':
						operationResult = await executeContentFolderOperation.call(this, items[i], i, resource, operation);
						break;
					case 'playlists':
						operationResult = await executePlaylistOperation.call(this, items[i], i, resource, operation);
						break;
					case 'slides':
						operationResult = await executeSlideOperation.call(this, items[i], i, resource, operation);
						break;
					case 'process':
						operationResult = await executeProcessOperation.call(this, items[i], i, resource, operation);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported`);
				}

				// Add all results to returnData
				returnData.push(...operationResult);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: i,
					});
				} else {
					if (error.context) {
						error.context.itemIndex = i;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex: i,
					});
				}
			}
		}

		return [returnData];
	}
}
