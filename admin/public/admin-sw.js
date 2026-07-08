self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || 'ZiftLab Admin'
  const options = {
    body: payload.body || 'Nueva notificacion',
    data: {
      url: payload.url || '/dashboard/notifications',
    },
    icon: '/favicon.ico',
    tag: payload.url || 'ziftlab-admin-notification',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard/notifications'
  event.waitUntil(clients.openWindow(url))
})
