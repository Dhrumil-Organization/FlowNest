import { navigate } from '../navigation/NavigationService';

export function handleNotification(data) {
    if (!data) return;

    switch (data.type) {
        case 'ROUTE':
            navigate(data.route, JSON.parse(data.params || '{}'));
            break;

        case 'MESSAGE':
            navigate('ChatScreen', {
                userId: data.user_id
            });
            break;

        case 'ORDER':
            navigate('OrderDetail', {
                orderId: data.order_id
            });
            break;

        default:
            navigate('Home');
    }
}
