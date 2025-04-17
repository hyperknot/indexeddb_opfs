import { Show, createSignal, onMount } from 'solid-js'

export function StoragePersistence() {
  const [isPersistent, setIsPersistent] = createSignal<boolean | null>(null)

  // Check persistence status on mount
  onMount(async () => {
    try {
      // Check if StorageManager API is supported
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        // Check if storage is already persistent
        const alreadyPersisted = await navigator.storage.persisted()
        setIsPersistent(alreadyPersisted)

        if (alreadyPersisted) {
          console.log('Storage is already persistent')
        }
      } else {
        console.log('StorageManager API not supported')
        setIsPersistent(false)
      }
    } catch (error) {
      console.error('Failed to check persistence status:', error)
    }
  })

  // Function to request persistence (triggered by user gesture)
  const requestPersistence = async () => {
    try {
      // Request notification permission first
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
    } catch (error) {
      console.error('Error requesting permissions:', error)
    }
  }

  return (
    <div class="persistence-status">
      <Show
        when={navigator.storage && typeof navigator.storage.persist === 'function'}
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
            <>
              <span class="persistence-disabled">Storage: May be cleared under pressure ⚠️</span>
              <br />
              <button class="persistence-request-button" onClick={requestPersistence}>
                Request Persistent Storage
              </button>
            </>
          )}
        </Show>
      </Show>
    </div>
  )
}
