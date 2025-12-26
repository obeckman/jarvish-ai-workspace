import React from 'react'
import { renderCountStore, countSelector } from './RenderCountStore'
import './ComponentToRender.css'

 const ComponentToRender = () => {
    const { setState } = renderCountStore
    const [_, setCountClicks] = React.useState(1)

    setState((prev) => ({count: prev.count + 1}))

    return <span 
        className="count-store-component-to-render" 
        onClick={() => setCountClicks((old) => old + 1)}>
        Click to check our RenderCountStore
    </span>
}

const OutputComponent = () => {
    const { useSelector } = renderCountStore
    const count = useSelector(countSelector)
    return <div className='count-store-output-component'>
        RenderCountStore {count}
    </div>
}

export const CreateLocalStoreTester = () => {

    return (<div className='count-store-wrapper'>

        <ComponentToRender />
        <ComponentToRender />
        <OutputComponent />
    </div>)
}