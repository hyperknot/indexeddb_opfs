import './App.css'
import { For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { BenchmarkCard } from './BenchmarkCard.tsx'
import {
  type BenchmarkResult,
  benchmarkLoopOnly,
  benchmarkReadFromIndexedDB,
  benchmarkWriteToIndexedDB,
} from './benchmarks'
import { closeDB, deleteDB, initDB } from './idb' // Added deleteDB import

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

  // Add a signal to track storage persistence status
  const [isPersistent, setIsPersistent] = createSignal<boolean | null>(null)

  // Initialize the database when the component mounts
  onMount(async () => {})

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

    try {
      // Check if StorageManager API is supported
      if (navigator.storage?.persist) {
        // First check if storage is already persistent
        const alreadyPersisted = await navigator.storage.persisted()

        if (alreadyPersisted) {
          // Storage is already persistent
          setIsPersistent(true)
          console.log('Storage is already persistent')
        } else {
          // Request notification permission first to improve chance of getting persistence
          console.log('Requesting notification permission...')
          const notificationPermission = await Notification.requestPermission()
          console.log(`Notification permission: ${notificationPermission}`)

          // Then request persistent storage
          const persistent = await navigator.storage.persist()
          setIsPersistent(persistent)
          console.log(
            persistent
              ? 'Storage will not be cleared except by explicit user action'
              : 'Storage may be cleared by the UA under storage pressure.',
          )
        }
      } else {
        console.log('StorageManager API not supported')
        setIsPersistent(false)
      }

      // Initialize the database
      await initDB()
    } catch (error) {
      console.error('Failed to initialize database or request permissions:', error)
    }

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
      <h1>IndexedDB vs. OPFS benchmark</h1>
      <p>
        <a href="https://github.com/hyperknot/indexeddb_opfs">GitHub</a>
      </p>
      <p>
        Drop a local folder on the drag and drop area, it'll benchmark how much time is required to
        store it.
      </p>
      <p>Chrome needs notifications to enable persistence</p>
      {/* Storage persistence status indicator */}
      <div class="persistence-status">
        <Show
          when={navigator.storage?.persist}
          fallback={
            <span class="persistence-unsupported">Storage Persistence API not supported</span>
          }
        >
          <Show
            when={isPersistent() !== null}
            fallback={<span class="persistence-loading">Checking storage persistence...</span>}
          >
            {isPersistent() ? (
              <span class="persistence-enabled">Storage: Persistent ✓</span>
            ) : (
              <span class="persistence-disabled">Storage: May be cleared under pressure ⚠️</span>
            )}
          </Show>
        </Show>
      </div>

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
