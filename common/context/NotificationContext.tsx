// NotificationContext.tsx
// Existing notification storage/receiving is intentionally preserved.
// Notification tap handling additionally resolves the backend ROUTE against
// the current OLD/NEW ERP and the same rights used by the Home navigation.

import AsyncStorage from '@/common/utils/compatibleStorage';
import { APP_NAVIGATION } from '@/src/core/navigation';
import { getNewUserResources, newUserCanAccess } from '@/src/core/permissions/newUser';
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

// IMPORTANT: keep the existing handler behavior so notifications continue to
// arrive exactly as before. `shouldShowAlert` is intentionally left unchanged
// here to avoid changing the working Expo notification behavior.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/* -------------------------------------------------------------------------- */
/* Notification route helpers                                                 */
/* -------------------------------------------------------------------------- */

const normalizeRoute = (value: unknown) =>
    String(value ?? '')
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/\/index$/i, '')
        .toLowerCase();

const normalizeName = (value: unknown) =>
    String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const parseParams = (value: unknown): Record<string, any> => {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

// This is the same Legacy HomeScreen source of truth:
// HomeScreen builds ALL_APPS and then filters it using the "Mobile App"
// children from user_menu_apps.  Keep the title -> route pairs here so a
// notification can only enter a Legacy screen that the Home can actually show.
const LEGACY_NOTIFICATION_ROUTES: { name: string; route: string }[] = [
    ['Credit Limit Request', 'credit-limit'],
    ['Outstanding Days Request', 'outstanding-days-request'],
    // ['Receivables', 'Receivables-Screen'],
    ['Receivables' , 'receivables-screen'],
    ['Collection', 'Collection'],
    ['Yarn Purchase Order', 'yarn-purchase-order'],
    ['Production Order Tracking', 'production-order-tracking'],
    ['Monthly Expense Report', 'monthly-expense-report'],
    ['Snap View', 'snap-view'],
    ['Payable', 'Payable-Screen'],
    ['Daily Collection Report', 'daily-collection-report'],
    ['Sales Order Tracking', 'sales-order-tracking'],
    ['Daily Payment Report', 'daily-payment-report'],
    ['Inquiry', 'Inquiry'],
    ['Sudamo Production Order', 'sudamo-production-order'],
    ['New Account Request', 'new-account-request'],
    ['Yarn Stock Verification', 'yarnstockverification'],
    ['Sales Order(Inactive)', 'sales order-inactive'],
    ['Purchase Order Tracking', 'purchase-order-tracking'],
    ['Item Authorization', 'item-authorization'],
    ['Process complete auth.', 'process-complete-auth'],
    ['Febric Stock', 'febric-stock'],
    ['Checking Scanner', 'checking-scanner'],
    ['Design Authorization', 'design-authorization'],
    ['Packing Grade Auth', 'packing-grade-auth'],
    ['Production Merge Auth', 'production-merge-auth'],
    ['Creel Management System', 'creel-management-system'],
    ['Beam Gaiting', 'beam-gaiting'],
    ['Yarn Management System', 'yarn-management-system'],
    ['Weft Issue', 'weft-issue'],
    ['Party Dashboard', 'party-dashboard'],
    ['Production Report', 'production-report'],
    ['Feedback', 'feedback'],
    ['Yarn Manufacturing', 'yarn-manufacturing'],
    ['Profile', 'profile'],
    ['Sales Order Entry', 'sales-order-entry'],
    ['Creel Issue Return', 'creel-issue-return'],
    ['Doff Entry', 'doff-entry'],
    ['Yarn Sales Order', 'yarn-sales-order'],
    ['Event', 'event'],
    ['Sales Order', 'sales-order'],
    ['Employ Dashboard', 'employ-dashboard'],
    ['Price List', 'price-list'],
    ['Sales Order Dashboard', 'sales-order-dashboard'],
    ['Sales Order Price List Auth', 'sales-order-price-list-auth'],
    ['Poy Rate Entry', 'PoyRateEntry'],
    ['Purchase Grade Auth', 'purchase-grade-auth'],
    ['Purchase Import Auth', 'purchase-import-auth'],
    ['Purchase Rate Auth', 'purchase-rate-auth'],
    ['Warehouse', 'warehouse'],
    ['Beam Close', 'beam-close'],
    ['Inquiry Report', 'inquiry-report'],
    ['Quarter Summary', 'QuarterWiseDispatch'],
    ['Weft Issue Return', 'weft-issue-return'],
    ['Sudamo Sales Order Entry', 'sudamo-sales-order-entry'],
    ['Fabric Stock Verification', 'fabric-stock-verification'],
].map(([name, route]) => ({ name, route }));

// Legacy route / Legacy Home app name (lower-case) -> New ERP route name
// (the `route` of the navigation node in src/registry/modules/production.module.ts).
// Modules whose New route equals the Legacy route (new-account-request,
// outstanding-days-request, party-dashboard, design-authorization,
// production-report, warehouse, yarn-management-system, feedback,
// yarn-manufacturing, doff-entry, price-list, event, ...) need no entry here —
// they resolve directly. Weft Carton Issue and Yarn Sales Order stay Legacy-only.
const NEW_ROUTE_ALIASES: Record<string, string> = {
    'credit-limit': 'credit-limit-request',
    'receivables': 'receivables-screen',
    'yarn-purchase-order': 'purchase-order',
    'yarn purchase order': 'purchase-order',
    'grey-purchase-order': 'grey-order',
    'snap-view': 'snapview',
    'payable': 'Payable-Screen',
    'daily-collection-report': 'daily-report',
    'sales-order-tracking': 'sales-tracking',
    'purchase-order-tracking': 'purchase-tracking',
    'yarn-stock-verification': 'yarnstockverification',
    'fabric-stock-verification': 'fabricstockverification',
    'sales order-inactive': 'sales-order-inactive',
    'sales order(inactive)': 'sales-order-inactive',
    'process complete auth.': 'process-complete-auth',
    'febric-stock': 'fabric-stock',
    'febric stock': 'fabric-stock',
    'checking-scanner': 'checking-scanner-new',
    'creel-management-system': 'creel-management-new',
    'creel-issue-return': 'creel-issue-return-new',
    'beam-gaiting': 'beam-gaiting-new',
    'beam-close': 'beam-close-new',
    'beam close': 'beam-close-new',
    'poyrateentry': 'poy-rate-entry',
    'quarterwisedispatch': 'quarter-summary',
    'sales-order-entry': 'orders',
    'sales order entry': 'orders',
};

const getLegacyUserMenuNames = async (): Promise<Set<string>> => {
    const raw = await AsyncStorage.getItem('user_menu_apps');
    if (!raw) return new Set();

    try {
        let parsed: any;
        try {
            parsed = JSON.parse(raw);
        } catch {
            // HomeScreen uses atob() for the stored login response.
            parsed = JSON.parse(atob(raw));
        }

        const mobileApp = Array.isArray(parsed)
            ? parsed.find((item: any) =>
                item?.pages?.some((p: any) => p?.title === 'Mobile App')
            )
            : null;

        const children =
            mobileApp?.pages?.find((p: any) => p?.title === 'Mobile App')?.children || [];

        return new Set(
            children
                .map((child: any) => normalizeName(child?.title))
                .filter(Boolean)
        );
    } catch (error) {
        console.warn('🔐 [NOTIFICATION ROUTE] Legacy rights parse failed:', error);
        return new Set();
    }
};

const permissionFlag = (value: any, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'allow', 'allowed', 'yes'].includes(normalized)) return true;
        if (['0', 'false', 'deny', 'denied', 'no', ''].includes(normalized)) return false;
    }
    if (value && typeof value === 'object') {
        if ('allowed' in value) return permissionFlag(value.allowed, fallback);
        if ('access' in value) return permissionFlag(value.access, fallback);
        if ('can_view' in value) return permissionFlag(value.can_view, fallback);
        if ('can_use' in value) return permissionFlag(value.can_use, fallback);
        if ('value' in value) return permissionFlag(value.value, fallback);
    }
    return fallback;
};

