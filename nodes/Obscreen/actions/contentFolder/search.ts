import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

const SEARCH_LIMIT = 50;

export async function searchFolders(
	this: ILoadOptionsFunctions,
	query?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('obscreenApi') as { instanceUrl?: string; apiKey?: string };
	const baseUrl = credentials?.instanceUrl?.replace(/\/$/, '') || '';

	const endpoint = '/api/contents-folders/';
	const fullUrl = `${baseUrl}${endpoint}`;

	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'obscreenApi', {
		method: 'GET',
		url: fullUrl,
		returnFullResponse: true,
	});

	const folders = Array.isArray(response.body) ? response.body : [];

	let filteredFolders = folders;
	if (query) {
		filteredFolders = folders.filter((folder: any) =>
			folder.name?.toLowerCase().includes(query.toLowerCase())
		);
	}

	const results = filteredFolders.map((folder: any) => ({
		name: folder.name || `Folder ${folder.id}`,
		value: folder.id,
		description: folder.description || '',
	}));

	return {
		results: results.slice(0, SEARCH_LIMIT),
	};
}