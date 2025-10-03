import {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ObscreenApi implements ICredentialType {
	name = 'obscreenApi';
	displayName = 'Obscreen API';
	icon: Icon = { light: 'file:obscreen.svg', dark: 'file:obscreen.svg', };
	// Uses the link to this tutorial as an example
	// Replace with your own docs links when building your own nodes
	documentationUrl = 'https://docs.obscreen.io/';
	properties: INodeProperties[] = [
		{
			displayName: 'Instance URL',
			name: 'instanceUrl',
			type: 'string',
			required: true,
			typeOptions: {
				url: true,
			},
			default: 'https://demo.obscreen.io',
			description: 'Your Obscreen instance URL. For Obscreen Cloud users use your domain (e.g. https://your_domain.obscreen.io)',
			placeholder: 'Enter your instance URL here.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
			description: 'Any Obscreen User API key. Get it from your Obscreen user account security settings.',
			placeholder: 'Enter your API key here',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{ $credentials?.apiKey }}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			skipSslCertificateValidation: true,
			method: 'GET',
			baseURL: '={{$credentials?.instanceUrl}}',
			url: '/api/playlists',
		},
	};
}