import {SubmitResponse, SubmitFunctionMap} from './types';

export const submitFunctionForDemo = <T>(data: T) => {
                const promise = new Promise<SubmitResponse>((resolve, reject) => {
                    setTimeout(() => {
                        
                        const willSucceed = Math.random() > 0.9
                        if (willSucceed) {
                            console.log('Simulated submit success.');
                            resolve({ success: true });
                        }
                        else {
                            console.log('Simulated submit failure.');
                            reject(new Error('Submission failed'));
                        }
                    }, 1000);
                });
                return promise;
            }

export const SubmitFunctionTypes = {
    submitFunctionForDemo: 'submitFunctionForDemo',
} as const;

export const submitFunctionMap  = { 
     submitFunctionForDemo,
     
} as const ; 
export type SubmitFunctionKey = keyof typeof SubmitFunctionTypes;
export type SubmitFunctionValue = typeof submitFunctionMap[SubmitFunctionKey];

export const  isKeyofSubmitFunction = (key: string): key is SubmitFunctionKey => {
    return key in SubmitFunctionTypes;
}
