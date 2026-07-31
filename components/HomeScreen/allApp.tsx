const APP_SECTIONS = [
  
  
  
    // Only For Sudamo
    {
        title: 'T',
        data: [
            { id: '17', name: 'Taka Checking Entry', screen: 'Taka Checking Entry', icon: 'dynamic-form', iconColor: '#5B2CFF' },
        ],
    },
   
    {
        title: 'Y',
        data: [
            { id: '19', name: 'Yarn Stock Verification', screen: 'Yarn Stock Verification', icon: 'check-circle', iconColor: '#008080' },
        ],
    },
    {
        title: 'C',
        data: [
            { id: '20', name: 'Checking Scanner', screen: 'Checking Scanner', icon: 'document-scanner', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '21', name: 'Purchase Order Tracking', screen: 'Purchase Order Tracking', icon: 'shopping-cart', iconColor: '#228B22' },
        ],
    },
    {
        title: 'D',
        data: [
            { id: '22', name: 'Design Authorization', screen: 'Design Authorization', icon: 'edit', iconColor: '#4B0082' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '23', name: 'Sales Analysis', screen: 'Sales Analysis', icon: 'bar-chart', iconColor: '#221080' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '24', name: 'Sales Order(Inactive)', screen: 'Sales Order(Inactive)', icon: 'bar-chart', iconColor: '#221080' },
        ],
    },
    {
        title: 'I',
        data: [
            { id: '26', name: 'Item Authorization', screen: 'Item Authorization', icon: 'gite', iconColor: '#221080' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '25', name: 'Process complete auth.', screen: 'Process complete auth.', icon: 'autorenew', iconColor: '#dd5c98' },
            { id: '25', name: 'Packing Grade Auth', screen: 'Packing Grade Auth', icon: 'admin-panel-settings', iconColor: '#3a70a3c9' },
            { id: '37', name: 'Production Merge Auth', screen: 'Production Merge Auth', icon: 'merge-type', iconColor: '#8b55d1' },
        ],
    },
    {
        title: 'F',
        data: [
            { id: '26', name: 'Febric Stock', screen: 'Febric Stock', icon: 'autorenew', iconColor: '#dd5c98' },
        ],
    },
    {
        title: 'D',
        data: [
            { id: '27', name: 'Daily Payment Report', screen: 'Daily Payment Report', icon: 'payments', iconColor: '#ff2ced' },
        ],
    },
    {
        title: 'D',
        data: [
            { id: '27', name: 'Beam Close', screen: 'Beam Close', icon: 'assignment-turned-in', iconColor: '#0ceebd' },
        ],
    },
    {
        title: 'C',
        data: [
            { id: '27', name: 'Creel Management System', screen: 'Creel Management System', icon: 'settings-system-daydream', iconColor: '#008080' },
        ],
    },
    {
        title: 'B',
        data: [
            { id: '28', name: 'Beam Gaiting', screen: 'Beam Gaiting', icon: 'edit', iconColor: '#142af5' },
        ],
    },
    {
        title: 'B',
        data: [
            { id: '29', name: 'Yarn Stock', screen: 'Yarn Stock', icon: 'autorenew', iconColor: '#008080' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '30', name: 'Yarn Management System', screen: 'Yarn Management System', icon: 'inventory', iconColor: '#4B0082' },
        ],
    },
    // {
    //     title: 'B',
    //     data: [
    //         { id: '30', name: 'Party Dashboard', screen: 'Party Dashboard', icon: 'space-dashboard', iconColor: '#991070' },
    //     ],
    // },
    {
        title: 'I',
        data: [
            { id: '32', name: 'Weft Issue', screen: 'Weft Issue', icon: 'precision-manufacturing', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '32', name: 'Party Dashboard', screen: 'Party Dashboard', icon: 'precision-manufacturing', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '32', name: 'Production Report', screen: 'Production Report', icon: 'precision-manufacturing', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '33', name: 'Sales Order Entry', screen: 'Sales Order Entry', icon: 'shopping-cart-checkout', iconColor: '#48cbef' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '32', name: 'Creel Issue Return', screen: 'Creel Issue Return', icon: 'precision-manufacturing', iconColor: '#4169E1' },
        ],
    },
    {

        title: 'P',
        data: [
            { id: '32', name: 'Doff Entry', screen: 'Doff Entry', icon: 'precision-manufacturing', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '34', name: 'Yarn Sales Order', screen: 'Yarn Sales Order', icon: 'shopping-cart-checkout', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'W',
        data: [
            { id: '35', name: 'Warehouse', screen: 'Warehouse', icon: 'warehouse', iconColor: '#991070' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '35', name: 'Purchase Auth', screen: 'Purchase Auth', icon: 'fact-check', iconColor: '#5f738f' },
        ],
    },
    {
        title: 'E',
        data: [
            { id: '35', name: 'Employ Dashboard', screen: 'Employ Dashboard', icon: 'fact-check', iconColor: '#5f338f' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '37', name: 'Sales Order Dashborad', screen: 'Sales Order Dashborad', icon: 'assessment', iconColor: '#10B981' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '38', name: 'Sudamo Sales Order Entry', screen: 'Sudamo Sales Order Entry', icon: 'shopping-cart-checkout', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '39', name: 'Poy Rate Entry', screen: 'Poy Rate Entry', icon: 'price-change', iconColor: '#6A1B9A' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '40', name: 'Price List', screen: 'Price List', icon: 'assessment', iconColor: '#1E3A5F' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '41', name: 'Quarter Summary', screen: 'Quarter Summary', icon: 'swap-horiz', iconColor: '#5E35B1' },
        ],
    },
     {
        title: 'Y',
        data: [
            { id: '42', name: 'Weft Issue Return', screen: 'Weft Issue Return', icon: 'precision-manufacturing', iconColor: '#991070' },
        ],
    },


];