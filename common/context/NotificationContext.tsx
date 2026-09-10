// NotificationContext.tsx
// Is file ko apne project me kahin bhi rakho, e.g. common/context/NotificationContext.tsx
// Fir apne root layout (_layout.tsx) ko is Provider se wrap karo:
//
//   import { NotificationProvider } from '@/common/context/NotificationContext';
//   ...
//   <NotificationProvider>
//       <Stack ... />
//   </NotificationProvider>
//
// Iske baad kisi bhi screen/component me useNotificationCenter() hook use karke
// notifications, unreadCount, removeNotification, clearAll access kar sakte ho.

import AsyncStorage from '@/common/utils/compatibleStorage';
import * as Notifications from 'expo-notifications';
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

const STORAGE_KEY = 'cached_notifications';

export type AppNotification = {
    id: string;
    title: string;
    body: string;
    data?: any;
    receivedAt: number;
    read: boolean;
};

type NotificationContextType = {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
);

// Foreground me bhi notification alert/sound/badge dikhaye
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export function NotificationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const receivedListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    // App start hote hi cached notifications load karo
    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                    setNotifications(JSON.parse(raw));
                }
            } catch (e) {
                console.warn('Failed to load cached notifications:', e);
            } finally {
                setHydrated(true);
            }
        })();
    }, []);

    // Notifications change hone par AsyncStorage me save karo
    // (hydrated check isliye taaki load hone se pehle khaali array save na ho jaye)
    useEffect(() => {
        if (!hydrated) return;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)).catch(
            (e) => console.warn('Failed to persist notifications:', e)
        );
    }, [notifications, hydrated]);

    const addNotification = (
        identifier: string | undefined,
        title: string | null | undefined,
        body: string | null | undefined,
        data: any
    ) => {
        const newItem: AppNotification = {
            id: identifier || String(Date.now()) + Math.random().toString(36).slice(2),
            title: title || 'Notification',
            body: body || '',
            data,
            receivedAt: Date.now(),
            read: false,
        };
        setNotifications((prev) => {
            if (prev.some((n) => n.id === newItem.id)) return prev; // duplicate avoid
            return [newItem, ...prev];
        });
    };

    useEffect(() => {
        // App foreground me hote hue notification aayi
        receivedListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                const content = notification.request.content;
                addNotification(
                    notification.request.identifier,
                    content.title,
                    content.body,
                    content.data
                );
            }
        );

        // User ne notification tap ki (background/killed state se app khula)
        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                const content = response.notification.request.content;
                addNotification(
                    response.notification.request.identifier,
                    content.title,
                    content.body,
                    content.data
                );
            });

        return () => {
            receivedListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    // User manually remove kare — tabhi cache se hatega
    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                removeNotification,
                clearAll,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationCenter() {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error(
            'useNotificationCenter must be used within a NotificationProvider'
        );
    }
    return ctx;
}