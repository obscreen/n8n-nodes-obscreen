import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

const SEARCH_LIMIT = 50;

export async function searchSlides(
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
}