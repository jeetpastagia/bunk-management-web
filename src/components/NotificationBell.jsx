import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { onForegroundMessage } from '../lib/firebase';
import { Badge, Spinner } from './ui';

const POLL_INTERVAL_MS = 60_000;

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState(null);
  const containerRef = useRef(null);

  const refreshUnreadCount = async () => {
    try {
      const { unreadCount: count } = await api.unreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // best-effort — a failed poll shouldn't disrupt the page
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    const unsubscribe = onForegroundMessage(() => refreshUnreadCount());
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const loadNotifications = async () => {
    setNotifications(null);
    try {
      const { notifications: list } = await api.listNotifications({ limit: 10 });
      setNotifications(list);
    } catch {
      setNotifications([]);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) loadNotifications();
  };

  const handleMarkRead = async (id) => {
    setNotifications((list) => list.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.markNotificationRead(id);
    } catch {
      // ignore — background poll will reconcile
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((list) => list?.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.markAllNotificationsRead();
    } catch {
      // ignore — background poll will reconcile
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-xl bg-[var(--tint-5)] hover:bg-[var(--tint-10)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <BellIcon className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1">
            <Badge tone="danger">{unreadCount > 9 ? '9+' : unreadCount}</Badge>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[var(--color-surface-raised)] rounded-2xl border border-[var(--color-border)] shadow-xl z-30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-soft)]">
            <h3 className="font-display font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-[var(--color-brand-soft)] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications === null ? (
              <div className="flex justify-center py-8">
                <Spinner size={18} />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-[var(--color-text-faint)] text-center py-8 px-4">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => !n.read && handleMarkRead(n._id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--color-border-soft)] last:border-0 transition-colors hover:bg-[var(--tint-5)] ${
                    n.read ? '' : 'bg-[var(--color-brand)]/5'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-brand-soft)] shrink-0" />}
                    <div className={n.read ? 'pl-3.5' : ''}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-[var(--color-text-faint)] mt-1">{timeAgo(n.sentAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
    </svg>
  );
}
