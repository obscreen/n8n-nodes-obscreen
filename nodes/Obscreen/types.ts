export interface ApiResponse<T> {
	success?: boolean;
	data?: T;
	error?: string;
}

export interface ContentOutput {
	folder_id?: number;
	id?: number;
	location?: string;
	name?: string;
	type?: string;
}

export interface Folder {
	folder_id?: number;
	name: string;
	path?: string;
}

export interface PlaylistOutput {
	enabled?: boolean;
	id?: string;
	loop_mode?: 'sequential' | 'timesync' | 'random';
	name: string;
}

export interface SlideOutput {
	content_id: number;
	cron_schedule?: string;
	cron_schedule_end?: string;
	delegate_duration?: boolean;
	duration: number;
	enabled?: boolean;
	id?: number;
	is_notification?: boolean;
	playlist_id: string;
	position: number;
}

export interface ProcessOutput {
	max_polling_interval?: number;
	status?: string;
}

export interface FileUploadResult {
	filename: string;
	success: boolean;
	contentId?: number;
	error?: string;
}

export interface BulkUploadResult {
	successful: number;
	failed: number;
	results: FileUploadResult[];
}
