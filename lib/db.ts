
const DB_NAME = 'iPodDB';
const DB_VERSION = 1;
const STORES = ['songs', 'videos', 'photos', 'j2me_apps'];

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(true);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as any).errorCode);
      reject(false);
    };

    request.onsuccess = (event) => {
      db = (event.target as any).result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as any).result;
      STORES.forEach(storeName => {
        if (!dbInstance.objectStoreNames.contains(storeName)) {
          dbInstance.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
};

export const addMedia = <T>(storeName: string, media: T): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        return reject("DB not initialized");
    }
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(media); // Use put to overwrite existing items with same id

    request.onsuccess = () => resolve(media);
    request.onerror = () => reject(request.error);
  });
};

export const getAllMedia = <T>(storeName: string): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        return reject("DB not initialized");
    }
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearStore = (storeName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
        return reject("DB not initialized");
    }
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};