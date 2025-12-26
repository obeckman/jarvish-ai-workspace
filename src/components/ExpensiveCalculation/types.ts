export type WorkerRequest<T> = {
    type: 'CALCULATE';
    payload: T;
};

export type WorkerResponseError = { type: 'ERROR'; error: string }
export type WorkerResponse<T> =
    | { type: 'SUCCESS'; payload: T }
    | WorkerResponseError;


export interface CustomWorkerScope extends DedicatedWorkerGlobalScope {
    // Override postMessage to strict accept ONLY your WorkerResponse
    postMessage(message: WorkerResponse<any>): void;
}
