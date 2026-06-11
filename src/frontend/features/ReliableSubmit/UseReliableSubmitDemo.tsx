import React from 'react';
import { clientLogger } from '@/frontend/utils/clientLogger';
import './useReliableSubmit.css';
import {useReliableSubmit} from './useReliableSubmit';
import {SubmitFunctionTypes} from './submitFunctions';

const someData = { key: 'value', submitCount: 0 };

export const UseReliableSubmitDemo = () => {
    
    const { reliableSubmit, storedData } = useReliableSubmit<typeof someData>(
        {
            submitFunctionType: SubmitFunctionTypes.submitFunctionForDemo, 
            initialData: someData
        }
    );

    const onClick= React.useCallback(
        () => {
            clientLogger.debug('Submitting data reliably...');
            if(storedData){
                const updatedData = { ...storedData, submitCount: (storedData?.submitCount ?? 0) + 1 };
                reliableSubmit(updatedData);
            }
        }, [reliableSubmit, storedData]
    );

    return <div className="useReliableSubmit-demo">
        <button onClick={onClick}>Submit Reliably - storedData: {JSON.stringify(storedData)}</button>
    </div>

}
