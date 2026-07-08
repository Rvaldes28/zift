'use client'

import { useState } from 'react'

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function PushSubscriptionManager({
  csrfToken,
  publicKey,
}: {
  csrfToken: string
  publicKey: string | null
}) {
  const [status, setStatus] = useState<string>('')
  const supported =
    typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

  async function subscribe() {
    if (!publicKey || !supported) return
    setStatus('Solicitando permiso...')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus('Permiso de push no concedido.')
      return
    }

    const registration = await navigator.serviceWorker.register('/admin-sw.js')
    const subscription = await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(publicKey),
      userVisibleOnly: true,
    })
    const formData = new FormData()
    formData.set('csrfToken', csrfToken)
    formData.set('subscription', JSON.stringify(subscription.toJSON()))
    const response = await fetch('/api/notifications/push/subscribe', {
      body: formData,
      method: 'POST',
    })
    setStatus(response.ok ? 'Push activado en este navegador.' : 'No se pudo activar push.')
  }

  async function unsubscribe() {
    if (!supported) return
    const registration = await navigator.serviceWorker.getRegistration('/admin-sw.js')
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()

    const formData = new FormData()
    formData.set('csrfToken', csrfToken)
    if (subscription?.endpoint) formData.set('endpoint', subscription.endpoint)
    const response = await fetch('/api/notifications/push/unsubscribe', {
      body: formData,
      method: 'POST',
    })
    setStatus(response.ok ? 'Push desactivado en este navegador.' : 'No se pudo desactivar push.')
  }

  if (!publicKey) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Web Push no esta configurado. Define `WEB_PUSH_PUBLIC_KEY` y `WEB_PUSH_PRIVATE_KEY`.
      </p>
    )
  }

  if (!supported) {
    return <p className="text-sm text-[var(--muted)]">Este navegador no soporta Web Push.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="h-10 rounded-md bg-[var(--ink)] px-4 text-sm font-semibold text-white transition hover:bg-black"
        onClick={subscribe}
        type="button"
      >
        Activar push
      </button>
      <button
        className="h-10 rounded-md border border-[var(--line)] px-4 text-sm font-semibold transition hover:border-[var(--ink)]"
        onClick={unsubscribe}
        type="button"
      >
        Desactivar
      </button>
      {status && <p className="text-sm text-[var(--muted)]">{status}</p>}
    </div>
  )
}
