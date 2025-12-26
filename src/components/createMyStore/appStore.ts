
import createLocalStore from './createLocalStore'

export type AppState = {
    user: { name: string };
    count: number;
};

// Because we define our store at the top level of the file (Module Scope), 
// it lives in the browser's memory (the JavaScript Heap) independently of React.
// so it will as long as we dont kiil it by code or refresh 
// every time some react component will import it , he will receive the same instance 
export const appStore = createLocalStore<AppState>({
    user: { name: 'Architect' },
    count: 0,
});


//our selectors 
export const getUseName = (state: AppState) => state.user.name
export const getCount = (state) => state.count
