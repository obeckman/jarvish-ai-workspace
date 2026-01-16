export type UserProfile = {
  id: string;
  email: string;
  lastLogin: number;
  syncStatus: string;
};

export interface initDBOptions {
    storeName: string, 
    dbName: string, 
    dbVersion?: number, 
    createObjectStoreOptions?: IDBObjectStoreParameters,
    createIndexArray?: {name: string, keyPath: string | string[], options?: IDBIndexParameters}[]
}
   
export interface PaginationResult<T> {
  items: T[];
  nextCursor: any | null; // The key to start from for the next page
}

export type IndexDbNotifyMessage = {storeName: string, timestamp: number}