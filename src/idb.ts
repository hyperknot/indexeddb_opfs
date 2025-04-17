import { type DBSchema, type IDBPDatabase, deleteDB as deleteDB_, openDB } from 'idb' // Import IDBPObjectStore if needed

// Define the database schema
interface FilesDB extends DBSchema {
  files: {
    key: string // Key is defined as string
    value: File
  }
}

// Database variables
let db: IDBPDatabase<FilesDB> | null = null
export const DB_NAME = 'filesDB_idb'
export const STORE_NAME = 'files'

export const BATCH_SIZE = 500

// Initialize IndexedDB
export async function initDB(): Promise<IDBPDatabase<FilesDB>> {
  db = await openDB<FilesDB>(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
        console.log('Object store created')
      }
    },
  })

  console.log('IndexedDB initialized successfully')
  return db
}

// Batch save files to IndexedDB using a single transaction for multiple files
export async function batchSaveToIndexedDB(files: Array<File>): Promise<void> {
  if (!db || files.length === 0) return

  const tx = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' })
  const store = tx.objectStore(STORE_NAME)

  // Add all files in one transaction
  for (const file of files) {
    const key = `file-${file.name}` // Creating string keys
    store.put(file, key)
  }

  // Wait for the transaction to complete
  await tx.done
}

// Get all keys from IndexedDB store
export async function getAllKeys(): Promise<Array<IDBValidKey>> {
  // Returns general type
  if (!db) return []
  return db.getAllKeys(STORE_NAME)
}

// Read files in batches using a single transaction per batch
export async function batchReadFromIndexedDB(
  keys: Array<IDBValidKey>, // Accepts general type
  batchSize: number,
): Promise<Array<File>> {
  // <-- Make return type more specific if possible (File)
  if (!db || keys.length === 0) return []

  const results: Array<File> = [] // <-- Use File[] if sure

  // Process keys in batches
  for (let i = 0; i < keys.length; i += batchSize) {
    const batchKeys = keys.slice(i, i + batchSize)

    // Read this batch in a single transaction
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    // Create promises for all get operations in this batch
    // Assert that the key is a string, matching the schema definition
    const getPromises = batchKeys.map((key) => {
      // Ensure key is a string before passing to get() which expects a string based on schema
      if (typeof key === 'string') {
        return store.get(key) // Now TS knows key is a string
      } else {
        // Handle unexpected key types if necessary, or return null/undefined promise
        console.warn(`Unexpected key type encountered: ${typeof key}`, key)
        return Promise.resolve(undefined) // Skip non-string keys
      }
    })

    // Wait for all get operations to complete
    const batchResults = await Promise.all(getPromises)

    // Filter out undefined/null results and add to our results array
    // Also assert the type is File if you are confident
    results.push(...batchResults.filter((result): result is File => !!result))

    // Wait for the transaction to complete
    await tx.done
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
export async function deleteDB(): Promise<void> {
  closeDB()
  await deleteDB_(DB_NAME)
}
