export interface UseResilientFetchProps<T> {
    url: string;
    method: string;
    data: T;
    options: ResilientSettings;
}

export interface ResilientSettings {
    maxRetryCount: number;
    initialRetryDelay: number;
    incrementedDelay: number;
}

