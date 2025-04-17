// Promise-based function to read directory entries
export function readDirectoryEntries(dirEntry: any): Promise<Array<any>> {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader()
    let entries: Array<any> = []

    function readEntries() {
      reader.readEntries((results: Array<any>) => {
        if (results.length) {
          entries = entries.concat(Array.from(results))
          readEntries() // Continue reading if we're not done
        } else {
          resolve(entries) // No more entries, we're done
        }
      }, reject)
    }

    readEntries()
  })
}

// Promise-based function to get file from entry
export function getFileFromEntry(entry: any): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject)
  })
}
