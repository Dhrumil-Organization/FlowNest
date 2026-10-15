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
import { APP_NAVIGATION } from '@/src/core/navigation/navigationRegistry';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
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
    const router = useRouter();
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

    const appSessionHydrated = useAppSessionStore((state) => state.hydrated);
    const appSession = useAppSessionStore((state) => state.appSession);
    const lastHandledResponseId = useRef<string | null>(null);
    const pendingRouteData = useRef<any>(null);

    // Notification routes are logical names. Resolve them case-insensitively,
    // but keep the real filesystem route casing for Legacy screens.
    const normalizeRoute = (value: any): string => {
        let route = String(value ?? '').trim().replace(/^\/+/, '');
        route = route.replace(/^new\//i, '');
        route = route.replace(/^\(tabs\)\//i, '');
        route = route.replace(/^new\/\(tabs\)\//i, '');
        route = route.replace(/\/index$/i, '');
        return route || 'index';
    };

    const logicalRoute = (value: any): string => normalizeRoute(value).toLowerCase();

    // IMPORTANT: Legacy HomeScreen does NOT use the new permission registry.
    // Its visible app list is built from ALL_APPS and filtered by the user's
    // `user_menu_apps` -> Mobile App -> children rights. Notification routing
    // must use that exact same source, otherwise a valid Legacy Home icon can
    // be denied (or a hidden screen can be opened).
    const LEGACY_HOME_APPS: readonly { name: string; route: string }[] = [
        { name: 'Credit Limit Request', route: 'credit-limit' },
        { name: 'Outstanding Days Request', route: 'outstanding-days-request' },
        { name: 'Receivables', route: 'receivables-screen' },
        { name: 'Collection', route: 'Collection' },
        { name: 'Yarn Purchase Order', route: 'yarn-purchase-order' },
        { name: 'Production Order Tracking', route: 'production-order-tracking' },
        { name: 'Monthly Expense Report', route: 'monthly-expense-report' },
        { name: 'Snap View', route: 'snap-view' },
        { name: 'Payable', route: 'Payable-Screen' },
        { name: 'Daily Collection Report', route: 'daily-collection-report' },
        { name: 'Sales Order Tracking', route: 'sales-order-tracking' },
        { name: 'Sales Analysis', route: 'sales-analysis' },
        { name: 'Daily Payment Report', route: 'daily-payment-report' },
        { name: 'Inquiry', route: 'Inquiry' },
        { name: 'Sudamo Production Order Auth', route: 'sudamo-production-order' },
        { name: 'New Account Request', route: 'new-account-request' },
        { name: 'Yarn Stock Verification', route: 'yarnstockverification' },
        { name: 'Sales Order(Inactive)', route: 'sales order-inactive' },
        { name: 'Purchase Order Tracking', route: 'purchase-order-tracking' },
        { name: 'Item Authorization', route: 'item-authorization' },
        { name: 'Process complete auth.', route: 'process-complete-auth' },
        { name: 'Febric Stock', route: 'febric-stock' },
        { name: 'Checking Scanner', route: 'checking-scanner' },
        { name: 'Design Authorization', route: 'design-authorization' },
        { name: 'Packing Grade Auth', route: 'packing-grade-auth' },
        { name: 'Production Merge Auth', route: 'production-merge-auth' },
        { name: 'Creel Management System', route: 'creel-management-system' },
        { name: 'Beam Gaiting', route: 'beam-gaiting' },
        { name: 'Yarn Management System', route: 'yarn-management-system' },
        { name: 'Weft Issue', route: 'weft-issue' },
        { name: 'Party Dashboard', route: 'party-dashboard' },
        { name: 'Production Report', route: 'production-report' },
        { name: 'Feedback', route: 'feedback' },
        { name: 'Yarn Manufacturing', route: 'yarn-manufacturing' },
        { name: 'Profile', route: 'profile' },
        { name: 'Sales Order Entry', route: 'sales-order-entry' },
        { name: 'Creel Issue Return', route: 'creel-issue-return' },
        { name: 'Doff Entry', route: 'doff-entry' },
        { name: 'Yarn Sales Order', route: 'yarn-sales-order' },
        { name: 'Event', route: 'event' },
        { name: 'Sales Order', route: 'sales-order' },
        { name: 'Employ Dashboard', route: 'employ-dashboard' },
        { name: 'Price List', route: 'price-list' },
        { name: 'Sales Order Dashboard', route: 'sales-order-dashboard' },
        { name: 'Sales Order Price List Auth', route: 'sales-order-price-list-auth' },
        { name: 'Packing Automation', route: 'packing-automation' },
        { name: 'Poy Rate Entry', route: 'PoyRateEntry' },
        { name: 'Purchase Grade Auth', route: 'purchase-grade-auth' },
        { name: 'Purchase Import Auth', route: 'purchase-import-auth' },
        { name: 'Purchase Rate Auth', route: 'purchase-rate-auth' },
        { name: 'Warehouse', route: 'warehouse' },
        { name: 'Beam Close', route: 'beam-close' },
        { name: 'Inquiry Report', route: 'inquiry-report' },
        { name: 'Quarter Summary', route: 'QuarterWiseDispatch' },
        { name: 'Weft Issue Return', route: 'weft-issue-return' },
        { name: 'Sudamo Sales Order Entry', route: 'sudamo-sales-order-entry' },
        { name: 'Fabric Stock Verification', route: 'fabric-stock-verification' },
        { name: 'Taka History', route: 'taka-history' },
    ];

    const readLegacyHomeRights = async () => {
        let raw = await AsyncStorage.getItem('rightsMenuApps');

        // HomeScreen creates rightsMenuApps from the encoded login menu. On a
        // cold-start notification, HomeScreen may not have copied it yet, so
        // fall back to the original persisted source used by HomeScreen.
        if (!raw) raw = await AsyncStorage.getItem('user_menu_apps');
        if (!raw) return [] as any[];

        try {
            let parsed: any = JSON.parse(raw);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);

            // user_menu_apps is base64 encoded in the Legacy login flow.
            if (!Array.isArray(parsed)) {
                try {
                    const decoded = atob(raw);
                    parsed = JSON.parse(decoded);
                } catch {
                    return [] as any[];
                }
            }
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            try {
                const decoded = atob(raw);
                const parsed = JSON.parse(decoded);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [] as any[];
            }
        }
    };

    const findNewNotificationTarget = (rawRoute: any) => {
        const route = logicalRoute(rawRoute);
        const navItem = APP_NAVIGATION.find((item) => {
            const registered = logicalRoute(item.routeName);
            return route === registered || route.startsWith(`${registered}/`);
        });
        if (!navItem) return null;
        return {
            route,
            registeredRoute: normalizeRoute(navItem.routeName),
            resource: navItem.resource,
            action: navItem.action || 'view',
            title: navItem.title,
        };
    };

    const findLegacyNotificationTarget = async (rawRoute: any) => {
        const requested = logicalRoute(rawRoute);
        const rightsTree = await readLegacyHomeRights();
        const mobileApp = rightsTree.find((item: any) =>
            item?.pages?.some((page: any) => page?.title === 'Mobile App'),
        );
        const children = mobileApp?.pages?.find(
            (page: any) => page?.title === 'Mobile App',
        )?.children || [];

        // Same rights rule as Legacy HomeScreen: an app is visible only when it
        // exists in ALL_APPS AND its name exists in Mobile App -> children.
        const allowedNames = new Set(
            children
                .map((child: any) => String(child?.title || '').trim().toLowerCase())
                .filter(Boolean),
        );

        const property = String(
            (await AsyncStorage.getItem('selected_property')) || '',
        ).trim().toLowerCase();

        const app = LEGACY_HOME_APPS.find((item) => {
            const itemRoute = logicalRoute(item.route);
            const routeMatch = requested === itemRoute || requested.startsWith(`${itemRoute}/`);
            const nameAllowed = allowedNames.has(item.name.toLowerCase());
            return routeMatch && nameAllowed;
        });

        if (!app) return null;

        // Receivables is the one Legacy Home route whose target changes by
        // property, exactly as HomeScreen's ALL_APPS definition does.
        const actualRoute = app.name === 'Receivables' && property === 'sudamo_knits'
            ? 'receivables-sudamo'
            : app.route;

        return {
            route: actualRoute,
            registeredRoute: actualRoute,
            resource: app.name,
            action: 'view',
            title: app.name,
        };
    };

    const openNotificationRoute = async (data: any) => {
        if (!data || String(data.type || '').toUpperCase() !== 'ROUTE' || !data.route) return;

        // If a notification is tapped during cold start, keep it pending until
        // the authenticated session/permission payload has hydrated. Otherwise
        // a valid route can incorrectly look like an unauthorized route.
        if (!appSessionHydrated || !appSession) {
            pendingRouteData.current = data;
            return;
        }

        try {
            const platformRaw = await AsyncStorage.getItem('LOOKUP_PLATFORM');
            const platform = String(platformRaw || '').trim().toUpperCase();
            const isNew = platform === 'NEW';
            const isLegacy = platform === 'OLD' || platform === 'LEGACY' || !isNew;

            const route = normalizeRoute(data.route);

            let params: Record<string, any> = {};
            const paramsRaw = data.params;
            if (paramsRaw && typeof paramsRaw === 'string') {
                try {
                    const parsed = JSON.parse(paramsRaw);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) params = parsed;
                } catch {
                    console.warn('Notification route params are not valid JSON');
                }
            } else if (paramsRaw && typeof paramsRaw === 'object' && !Array.isArray(paramsRaw)) {
                params = paramsRaw;
            }

            const targetInfo = isNew
                ? findNewNotificationTarget(route)
                : await findLegacyNotificationTarget(route);

            console.log('🧭 [NOTIFICATION ROUTE] RESOLVED:', {
                platform: isNew ? 'NEW' : 'OLD',
                requestedRoute: data.route,
                normalizedRoute: route,
                targetInfo,
            });

            // NEW ERP: use the same permission source that drives its Home/More
            // icons. Legacy store permissions are NOT used for this branch.
            // LEGACY: findLegacyNotificationTarget already applied the exact
            // HomeScreen ALL_APPS + user_menu_apps rights rule.
            let permissionAllowed = false;
            if (targetInfo) {
                if (isNew) {
                    const state = useAppSessionStore.getState();
                    const isSuperAdmin = Number(
                        state.user?.is_superadmin || state.rawLoginResponse?.issuperadmin || 0,
                    ) !== 0;
                    permissionAllowed = isSuperAdmin || Boolean(
                        targetInfo.action === 'view'
                            ? state.canScreen(targetInfo.resource) || state.canTab(targetInfo.resource, targetInfo.route)
                            : state.canAction(targetInfo.resource, targetInfo.action),
                    );

                    // V2 resolved grants are the same permission payload consumed
                    // by the New ERP PermissionProvider/Home navigation.
                    const grants = (state.appSession as any)?.permissions?.grants;
                    if (!isSuperAdmin && grants && typeof grants === 'object') {
                        const entry = grants[targetInfo.resource];
                        if (entry !== undefined) {
                            permissionAllowed = Boolean(entry?.access);
                            if (targetInfo.action && targetInfo.action !== 'view') {
                                const actionValue = entry?.actions?.[targetInfo.action];
                                permissionAllowed = actionValue === undefined
                                    ? permissionAllowed
                                    : Boolean(actionValue?.allowed ?? actionValue);
                            }
                        }
                    }
                } else {
                    permissionAllowed = true; // Legacy rights were checked while resolving targetInfo.
                }
            }

            if (!targetInfo || !permissionAllowed) {
                router.push({
                    pathname: isNew
                        ? '/new/notification-access-denied'
                        : '/notification-access-denied',
                    params: {
                        platform: isNew ? 'NEW' : 'OLD',
                        route,
                        reason: !targetInfo ? 'missing-or-no-home-right' : 'permission',
                    },
                } as any);
                return;
            }

            const targetRoute = isNew ? route : targetInfo.route;
            const target = isNew
                ? `/new/(tabs)/${targetRoute === 'index' ? '' : targetRoute}`
                : `/(tabs)/${targetRoute === 'index' ? '' : targetRoute}`;

            console.log('🔔 Notification ROUTE authorized:', {
                platform: isNew ? 'NEW' : isLegacy ? 'OLD' : platform,
                route,
                resource: targetInfo.resource,
                target,
                params,
            });

            router.push({ pathname: target as any, params } as any);
        } catch (error) {
            // Navigation must never break notification receiving/storage.
            console.warn('Notification route navigation failed:', error);
        }
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
                const responseId = response.notification.request.identifier;
                addNotification(
                    responseId,
                    content.title,
                    content.body,
                    content.data
                );
                if (lastHandledResponseId.current === responseId) return;
                lastHandledResponseId.current = responseId;
                void openNotificationRoute(content.data);
            });

        // If the OS launched the app because the user tapped a notification
        // while it was completely closed, process that response once.
        void Notifications.getLastNotificationResponseAsync().then((response) => {
            if (!response) return;
            const content = response.notification.request.content;
            const responseId = response.notification.request.identifier;
            if (lastHandledResponseId.current === responseId) return;
            lastHandledResponseId.current = responseId;
            void openNotificationRoute(content.data);
        });

        return () => {
            receivedListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [router, appSessionHydrated, appSession]);

    // Retry a cold-start notification after the persisted session/permissions
    // become available. This is what makes notification taps reliable when the
    // app was fully closed.
    useEffect(() => {
        if (!appSessionHydrated || !appSession || !pendingRouteData.current) return;
        const data = pendingRouteData.current;
        pendingRouteData.current = null;
        void openNotificationRoute(data);
    }, [appSessionHydrated, appSession, router]);

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