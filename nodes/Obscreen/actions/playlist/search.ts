import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

const SEARCH_LIMIT = 50;

export async function searchPlaylists(
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
}