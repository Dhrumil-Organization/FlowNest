import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  {
    id: 'nav.grey_packing',
    kind: 'navigation',
    title: 'Grey Packing',
    permission: 'grey_packing',
    action: 'view',
    route: 'grey-packing',
    icon: 'qr-code-scanner',
    order: 55,
  },
  {
    id: 'screen.grey_packing',
    kind: 'screen',
    title: 'Grey Packing',
    permission: 'grey_packing',
    action: 'view',
    order: 55,
  },
]);