const normalizePermission = (value: unknown) =>
    String(value ?? '').trim().replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.').toLowerCase();

const canAccessNewResource = (
    appSession: any,
    user: any,
    resourcePath: string,
    action?: string,
): boolean => {
    const path = normalizePermission(resourcePath);
    if (!path) return false;

    const isSuperAdmin =
        Number(user?.is_superadmin || appSession?.user?.is_superadmin || 0) !== 0;

    if (isSuperAdmin) return true;

    const permissions = appSession?.permissions || {};
    const grants = permissions?.grants;

    // Match PermissionProvider's resolved-grants logic used by the New ERP
    // Home/tab navigation.
    if (grants && typeof grants === 'object' && !Array.isArray(grants)) {
        const exactEntry = grants[path];

        if (exactEntry !== undefined) {
            const access = permissionFlag(exactEntry?.access);
            if (!access) return false;

            if (!action || normalizePermission(action) === 'view') return true;

            const actionValue = exactEntry?.actions?.[action];
            return actionValue === undefined ? true : permissionFlag(actionValue);
        }

        // A parent/container is usable when an explicitly allowed descendant
        // exists, exactly like PermissionProvider.canAccess().
        const prefix = `${path}.`;
        for (const [grantPathRaw, entry] of Object.entries(grants as Record<string, any>)) {
            const grantPath = normalizePermission(grantPathRaw);
            if (grantPath.startsWith(prefix) && permissionFlag(entry?.access)) {
                return true;
            }
        }

        return false;
    }

    // Compatibility with older permission payloads.
    const resources = permissions?.resources;

    if (Array.isArray(resources)) {
        const item = resources.find(
            (entry: any) =>
                normalizePermission(entry?.resource_path || entry?.resourcePath || entry?.key) === path
        );

        if (item) {
            const allowed = permissionFlag(item.can_view ?? item.allowed, true);
            if (!allowed) return false;
            if (!action || normalizePermission(action) === 'view') return true;

            const actions = item.actions || {};
            const actionEntry = Array.isArray(actions)
                ? actions.find((a: any) => normalizePermission(a?.action_key || a?.key) === normalizePermission(action))
                : actions[action];

            return actionEntry === undefined ? false : permissionFlag(
                actionEntry?.allowed ?? actionEntry?.can_use ?? actionEntry,
            );
        }

        return false;
    }

    return false;
};

