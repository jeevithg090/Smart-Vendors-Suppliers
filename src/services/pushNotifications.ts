interface PushNotificationAction {
  action: string
  title: string
  icon?: string
}

interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: PushNotificationAction[]
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported')
      return false
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered successfully')

      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription()
      
      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications are not supported')
      return 'denied'
    }

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    return permission
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('Service Worker not registered')
      return null
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      console.warn('Push notification permission denied')
      return null
    }

    try {
      // In a real implementation, you would get this from your server
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'
      
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      })

      // Send subscription to your server
      await this.sendSubscriptionToServer(this.subscription)
      
      return this.subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true
    }

    try {
      await this.subscription.unsubscribe()
      // Remove subscription from your server
      await this.removeSubscriptionFromServer(this.subscription)
      this.subscription = null
      return true
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      return
    }

    if (!this.registration) {
      // Fallback to browser notification
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/pwa-192x192.png',
        badge: payload.badge || '/pwa-192x192.png',
        tag: payload.tag,
        data: payload.data
      })
      return
    }

    await this.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag,
      data: payload.data,
      // actions: payload.actions as any,
      requireInteraction: true,
      // vibrate: [200, 100, 200]
    })
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    // In a real implementation, send this to your Convex backend
    console.log('Sending subscription to server:', subscription)
    
    // Example API call:
    // await fetch('/api/push-subscriptions', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // })
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    // In a real implementation, remove this from your Convex backend
    console.log('Removing subscription from server:', subscription)
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  isSubscribed(): boolean {
    return this.subscription !== null
  }

  getSubscription(): PushSubscription | null {
    return this.subscription
  }
}

export const pushNotificationService = new PushNotificationService()

// Notification templates for common use cases
export const NotificationTemplates = {
  orderStatusUpdate: (orderNumber: string, status: string) => ({
    title: 'Order Update',
    body: `Order #${orderNumber} is now ${status}`,
    tag: `order-${orderNumber}`,
    data: { type: 'order_update', orderNumber, status },
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }),

  priceAlert: (itemName: string, price: number, supplierName: string) => ({
    title: 'Price Alert',
    body: `${itemName} is now ₹${price} at ${supplierName}`,
    tag: `price-alert-${itemName}`,
    data: { type: 'price_alert', itemName, price, supplierName },
    actions: [
      { action: 'order', title: 'Order Now' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }),

  groupOrderUpdate: (itemName: string, participantsCount: number) => ({
    title: 'Group Order Update',
    body: `${participantsCount} vendors joined the group order for ${itemName}`,
    tag: `group-order-${itemName}`,
    data: { type: 'group_order_update', itemName, participantsCount },
    actions: [
      { action: 'join', title: 'Join Order' },
      { action: 'view', title: 'View Details' }
    ]
  }),

  newMessage: (senderName: string, preview: string) => ({
    title: `Message from ${senderName}`,
    body: preview,
    tag: `message-${senderName}`,
    data: { type: 'new_message', senderName, preview },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'view', title: 'View Chat' }
    ]
  })
}