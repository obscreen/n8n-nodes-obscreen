import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Import actions from modular structure
import { contentOperations, contentParameters, executeContentOperation, contentCreateMappingColumns, contentUpdateMappingColumns, searchContents } from './actions/content/contents';
import { contentFolderOperations, contentFolderParameters, executeContentFolderOperation, searchFolders } from './actions/contentFolder/contentFolders';
import { playlistOperations, playlistParameters, executePlaylistOperation, playlistCreateMappingColumns, playlistUpdateMappingColumns, searchPlaylists } from './actions/playlist/playlists';
import { slideOperations, slideParameters, executeSlideOperation, slideCreateMappingColumns, slideUpdateMappingColumns, searchSlides } from './actions/slide/slides';
import { processOperations, processParameters, executeProcessOperation } from './actions/process/process';

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
			...contentFolderOperations,
			...playlistOperations,
			...slideOperations,
			...processOperations,
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
			searchPlaylists,
			searchContents,
			// searchContentTypes,
			searchSlides,
			searchFolders,
		},
		resourceMapping: {
			playlistCreateMappingColumns,
			playlistUpdateMappingColumns,
			slideCreateMappingColumns,
			slideUpdateMappingColumns,
			contentCreateMappingColumns,
			contentUpdateMappingColumns,
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
