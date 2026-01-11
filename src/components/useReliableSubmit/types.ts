import { SubmitFunctionTypes, SubmitFunctionKey } from "./submitFunctions";

export interface SubmitResponse  {
    success: boolean;
}
export interface useReliableSubmitProps<T>{
    submitFunctionType: SubmitFunctionKey;
    initialData: T;
    //storeIdentifier?: string;
}

export type SubmitFn = <T>(data: T) => Promise<SubmitResponse>;

export type SubmitFunctionMap = Record<string, SubmitFn>;

export type SubmitParameterType<T> = {
    submitFunctionType: SubmitFunctionKey;
    data: T;
    tryCount?: number;
}
export interface ReliableSubmitManagerContextProps {
    getItemFromStorage: <T>(key: string) => T | null;
    submit: <T>(params: SubmitParameterType<T>) => void;
}