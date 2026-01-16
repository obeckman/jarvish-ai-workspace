// db.ts - The Data Access Layer (DAL)
import React from 'react';
import { initDBOptions, IndexDbNotifyMessage } from './types';


const DB_NAME = 'PlayGround-AppDatabase';
const STORE_NAME = 'PlayGround-AppStore';
const DB_VERSION = 1;


const DBContext = React.createContext<IDBDatabase | null>(null);

export const DBProvider = ({ initDBOptions, children }: {
  initDBOptions: initDBOptions, children: React.ReactNode
}) => {
  const [db, setDb] = React.useState<IDBDatabase | null>(null);

  const initDB = ({
    storeName = STORE_NAME,
    dbName = DB_NAME,
    dbVersion = DB_VERSION,
    createObjectStoreOptions = {autoIncrement: true, keyPath: 'id' },// keyPath: 'id' acts as our primary key
    createIndexArray = []
  }: initDBOptions): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      // Schema migrations happen here. Critical for "Versioning" strategies.
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        let store: IDBObjectStore;

        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, createObjectStoreOptions);
        } else {

          store = (event.target as IDBOpenDBRequest).transaction!.objectStore(storeName);
        }

        // 2. Sync Indexes: Add ones that don't exist, (Optional) delete ones no longer in config
        createIndexArray.forEach(({ name, keyPath, options }) => {
          if (!store.indexNames.contains(name)) {
            store.createIndex(name, keyPath, options);
          }
        });



      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        alert("Please close other tabs running this app to allow the database to update.");
      };
    });
  };

  React.useEffect(() => {
    initDB(initDBOptions).then(setDb).catch(console.error);
  }, [initDBOptions]);

  return <DBContext.Provider value={db}>{db && children}</DBContext.Provider>;
};

const channel = new BroadcastChannel('db_sync_layer');
const INNER_TAB_MESSAGE_IDENTIFIER = "indexdb_internal_update"

export const useDBSubscription = (storeName: string, onUpdate?: () => void) => {
  React.useEffect(() => {
    const handleMessage = (payload: IndexDbNotifyMessage) => {
      // Best Practice: Filter by storeName to avoid unnecessary re-renders
      if (payload.storeName === storeName) {
        if (onUpdate) {
          console.debug(`[Sync] Update detected for ${storeName}, re-fetching...`);
          onUpdate();
        } else {
          console.debug(`[Sync] Update detected for ${storeName}, ignored...`);
        }
      }
    };

    // Listener for other tabs
    const handleBroadcast = (event: MessageEvent) => handleMessage(event.data);
    channel.addEventListener('message', handleBroadcast);
    // Listener for this tab
    const handleInternal = (event: any) => handleMessage(event.detail);
    window.addEventListener(INNER_TAB_MESSAGE_IDENTIFIER, handleInternal)

    return () => {
      channel.removeEventListener('message', handleBroadcast);
      window.removeEventListener(INNER_TAB_MESSAGE_IDENTIFIER, handleInternal)
    };
  }, [storeName, onUpdate]);
};


// Helper to broadcast an update
const notifyUpdate = (storeName: string) => {
  const payload = { storeName, timestamp: Date.now() }
  channel.postMessage(payload);
  window.dispatchEvent(new CustomEvent(INNER_TAB_MESSAGE_IDENTIFIER, { detail: payload }));
};

interface useDBStoreProps {
  storeName?: string,
  onUpdate?: () => void
}
export const useDBStore = ({
  storeName = STORE_NAME,
  onUpdate
  //mode = 'readonly'
}: useDBStoreProps) => {
  const db = React.useContext(DBContext);
  if (!db) {
    throw new Error("DB not initialized");
  }

  useDBSubscription(storeName, onUpdate)

  const getDataByIndex = React.useCallback(<T,>(indexName: string, indexValue: IDBKeyRange | IDBValidKey) => {
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(indexValue);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    })
  }, [storeName])

  const putData = React.useCallback(<T,>(data: T) => {

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const request = store.put(data);

      request.onsuccess = () => {
        notifyUpdate(storeName)
        resolve(request.result)
      };
      request.onerror = () => reject(request.error);
    });

  }, [storeName])

  const getPaginatedData = React.useCallback(async <T,>(
    pageSize: number,
    lastSeenKey: IDBValidKey | null = null
  ) => {
    return new Promise<{ items: T[], nextCursor: IDBValidKey | null }>((resolve, reject) => {
      const items: T[] = [];

      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      // If we have a lastSeenKey, we start the cursor from there (Exclusive)
      // IDBKeyRange allows us to define the "window" of our query
      const bound = lastSeenKey ? IDBKeyRange.lowerBound(lastSeenKey, true) : null;
      const request = store.openCursor(bound);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        // Optimization: Stop once we hit the page limit
        if (cursor && items.length < pageSize) {
          items.push(cursor.value);
          cursor.continue(); // Move to the next record
        } else {
          // We've filled our page or reached the end
          resolve({
            items,
            nextCursor: cursor ? cursor.key : null
          });
        }
      };

      request.onerror = () => reject(request.error);
    })
  }, [storeName])

  return { getDataByIndex, putData, getPaginatedData };
}




