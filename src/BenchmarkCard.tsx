// Define types for BenchmarkCard props
import type { BenchmarkResult } from './benchmarks.ts'
import { formatBytes } from './utils.ts'

interface BenchmarkCardProps {
  title: string
  result: BenchmarkResult
}

// Reusable benchmark card component
export const BenchmarkCard = (props: BenchmarkCardProps) => {
  const { title, result } = props

  return (
    <div class="benchmark-card">
      <h3>{title}</h3>
      <p>
        <strong>Total Files:</strong> {result.fileCount.toLocaleString()}
      </p>
      {result.dirCount !== undefined && (
        <p>
          <strong>Total Directories:</strong> {result.dirCount.toLocaleString()}
        </p>
      )}
      <p>
        <strong>Total Size:</strong> {formatBytes(result.totalSize || 0)}
      </p>
      <p>
        <strong>Time Taken:</strong> {result.duration.toFixed(2)} ms
      </p>
      <p>
        <strong>Avg Time Per File:</strong>{' '}
        {((result.duration || 0) / Math.max(result.fileCount || 1, 1)).toFixed(2)} ms
      </p>
      <p>
        <strong>Errors:</strong> {result.errorCount}
      </p>
    </div>
  )
}
