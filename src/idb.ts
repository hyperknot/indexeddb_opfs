// Database variables
let db: IDBDatabase | null = null
export const DB_NAME = 'filesDB'
export const STORE_NAME = 'files'

export const BATCH_SIZE = 500

// Initialize IndexedDB
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onerror = (event) => {
      console.error('IndexedDB error:', event)
      reject('IndexedDB error')
    }

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result
      console.log('IndexedDB initialized successfully')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
        console.log('Object store created')
      }
    }
  })
}

// Batch save files to IndexedDB using a single transaction for multiple files
export async function batchSaveToIndexedDB(files: Array<File>): Promise<void> {
  if (!db || files.length === 0) return

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readwrite', { durability: 'strict' })
    const store = transaction.objectStore(STORE_NAME)

    transaction.oncomplete = () => resolve()
    transaction.onerror = (event) => {
      console.error('Transaction error:', event)
      reject(event)
    }

    // Add all files in one transaction
    for (const file of files) {
      const key = `file-${file.name}`
      store.put(file, key)
    }
  })
}

// Get all keys from IndexedDB store
export async function getAllKeys(): Promise<Array<IDBValidKey>> {
  if (!db) return []

  return new Promise<Array<IDBValidKey>>((resolve, reject) => {
    const transaction = db!.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAllKeys()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error('Error getting keys:', event)
      reject(event)
    }
  })
}

// Read files in batches using a single transaction per batch
export async function batchReadFromIndexedDB(
  keys: Array<IDBValidKey>,
  batchSize: number,
): Promise<Array<any>> {
  if (!db || keys.length === 0) return []

  const results: Array<any> = []

  // Process keys in batches
  for (let i = 0; i < keys.length; i += batchSize) {
    const batchKeys = keys.slice(i, i + batchSize)

    // Read this batch in a single transaction
    const batchResults = await new Promise<Array<any>>((resolve, reject) => {
      const transaction = db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const batchData: Array<any> = []

      transaction.oncomplete = () => {
        resolve(batchData)
      }

      transaction.onerror = (event) => {
        console.error('Error reading batch:', event)
        reject(event)
      }

      // Request each key in the same transaction
      batchKeys.forEach((key) => {
        const request = store.get(key)

        request.onsuccess = () => {
          if (request.result) {
            batchData.push(request.result)
          }
        }
      })
    })

    results.push(...batchResults)
  }

  return results
}

// Close the database connection
export function closeDB(): void {
  if (db) {
    db.close()
    db = null
  }
}

// Delete the database
export function deleteDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    closeDB()
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = (event) => reject(event)
  })
}
