import React from 'react'


export const CreateLocalStore = <T>(initialState: T) => {
    let storedState = initialState

    const attachedSelectors = new Set<(currentState: T) => void>()

    const attachSelectorToStore = (listener: (currentState: T) => void) => {
        attachedSelectors.add(listener)
        return () => { attachedSelectors.delete(listener) }
    }

    const getState = () => storedState

    const setState = (action: (currentState: T) => Partial<T>) => {
        const newState = action(storedState)
        storedState = { ...storedState, ...newState };
        attachedSelectors.forEach(listener => listener(storedState))
    }

    const useSelector = <Output>(selector: (state: T) => Output) => {
        const selectorRef = React.useRef(selector)

        React.useEffect(() => {
            selectorRef.current = selector
        }, [selector])

        const [selectorResult, setSelectorResult] = React.useState(selector(storedState))

        React.useEffect(() => {
            const removeFromListeners = attachSelectorToStore(
                (currentState: T) => {
                    setSelectorResult(selectorRef.current(currentState))
                }
            )
            return removeFromListeners
        }, [])

        return selectorResult
    }
    return { useSelector, getState, setState }
}

export default CreateLocalStore