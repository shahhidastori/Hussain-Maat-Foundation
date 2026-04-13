import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDateTime } from '../lib/utils';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Receipt, 
  HandCoins,
  CheckCircle2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/mark-read`);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'fee_submitted':
        return <Receipt className="w-5 h-5 text-blue-600" />;
      case 'fee_approved':
        return <Check className="w-5 h-5 text-emerald-600" />;
      case 'fee_rejected':
        return <X className="w-5 h-5 text-red-600" />;
      case 'allocation_submitted':
        return <HandCoins className="w-5 h-5 text-amber-600" />;
      case 'allocation_approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'allocation_rejected':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getNotificationBg = (type, read) => {
    if (read) return 'bg-slate-50';
    
    switch (type) {
      case 'fee_approved':
      case 'allocation_approved':
        return 'bg-emerald-50';
      case 'fee_rejected':
      case 'allocation_rejected':
        return 'bg-red-50';
      default:
        return 'bg-blue-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="loader"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="notifications-page">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Notifications
          </h1>
          <p className="text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="rounded-lg"
            data-testid="mark-all-read"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`border-0 shadow-sm transition-colors ${getNotificationBg(notification.type, notification.read)}`}
              data-testid={`notification-${notification.id}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.read ? 'bg-slate-100' : 'bg-white'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium text-slate-900 ${!notification.read && 'text-slate-900'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No notifications yet</p>
            <p className="text-sm text-slate-400 mt-1">
              You'll be notified when there's activity on your account
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
