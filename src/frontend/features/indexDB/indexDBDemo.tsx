import React from 'react';
import { clientLogger } from '@/frontend/utils/clientLogger';
import { useDBStore, useDBSubscription, DBProvider } from './indexDB';
import { UserProfile } from './types';

const STORE_NAME = 'users';

const EMAIL_INDEX= 'emailIndex'

export const UserListContainer = () => {
  //const {store} = useDBStore({storeName: STORE_NAME, mode: 'readonly'});
  const { getPaginatedData, getDataByIndex } = useDBStore({ storeName: STORE_NAME });
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [cursor, setCursor] = React.useState<any>(null);
  const cursorRef = React.useRef(cursor)
  const [foundUser, setFoundUser] = React.useState<UserProfile |null>(null)

  const getUserByEmail = React.useCallback(async (email: string) => {
    clientLogger.debug('@@@ getUserByEmail', email)
    // Using the Index we created earlier - O(log n) lookup vs O(n) scan
    const foundUser = await getDataByIndex<UserProfile>(EMAIL_INDEX, email)
    clientLogger.debug('@@@ getUserByEmail foundUser', foundUser)
    setFoundUser(foundUser)
  }, [getDataByIndex])

  // Memoized fetcher to prevent infinite loops
  const fetchData = React.useCallback(async (isRefresh = false) => {
    const { items = [], nextCursor } = await getPaginatedData<UserProfile>(
      20,
      isRefresh ? null : cursorRef.current
    );

    setUsers(prev => isRefresh ? (items) : [...prev, ...items]);
    cursorRef.current = nextCursor
    setCursor(nextCursor);
  }, [getPaginatedData]);

  // Use our BroadcastChannel hook to listen for changes from other tabs
  // When a 'users' update is broadcast, we refresh the first page
  useDBSubscription(STORE_NAME, () => fetchData(true));

  React.useEffect(()=> {
    fetchData()
  },[fetchData])

  return (
    <div>
      {foundUser && <div>{JSON.stringify(foundUser) }</div>}
      {users.map(u => <div key={u.id} onClick={()=>getUserByEmail(u.email)}>{u.email}</div>)}
      {cursor && <button onClick={() => fetchData()}>Load More</button>}
    </div>
  );
};

const defaultUser = 
  {
    id: "baseId",
    email: 'some@email.com',
    lastLogin: 0,
    syncStatus:  "pending"
}


export const IndexDBUsers = () => {
  const { putData } = useDBStore({ storeName: STORE_NAME });
  const [userCount, setUserCount] = React.useState(0)

  const onAddUser = async () => {
    try {
    const user = {
      ...defaultUser,
      id: defaultUser.id + userCount,
      email: userCount+ defaultUser.email
    }
    
    const response = await putData<UserProfile>(user)
    setUserCount(old => old+1)
    clientLogger.debug("updated user", { user, response })
  } catch (e) {
    console.error(e)
  }

  } 
  return <>
    IndexDBDemo - users 
    
    <button onClick={onAddUser} >add user</button>
    <UserListContainer/>
    
  </>
}

export const IndexDBDemo = () => {

  return <DBProvider initDBOptions={{
          storeName:"users",  
          dbName:'MY-React-index-DB',
          createIndexArray: [{name: EMAIL_INDEX, keyPath:'email'}],
          dbVersion: 1
          }}>
            <IndexDBUsers/>
          </DBProvider>
}
