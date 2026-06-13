const APP_SECTIONS = [
  
    {
        title: 'Y',
        data: [
            { id: '5', name: 'Purchase Order', screen: 'Yarn Purchase Order', icon: 'attach-money', iconColor: '#1F7006' },
        ],
    },
    {
        title: 'G',
        data: [
            { id: '6', name: 'Grey Purchase Order', screen: 'Grey Purchase Order', icon: 'payments', iconColor: '#3BAD18' },
            { id: '7', name: 'Sales Order', screen: 'Sales Order', icon: 'point-of-sale', iconColor: '#20BEC1' },
        ],
    },
    // Only For Sudamo
    {
        title: 'P',
        data: [
            { id: '8', name: 'Production Order Tracking', screen: 'Production Order Tracking', icon: 'track-changes', iconColor: '#CE9F78' },
        ],
    },
    {
        title: 'N',
        data: [
            { id: '9', name: 'New Account Request', screen: 'New Account Request', icon: 'account-balance', iconColor: '#E982F6' },
        ],
    },
    {
        title: 'M',
        data: [
            { id: '10', name: 'Monthly Expense Report', screen: 'Monthly Expense Report', icon: 'table-chart', iconColor: '#D35400' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '11', name: 'Snap View', screen: 'Snap View', icon: 'table-view', iconColor: '#ABC00B' },
        ],
    },
    {
        title: 'R',
        data: [
            { id: '12', name: 'Receivables', screen: 'Receivables', icon: 'receipt-long', iconColor: '#773F3F' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '13', name: 'Packing Automation', screen: 'Packing Automation', icon: 'table-view', iconColor: 'rgb(194, 213, 52)' },
        ],
    },
    {
        title: 'I',
        data: [
            { id: '14', name: 'Inquiry', screen: 'Inquiry', icon: 'table-view', iconColor: 'rgb(194, 213, 52)' },
        ],
    },
    {
        title: 'R',
        data: [
            { id: '15', name: 'Payable', screen: 'Payable', icon: 'payment', iconColor: '#521313' },
        ],
    },
    {
        title: 'D',
        data: [
            { id: '16', name: 'Daily Collection Report', screen: 'Daily Collection Report', icon: 'collections-bookmark', iconColor: '#5B2CFF' },
        ],
    },
    // Only For Sudamo
    {
        title: 'T',
        data: [
            { id: '17', name: 'Taka Checking Entry', screen: 'Taka Checking Entry', icon: 'dynamic-form', iconColor: '#5B2CFF' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '18', name: 'Sales Order Tracking', screen: 'Sales Order Tracking', icon: 'track-changes', iconColor: '#DB945A' },
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

];