

import React from 'react'
type ProxyListener =  () => void
type ListenersMap = Map<string | symbol, Set<ProxyListener>>;


type Proxied<T> = T & {
  readonly proxyListeners: ListenersMap;
};

type AnyObject = {
  [key: string| symbol]: any;
};

export function proxy<T extends object>(initialValue: T): T {
  const listeners = new Map<string | symbol,ProxyListener[]>();
  return new Proxy(initialValue as T & AnyObject, {
    get: (target, key, reciver) => {
      if (key === "proxyListeners") return listeners;
      return Reflect.get(target, key, reciver);
    },
    set: (target, key, value, handler) => {
      const oldValue = target[key];
      const rv = Reflect.set(target, key, value, handler);

      if (oldValue !== value && listeners.has(key)) {
        listeners.get(key)?.forEach((proxyListener) => proxyListener());
      }
      return rv;
    }
  });
}

export function useSnapshot<T extends object>(proxyObj: T): T {
  const proxy = proxyObj as Proxied<T>;
  const proxyRef = React.useRef(proxy)
  const snapshotKeysOnListeners = React.useRef( new Set<string| symbol>())
  const [_, forceNewState] = React.useState(0)
  const forceNewStateCallback = React.useCallback(()=>forceNewState(state=> state+1),[])
  const keysUsedDuringRender = React.useRef( new Set<string| symbol>())
  React.useEffect(()=>{
    keysUsedDuringRender.current.clear()
  })
  
  React.useLayoutEffect(()=>{
    const proxyListeners = proxyRef.current.proxyListeners
    const subscribedKeys = snapshotKeysOnListeners.current
    subscribedKeys.forEach((key)=>{
      proxyListeners.get(key)?.delete(forceNewStateCallback)
    })
    subscribedKeys.clear()
    keysUsedDuringRender.current.forEach((key)=>{
      subscribedKeys.add(key)  
      if(!proxyListeners.has(key)){
          proxyListeners.set(key,new Set())
      }
      proxyListeners.get(key)?.add(forceNewStateCallback)
    })
    return ()=> {
      subscribedKeys.forEach((key)=> {
      
        proxyListeners.get(key)?.delete(forceNewStateCallback)
      
     })
    }
  })

  
  return new Proxy(proxy, {
    get:(target,key)=>{
      // if(!target.proxyListeners.has(key)){
      //     target.proxyListeners.set(key,new Set())
      // }
      // if(!snapshotKeysOnListeners.current.has(key)){
      //   snapshotKeysOnListeners.current.add(key)
      //   target?.proxyListeners.get(key)?.add(forceNewStateCallback)
      // }
      keysUsedDuringRender.current.add(key)
      return Reflect.get(target,key)
    }
 
  })
}





// to try your code on the right panel
// export App() component like below
const state = proxy({ count: 0, text: 'hello' })
export function App() {
  const snap = useSnapshot(state)
  return (
    <div>
      {snap.count}
      <button onClick={() => ++state.count}>
        +1
      </button>
    </div>
  )
  
}
setInterval(() => {
  ++state.count
}, 1000)



