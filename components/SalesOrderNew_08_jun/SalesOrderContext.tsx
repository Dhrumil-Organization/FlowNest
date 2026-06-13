import React, { createContext, useContext, useState } from 'react';

const SalesOrderContext = createContext(null);

export const SalesOrderProvider = ({ children }) => {
    const [salesOrderParams, setSalesOrderParams] = useState({
        mode: 'ADD', // ADD / EDIT / VIEW
        uid: '',
        prpcode: '',
        strcode: '',
        yearno: '',
        token: '',
    });

    const startNewOrder = params => {
        setSalesOrderParams({
            mode: 'ADD',
            uid: '',
            prpcode: params?.prpcode || '',
            strcode: params?.strcode || '',
            yearno: params?.yearno || '',
            token: params?.token || '',
        });
    };

    const loadExistingOrder = params => {
        setSalesOrderParams({
            mode: params?.mode || 'EDIT',
            uid: params?.uid || '',
            prpcode: params?.prpcode || '',
            strcode: params?.strcode || '',
            yearno: params?.yearno || '',
            token: params?.token || '',
        });
    };

    const clearSalesOrder = () => {
        setSalesOrderParams({
            mode: 'ADD',
            uid: '',
            prpcode: '',
            strcode: '',
            yearno: '',
            token: '',
        });
    };

    return (
        <SalesOrderContext.Provider
            value={{
                salesOrderParams,
                startNewOrder,
                loadExistingOrder,
                clearSalesOrder,
            }}>
            {children}
        </SalesOrderContext.Provider>
    );
};

export const useSalesOrder = () => {
    const ctx = useContext(SalesOrderContext);

    if (!ctx) {
        throw new Error('useSalesOrder must be used inside SalesOrderProvider');
    }

    return ctx;
};