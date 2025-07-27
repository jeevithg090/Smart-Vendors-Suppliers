import { useState, useEffect } from 'react'
import { pushNotificationService, NotificationTemplates } from '../services/pushNotifications'

interface NotificationPreferences {
  orderUpdates: boolean
  priceAlerts: boolean
  groupOrders: boolean
  messages: boolean
  marketing: boolean
}

export default function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orderUpdates: true,
    priceAlerts: true,
    groupOrders: true,
    messages: true,
    marketing: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initializeNotifications = async () => {
      const supported = await pushNotificationService.initialize()
      setIsSupported(supported)
      
      if (supported) {
        setPermission(Notification.permission)
        setIsSubscribed(pushNotificationService.isSubscribed())
      }

      // Load preferences from localStorage
      const savedPreferences = localStorage.getItem('notification_preferences')
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences))
      }
    }

    initializeNotifications()
  }, [])

  const handleEnableNotifications = async () => {
    setLoading(true)
    
    try {
      const subscription = await pushNotificationService.subscribe()
      if (subscription) {
        setIsSubscribed(true)
        setPermission('granted')
        
        // Show welcome notification
        await pushNotificationService.showLocalNotification({
          title: 'Notifications Enabled!',
          body: 'You\'ll now receive updates about your orders and price alerts.',
          tag: 'welcome'
        })
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setLoading(true)
    
    try {
      const success = await pushNotificationService.unsubscribe()
      if (success) {
        setIsSubscribed(false)
      }
    } catch (error) {
      console.error('Failed to disable notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    localStorage.setItem('notification_preferences', JSON.stringify(newPreferences))
  }

  const handleTestNotification = async () => {
    await pushNotificationService.showLocalNotification(
      NotificationTemplates.orderStatusUpdate('12345', 'delivered')
    )
  }

  if (!isSupported) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Push Notifications
        </h3>
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">📵</span>
          <p className="text-gray-600">
            Push notifications are not supported on this device or browser.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Push Notifications
      </h3>

      {/* Enable/Disable Notifications */}
      <div className="mb-6">
        {permission === 'denied' ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-500 text-xl mr-3">🚫</span>
              <div>
                <h4 className="text-red-800 font-medium">Notifications Blocked</h4>
                <p className="text-red-600 text-sm mt-1">
                  Please enable notifications in your browser settings to receive updates.
                </p>
              </div>
            </div>
          </div>
        ) : !isSubscribed ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-blue-500 text-xl mr-3">🔔</span>
                <div>
                  <h4 className="text-blue-800 font-medium">Enable Notifications</h4>
                  <p className="text-blue-600 text-sm mt-1">
                    Get instant updates about your orders and price alerts.
                  </p>
                </div>
              </div>
              <button
                onClick={handleEnableNotifications}
                disabled={loading}
                className="btn-primary text-sm px-4 py-2 ml-4"
              >
                {loading ? 'Enabling...' : 'Enable'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-500 text-xl mr-3">✅</span>
                <div>
                  <h4 className="text-green-800 font-medium">Notifications Enabled</h4>
                  <p className="text-green-600 text-sm mt-1">
                    You're receiving push notifications.
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleTestNotification}
                  className="text-sm text-green-700 hover:text-green-900 underline"
                >
                  Test
                </button>
                <button
                  onClick={handleDisableNotifications}
                  disabled={loading}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  {loading ? 'Disabling...' : 'Disable'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      {isSubscribed && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Notification Preferences</h4>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Order Updates</span>
                <p className="text-xs text-gray-500">Status changes, delivery updates</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.orderUpdates}
                onChange={(e) => handlePreferenceChange('orderUpdates', e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Price Alerts</span>
                <p className="text-xs text-gray-500">When items reach your target price</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.priceAlerts}
                onChange={(e) => handlePreferenceChange('priceAlerts', e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Group Orders</span>
                <p className="text-xs text-gray-500">New group orders and updates</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.groupOrders}
                onChange={(e) => handlePreferenceChange('groupOrders', e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Messages</span>
                <p className="text-xs text-gray-500">New messages from suppliers</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.messages}
                onChange={(e) => handlePreferenceChange('messages', e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Marketing</span>
                <p className="text-xs text-gray-500">Promotions and new features</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}