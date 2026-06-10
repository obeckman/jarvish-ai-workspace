import CreateLocalStore from './CreateLocalStore'

const initialValue = {
    count: 0
}

export type StateType = //typeof initialValue
{
    count: number
}
export const renderCountStore = CreateLocalStore<StateType>(initialValue)


export const countSelector = (state: StateType)=> state.count