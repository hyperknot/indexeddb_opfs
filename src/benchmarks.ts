import { getFileFromEntry, readDirectoryEntries } from './files.ts'
import {
  BATCH_SIZE,
  batchReadFromIndexedDB,
  batchSaveToIndexedDB,
  getAllKeys,


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
}

// Benchmark just looping through files
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

  try {
    // Process entries
    const queue = [...entries]

    while (queue.length > 0) {
      const entry = queue.shift()

      if (entry.isFile) {
        try {
          // Get the file object
          const file = await getFileFromEntry(entry)

          // Update benchmark data
          benchmark.fileCount++
          benchmark.totalSize += file.size
        } catch (error) {
          console.error(`Error processing file: ${error}`)
          benchmark.errorCount++
        }
      } else if (entry.isDirectory) {
        try {
          benchmark.dirCount++
          // Read directory entries
          const dirEntries = await readDirectoryEntries(entry)

          // Add entries to the queue
          queue.push(...dirEntries)
        } catch (error) {
          console.error(`Error reading directory: ${error}`)
          benchmark.errorCount++
        }
      }
    }
  } finally {
    // Complete benchmark
    benchmark.endTime = performance.now()
    benchmark.duration = benchmark.endTime - benchmark.startTime
    return benchmark
  }
}

// Optimized benchmark writing to IndexedDB with batching
export async function benchmarkWriteToIndexedDB(entries: Array<any>): Promise<BenchmarkResult> {
  const benchmark: BenchmarkResult = {
    startTime: performance.now(),
    endTime: 0,
    duration: 0,
    fileCount: 0,
    totalSize: 0,
    errorCount: 0,
    dirCount: 0,
  }

  try {
    const queue = [...entries]

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
          if (currentBatch.length >= BATCH_SIZE) {
            await batchSaveToIndexedDB(currentBatch)
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
      await batchSaveToIndexedDB(currentBatch)
    }
  } finally {
    benchmark.endTime = performance.now()
    benchmark.duration = benchmark.endTime - benchmark.startTime
    return benchmark
  }
}

// Benchmark reading all files from IndexedDB in batches
export async function benchmarkReadFromIndexedDB(): Promise<BenchmarkResult> {
  const benchmark: BenchmarkResult = {
    startTime: performance.now(),
    endTime: 0,
    duration: 0,
    fileCount: 0,
    totalSize: 0,
    errorCount: 0,
    dirCount: 0,
  }

  try {
    // Get all keys from the store
    const keys = await getAllKeys()

    // Read files in batches
    const files = await batchReadFromIndexedDB(keys, BATCH_SIZE)

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
    // Complete benchmark
    benchmark.endTime = performance.now()
    benchmark.duration = benchmark.endTime - benchmark.startTime
    return benchmark
  }
}