const resolveNotificationTarget = async (
    data: any,
): Promise<{ path: string; platform: 'OLD' | 'NEW'; route: string } | null> => {
    if (!data || String(data.type || '').toUpperCase() !== 'ROUTE') return null;

    const route = String(data.route ?? '').trim();
    if (!route) return null;

    const storedPlatform = await AsyncStorage.getItem('LOOKUP_PLATFORM');
    const platform = String(storedPlatform || '').trim().toUpperCase() === 'NEW' ? 'NEW' : 'OLD';
    const normalized = normalizeRoute(route);

    console.log('🏢 [NOTIFICATION ROUTE] ERP:', platform);
    console.log('🧭 [NOTIFICATION ROUTE] REQUEST:', route);

    if (platform === 'OLD') {
        const allowedNames = await getLegacyUserMenuNames();

        // Route must exist in the actual Legacy Home module registry.
        const routeEntry = LEGACY_NOTIFICATION_ROUTES.find(
            (entry) => normalizeRoute(entry.route) === normalized ||
                normalizeName(entry.name) === normalizeName(route),
        );

        if (!routeEntry) {
            console.log('❌ [NOTIFICATION ROUTE] Legacy route not registered:', route);
            return null;
        }

        // Same rights source as Legacy HomeScreen: Mobile App children.
        if (!allowedNames.has(normalizeName(routeEntry.name))) {
            console.log('❌ [NOTIFICATION ROUTE] Legacy right missing:', routeEntry.name);
            return null;
        }

        const path = normalized
            ? `/(tabs)/${routeEntry.route.replace(/\/index$/i, '')}`
            : '/(tabs)';

        return { path, platform, route: routeEntry.route };
    }

    let item = APP_NAVIGATION.find(
        (entry) => normalizeRoute(entry.routeName) === normalized ||
            normalizeName(entry.title) === normalizeName(route),
    );

    // The backend may still send the LEGACY route / app name for a module that
    // has a different route name in the New ERP. Only when the direct lookup
    // above finds nothing, translate it to the New ERP route. Rights are still
    // checked below against the New ERP permission of the resolved screen.
    if (!item) {
        const aliasRoute =
            NEW_ROUTE_ALIASES[normalized] || NEW_ROUTE_ALIASES[normalizeName(route)];
        if (aliasRoute) {
            item = APP_NAVIGATION.find(
                (entry) => normalizeRoute(entry.routeName) === normalizeRoute(aliasRoute),
            );
            if (item) {
                console.log('🔁 [NOTIFICATION ROUTE] Legacy route mapped to New:', route, '->', item.routeName);
            }
        }
    }

    if (!item) {
        console.log('❌ [NOTIFICATION ROUTE] New route not registered:', route);
        return null;
    }

    const appSession = useAppSessionStore.getState().appSession;
    const user = useAppSessionStore.getState().user;

    // NEW USER (login `role1` empty) gets a fixed module set — the same rule
    // PermissionProvider applies to the tabs / route guard.
    const newUserResources = getNewUserResources(
        useAppSessionStore.getState().rawLoginResponse,
        user,
    );

    const allowed = newUserResources
        ? newUserCanAccess(newUserResources, item.resource)
        : canAccessNewResource(
            appSession,
            user,
            item.resource,
            item.action,
        );

    console.log('🔐 [NOTIFICATION ROUTE] New rights:', {
        resource: item.resource,
        action: item.action,
        allowed,
    });

    if (!allowed) return null;

    const pathPart = String(item.routeName || '').replace(/^\/+|\/+$/g, '').replace(/\/index$/i, '');
    const path = pathPart ? `/new/(tabs)/${pathPart}` : '/new/(tabs)';

    return { path, platform, route: item.routeName };
};

