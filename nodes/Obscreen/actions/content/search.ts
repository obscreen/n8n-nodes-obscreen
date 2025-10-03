import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

const SEARCH_LIMIT = 50;

export async function searchContents(
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
}