import { getFileFromEntry, readDirectoryEntries } from './files.ts'
import {
  BATCH_SIZE as IDB_BATCH_SIZE,
  batchReadFromIDB,
  batchSaveToIDB,
  getAllKeys as getAllKeysFromIDB,
} from './idb.ts'
import {
  BATCH_SIZE as INDEXEDDB_BATCH_SIZE,
  batchReadFromIndexedDB,
  batchSaveToIndexedDB,
  getAllKeys as getAllKeysFromIndexedDB,
} from './indexeddb.ts'

// Type for storing benchmark results
export type BenchmarkResult = {
  startTime: number
  endTime: number
  duration: number
  fileCount: number
  totalSize: number
  errorCount: number
  dirCount: number
  implementation?: string // Added to track which implementation was used
}

// Benchmark just looping through files - unchanged
export async function benchmarkLoopOnly(entries: Array<any>): Promise<BenchmarkResult> {
  const benchmark: BenchmarkResult = {
    startTime: performance.now(),
    endTime: 0,
    duration: 0,
    fileCount: 0,
    totalSize: 0,
    errorCount: 0,
    dirCount: 0,
  }

  // Rest of the function remains unchanged
  try {
    const queue = [...entries]

    while (queue.length > 0) {
      const entry = queue.shift()

      if (entry.isFile) {
        try {
          const file = await getFileFromEntry(entry)
          benchmark.fileCount++
          benchmark.totalSize += file.size
        } catch (error) {
          console.error(`Error processing file: ${error}`)
          benchmark.errorCount++
        }
      } else if (entry.isDirectory) {
        try {
          benchmark.dirCount++
          const dirEntries = await readDirectoryEntries(entry)
          queue.push(...dirEntries)
        } catch (error) {
          console.error(`Error reading directory: ${error}`)
          benchmark.errorCount++
        }
      }
    }
  } finally {
    benchmark.endTime = performance.now()
    benchmark.duration = benchmark.endTime - benchmark.startTime
  }

  return benchmark
}

// Modified to accept implementation parameter
export async function benchmarkWriteToIndexedDB(
  entries: Array<any>,
  useIDB = false,
): Promise<BenchmarkResult> {
  const benchmark: BenchmarkResult = {
    startTime: performance.now(),
    endTime: 0,
    duration: 0,
    fileCount: 0,
    totalSize: 0,
    errorCount: 0,
    dirCount: 0,
    implementation: useIDB ? 'IDB' : 'IndexedDB',
  }

  try {
    const queue = [...entries]
    const batchSize = useIDB ? IDB_BATCH_SIZE : INDEXEDDB_BATCH_SIZE
    let currentBatch: Array<File> = []

    while (queue.length > 0) {
      const entry = queue.shift()

      if (entry.isFile) {
        try {
          const file = await getFileFromEntry(entry)
          benchmark.fileCount++
          benchmark.totalSize += file.size

          currentBatch.push(file)

          // Process batch when it reaches the target size
          if (currentBatch.length >= batchSize) {
            if (useIDB) {
              await batchSaveToIDB(currentBatch)
            } else {
              await batchSaveToIndexedDB(currentBatch)
            }
            currentBatch = []
          }
        } catch (error) {
          console.error(`Error processing file: ${error}`)
          benchmark.errorCount++
        }
      } else if (entry.isDirectory) {
        try {
          benchmark.dirCount++
          const dirEntries = await readDirectoryEntries(entry)
          queue.push(...dirEntries)
        } catch (error) {
          console.error(`Error reading directory: ${error}`)
          benchmark.errorCount++
        }
      }
    }

    // Save any remaining files in the last batch
    if (currentBatch.length > 0) {
      if (useIDB) {
        await batchSaveToIDB(currentBatch)
      } else {
        await batchSaveToIndexedDB(currentBatch)
      }
    }
  } finally {
    benchmark.endTime = performance.now()
    benchmark.duration = benchmark.endTime - benchmark.startTime
  }

  return benchmark
}

// Modified to accept implementation parameter
export async function benchmarkReadFromIndexedDB(useIDB = false): Promise<BenchmarkResult> {
  const benchmark: BenchmarkResult = {
    startTime: performance.now(),
    endTime: 0,
    duration: 0,
    fileCount: 0,
    totalSize: 0,
    errorCount: 0,
    dirCount: 0,
    implementation: useIDB ? 'IDB' : 'IndexedDB',
  }

  try {
    // Get all keys from the appropriate store
    const keys = useIDB ? await getAllKeysFromIDB() : await getAllKeysFromIndexedDB()

    // Read files in batches using the appropriate method
    const files = useIDB
      ? await batchReadFromIDB(keys, IDB_BATCH_SIZE)
      : await batchReadFromIndexedDB(keys, INDEXEDDB_BATCH_SIZE)

    // Count files and total size
    for (const file of files) {
      if (file && file.size !== undefined) {
        benchmark.fileCount++
        benchmark.totalSize += file.size
      }
    }
  } catch (error) {
    console.error('Error during read benchmark:', error)
    benchmark.errorCount++
  } finally {
    benchmark.endTime = performance.now()
    benchmark.duration = benchmark.endTime - benchmark.startTime
  }

  return benchmark
}
