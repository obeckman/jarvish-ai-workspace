import { useState, useEffect, useRef } from 'react';

// 1. The Store Factory (Pure JS - No React/ redux dependencies here)
// This establishes the "Single Source of Truth" outside the component tree.
export default function createLocalStore<T>(initialState: T) {
    let currentState = initialState; // our state is just a pointer to an object that keep mutating 
    const listeners = new Set<(state: T) => void>();

    // A. Dispatch Pattern: Mutate state via structural sharing (immutability)
    const setState = (fn: (state: T) => Partial<T>) => {
        const changes = fn(currentState);

        // Buzzword: Structural Sharing
        // We create a new object reference only if data changes, copying unchanged references.
        currentState = { ...currentState, ...changes };

        // Notify all subscribers
        listeners.forEach((listener) => listener(currentState));
    };

    const subscribe = (listener: (state: T) => void) => {
        listeners.add(listener);
        // Cleanup function for useEffect/useSyncExternalStore
        return () => { listeners.delete(listener) };
    };

    const getState = () => currentState;

    //we return a Custom Hook here, that has acsses to our store  ,  
    //use the "Hook Factory" Pattern 
    // Instead of passing the store to the hook (via arguments or Context), we embed the store into the hook.
    // This is the bridge between our "External Store" and React's Render Cycle.
    // we return a costume hook that is typed to our T state
    // and can use hooks ,effects and so on and have access to the store and listeners
    // we are scoped to the current const {setState, useSelector, getState} = createStore(...)
    const useSelector = <Output>(
        selector: (state: T) => Output
    ): Output => {
        // 2. Ref Pattern to avoid Effect Re-running
        // We store the selector in a Ref so we can access the latest version 
        // inside the listener without forcing the useEffect to unbind/rebind 
        // every time the component passes a new inline arrow function.
        const selectorRef = useRef(selector);
        useEffect(() => {
            //run on every render to keep updated selector 
            selectorRef.current = selector;
        });

        // each useSelector keep its oun state , if this is updated then the component get fresh data
        // We use a lazy initializer to grab the initial value only once on mount.
        const [currentSelectorState, setCurrentSelectorState] = useState(() => selector(getState()));



        // 3. The Subscription Effect
        // we trigger this once for every new usege of useSelector(...) , on mount !
        useEffect(() => {

            const checkForUpdates = (globalState: T) => {
                //this is the callback we attach to our listeners Set, it will be called on every setState
                // Use the ref to get the *latest* selector logic
                const newSelectorState = selectorRef.current(globalState);

                // 4. Manual Referential Integrity Check
                // We pass a functional update to setState to compare against the 
                // current React state. If they are the same (===), React bails out.
                setCurrentSelectorState((oldSelectorState) => {
                    if (newSelectorState === oldSelectorState) {
                        return oldSelectorState; // No re-render
                    }
                    return newSelectorState; // Trigger re-render
                });
            };

            // subscribe returns the cleanup function (unsubscribe)
            const unsubscribe = subscribe(checkForUpdates);

            // Safety check: State might have changed between render and effect mount
            checkForUpdates(getState());

            return unsubscribe;
        }, []);

        return currentSelectorState;
    };

    return { setState, useSelector, getState };
}


