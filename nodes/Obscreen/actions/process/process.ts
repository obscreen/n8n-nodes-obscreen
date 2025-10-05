import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { executeApiRequest } from '../../utils';

export const processOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['process'],
			},
		},
		options: [
			{
				name: 'Refresh Player',
				value: 'refreshPlayer',
				description: 'Refresh player to apply changes',
				action: 'Refresh player',
			},
		],
		default: 'refreshPlayer',
	}
];

export const processParameters: INodeProperties[] = [];

export async function executeProcessOperation(
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
				refreshPlayer: refreshPlayer.bind(this),
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

async function refreshPlayer(
	this: IExecuteFunctions,
	itemIndex: number,
	resource: string,
	operation: string
): Promise<any> {
	const endpoint = '/api/processes/player-refresh';
	const response = await executeApiRequest.call(this, 'POST', endpoint);

	return response;
}
