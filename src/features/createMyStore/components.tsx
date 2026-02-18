
import React from 'react'
import { appStore, getUseName, getCount } from './appStore'
// COMPONENT 1: Consumes User Only
export const UserDisplay = () => {
    const { useSelector } = appStore
    const userName = useSelector(getUseName);

    console.log('Render: UserDisplay');
    return <div>User: {userName} </div>;
};

// COMPONENT 2: Consumes Count Only
export const CounterDisplay = () => {
    const { useSelector, setState } = appStore
    const count = useSelector(getCount);

    const onClick = React.useCallback(() => setState((currentState) => ({ count: currentState.count + 1 })), [setState])

    console.log('Render: CounterDisplay');
    return (
        <div>
            Count: {count}
            <button onClick={onClick}>
                Increment
            </button>
        </div>
    );
};
