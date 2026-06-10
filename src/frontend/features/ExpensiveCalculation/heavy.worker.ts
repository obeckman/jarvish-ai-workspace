/// <reference lib="webworker" />
import { WorkerRequest, CustomWorkerScope } from './types'

// 1. Import your actual heavy logic here. 
// (The worker must have access to the code at build time)
import { myExpensiveFunction } from './heavyLogic';


// 2. Define the expected types for THIS specific worker
// (Or import them if they are shared)
type ExpectedData = Parameters<typeof myExpensiveFunction>[0];


const webWorker = self as unknown as CustomWorkerScope;

webWorker.addEventListener('message', (event: MessageEvent<WorkerRequest<ExpectedData>>) => {
  const { type, payload } = event.data;

  switch (type) {
    case ('CALCULATE'):
      try {
        // 3. Run the logic HERE, not passed from the main thread
        const result = myExpensiveFunction(payload);

        webWorker.postMessage({
          type: 'SUCCESS',
          payload: result
        });
        break;

      } catch (error) {
        webWorker.postMessage({
          type: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown Worker Error'
        });
        break;
      }
    default: {
      // do some logic 
      webWorker.postMessage({ type: 'SUCCESS', payload: 'SUCCESS' })
    }

  }
});
