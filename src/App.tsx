import './App.css'
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { BenchmarkCard } from './BenchmarkCard.tsx'
import { StoragePersistence } from './StoragePersistence' // Import the new component
import {
  type BenchmarkResult,
  benchmarkLoopOnly,
  benchmarkReadFromIndexedDB,
  benchmarkWriteToIndexedDB,
} from './benchmarks'
import { closeDB, deleteDB, initDB } from './indexeddb.ts' // Added deleteDB import

// Define types for file system entries and benchmark configurations
type FileSystemEntry = any // This would be more specific in a real app

interface BenchmarkConfig {
  id: string
  title: string
  runBenchmark: (entries?: Array<FileSystemEntry>) => Promise<BenchmarkResult>
}

function App() {
  // Define all benchmarks in a configuration array
  const benchmarks: Array<BenchmarkConfig> = [
    {
      id: 'loop',
      title: 'Loop Only',
      runBenchmark: (entries: Array<FileSystemEntry> = []) => benchmarkLoopOnly(entries),
    },
    {
      id: 'write',
      title: 'Write to IndexedDB',
      runBenchmark: (entries: Array<FileSystemEntry> = []) => benchmarkWriteToIndexedDB(entries),
    },
    {
      id: 'write-overwrite',
      title: 'Write to IndexedDB (overwrite)',
      runBenchmark: (entries: Array<FileSystemEntry> = []) => benchmarkWriteToIndexedDB(entries),
    },
    {
      id: 'read',
      title: 'Read from IndexedDB (Batched)',
      runBenchmark: () => benchmarkReadFromIndexedDB(),
    },
  ]

  const [isProcessing, setIsProcessing] = createSignal(false)
  const [results, setResults] = createSignal<Record<string, BenchmarkResult | null>>({
    loop: null,
    write: null,
    'write-overwrite': null,
    read: null,
  })

  // Initialize the database when the component mounts
  onMount(async () => {
    try {
      // Initialize the database
      await initDB()
    } catch (error) {
      console.error('Failed to initialize database:', error)
    }
  })

  // Close the database when the component unmounts
  onCleanup(() => {
    closeDB()
  })

  // Prevent default to allow drop
  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault()
  }

  // Handle the drop event
  const handleDrop = async (e: DragEvent): Promise<void> => {
    e.preventDefault()

    if (isProcessing()) return
    setIsProcessing(true)

    // Reset benchmark results
    setResults({
      loop: null,
      write: null,
      'write-overwrite': null,
      read: null,
    })

    try {
      if (!e.dataTransfer?.items) {
        return
      }

      const rootEntries: Array<FileSystemEntry> = []
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i] as any
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            rootEntries.push(entry)
          }
        }
      }
      for (const benchmark of benchmarks) {
        try {
          let result: BenchmarkResult

          console.log(`${benchmark.title} START`)
          if (benchmark.id === 'read') {
            // Read benchmark doesn't need entries
            result = await benchmark.runBenchmark()
          } else {
            // Other benchmarks need entries
            result = await benchmark.runBenchmark([...rootEntries])
          }
          console.log(`${benchmark.title} DONE`)

          // Update results after each benchmark for better UX
          setResults((prev) => ({
            ...prev,
            [benchmark.id]: result,
          }))
        } catch (error) {
          console.error(`Error running ${benchmark.title} benchmark:`, error)
        }
      }
    } catch (error) {
      console.error('Error during benchmarking:', error)
    } finally {
      try {
        await deleteDB() // Delete the database after benchmarks complete
      } catch (error) {
        console.error('Error deleting database:', error)
      }
      setIsProcessing(false)
    }
  }

  return (
    <div class="app-container">
      {/* Use the StoragePersistence component */}
      <StoragePersistence />

      <div
        class={`drop-zone ${isProcessing() ? 'drop-zone-active' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isProcessing() ? 'Processing...' : 'Drag and drop a directory here to benchmark'}
      </div>

      <div class="benchmark-container">
        <h2>Benchmark Results</h2>

        <div class="benchmark-results">
          <For each={benchmarks}>
            {(benchmark) => (
              <Show when={results()[benchmark.id]}>
                <BenchmarkCard title={benchmark.title} result={results()[benchmark.id]!} />
              </Show>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

export default App