const navigateNotificationRoute = async (
    router: ReturnType<typeof useRouter>,
    data: any,
): Promise<'handled' | 'pending' | 'ignored'> => {
    if (!data || String(data.type || '').toUpperCase() !== 'ROUTE') return 'ignored';

    try {
        // Authentication always comes first. A push may be tapped while the
        // app is completely closed or after the user has logged out. Never
        // attempt an ERP route in that state.
        const accessToken = await AsyncStorage.getItem('access_token');
        if (!accessToken) {
            const route = normalizeRoute(data?.route);
            console.log('🔐 [NOTIFICATION ROUTE] Logged out -> landing', route);
            router.replace({
                pathname: '/(all)/landing',
                params: { notificationLoginRequired: '1', notificationRoute: route },
            } as any);
            return 'handled';
        }

        const platformRaw = await AsyncStorage.getItem('LOOKUP_PLATFORM');
        const platform = String(platformRaw || '').toUpperCase();

        // New ERP permission data is hydrated by app/new/_layout. During a
        // cold start that layout may not have mounted yet. Keep the response
        // pending instead of incorrectly sending a valid route to Access Denied.
        if (platform === 'NEW') {
            const state = useAppSessionStore.getState();
            if (!state.hydrated) {
                console.log('⏳ [NOTIFICATION ROUTE] Waiting for New ERP session hydration');
                return 'pending';
            }
        }

        const target = await resolveNotificationTarget(data);

        if (!target) {
            const platformRaw = await AsyncStorage.getItem('LOOKUP_PLATFORM');
            const platform = String(platformRaw || '').toUpperCase() === 'NEW' ? 'NEW' : 'OLD';

            console.log('⚠️ [NOTIFICATION ROUTE] Access/route denied:', {
                platform,
                route: data?.route,
            });

            router.replace(
                platform === 'NEW'
                    ? {
                        pathname: '/new/notification-access-denied',
                        params: { platform, route: String(data?.route || '') },
                    } as any
                    : {
                        pathname: '/notification-access-denied',
                        params: { platform, route: String(data?.route || '') },
                    } as any,
            );
            return 'handled';
        }

        const params = parseParams(data.params);

        console.log('➡️ [NOTIFICATION ROUTE] NAVIGATING:', {
            platform: target.platform,
            route: target.route,
            path: target.path,
            params,
        });

        // Replace the current screen instead of stacking a duplicate ERP
        // screen on top of the current tab.
        router.replace({
            pathname: target.path,
            params,
        } as any);

        console.log('✅ [NOTIFICATION ROUTE] router.replace called');
        return 'handled';
    } catch (error) {
        // Routing must NEVER break notification receipt/storage.
        console.warn('⚠️ [NOTIFICATION ROUTE] navigation failed:', error);
        return 'handled';
    }
};

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
    const handledResponseIds = useRef(new Set<string>());
    const pendingRouteData = useRef<any>(null);
    const appSessionHydrated = useAppSessionStore((state) => state.hydrated);

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
            if (prev.some((n) => n.id === newItem.id)) return prev;
            return [newItem, ...prev];
        });
    };

    const handleResponse = async (response: Notifications.NotificationResponse) => {
        const content = response.notification.request.content;
        const identifier = response.notification.request.identifier;

        // Preserve the existing behavior: tapping a notification also stores it.
        addNotification(
            identifier,
            content.title,
            content.body,
            content.data
        );

        // Prevent the same response from being navigated twice when both
        // Expo's response listener and cold-start lookup see it.
        if (identifier && handledResponseIds.current.has(identifier)) return;
        if (identifier) handledResponseIds.current.add(identifier);

        console.log('👆 [NOTIFICATION TAP]', {
            id: identifier,
            title: content.title,
            body: content.body,
            data: content.data,
        });

        const result = await navigateNotificationRoute(router, content.data);
        if (result === 'pending') {
            pendingRouteData.current = content.data;
        }
    };

    useEffect(() => {
        // App foreground me hote hue notification aayi
        receivedListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                const content = notification.request.content;

                // Existing receive path — unchanged.
                console.log('🔔 [NOTIFICATION RECEIVED]', {
                    id: notification.request.identifier,
                    title: content.title,
                    body: content.body,
                    data: content.data,
                });

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
                void handleResponse(response);
            });

        // Cold start: if the app was fully closed and launched by a
        // notification tap, Expo exposes the last response here.
        void (async () => {
            try {
                const lastResponse = await Notifications.getLastNotificationResponseAsync();
                if (lastResponse) {
                    console.log('🚀 [NOTIFICATION COLD START]', {
                        id: lastResponse.notification.request.identifier,
                        data: lastResponse.notification.request.content.data,
                    });

                    void handleResponse(lastResponse);
                }
            } catch (error) {
                console.warn('⚠️ [NOTIFICATION COLD START] lookup failed:', error);
            }
        })();

        return () => {
            receivedListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [router]);

    // A cold-start New ERP notification can arrive before app/new/_layout has
    // hydrated AppSessionStore. Retry the exact same notification once the
    // persisted session/permissions are ready. Legacy does not depend on this.
    useEffect(() => {
        if (!appSessionHydrated || !pendingRouteData.current) return;
        const data = pendingRouteData.current;
        pendingRouteData.current = null;
        void navigateNotificationRoute(router, data).then((result) => {
            if (result === 'pending') pendingRouteData.current = data;
        });
    }, [appSessionHydrated, router]);

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

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
