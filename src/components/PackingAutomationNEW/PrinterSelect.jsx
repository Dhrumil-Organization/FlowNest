import React, { useEffect, useState } from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Typography,
} from '@mui/material';
import axios from 'axios';
import { getPrpTypes, fetchPrpConfig, GetApiLink, getToken } from 'utils/comman';

const PrinterSelect = ({ value, onChange, label = 'Printer', required = false, className, setLocked, locked, IsAllowed = 0, storageKey = 'lastSelectedPrinter' }) => {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const renderStatusIcon = (statusText) => {
        if (!statusText || statusText === 'Idle') {
            return <span style={{ color: 'green', fontWeight: 'bold' }}>✔️ Online</span>;
        }
        if (statusText === 'Offline') {
            return <span style={{ color: 'red', fontWeight: 'bold' }}>❌ Offline</span>;
        }
        return <span style={{ color: 'gray', fontWeight: 'bold' }}>⚠️ Unknown</span>;
    };

    useEffect(() => {
        const fetchPrinters = async () => {
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'x-api-key': 'PRINT_SECRET_123',
            };

            setLoading(true);
            try {
                const cfg = await fetchPrpConfig();
                const apiURL = getPrpTypes() == 'R' ? 'http://localhost:4000' : `${GetApiLink()}/api`;
                //const res = await axios.get(`${apiURL}/printers`);
                const res = await axios.get(`${apiURL}/printers`, { headers });
                const printerList = res.data.printers || [];
                setPrinters(printerList);

                const userId = localStorage.getItem('userid');
                let isvis = localStorage.getItem('isvis');
                let defaultPrinter = null;
                if (getPrpTypes() !== 'R') {
                    isvis = '-999';
                }

                // 🔓 If isvis = -999 → allow all printers, no locking
                if (isvis === '-999') {
                    const storedPrinter = localStorage.getItem(storageKey);
                    if (storedPrinter && printerList.find(p => p.Name === storedPrinter)) {
                        onChange(storedPrinter);
                    } else {
                        if (getPrpTypes() == 'R') {
                            //const defRes = await axios.get(`${apiURL}/default-printer`);
                            const defRes = await axios.get(`${apiURL}/default-printer`, { headers });
                            defaultPrinter = defRes.data?.Name;
                            if (defaultPrinter) {
                                onChange(defaultPrinter);
                                localStorage.setItem(storageKey, defaultPrinter);
                            }
                        }
                    }
                    setLocked(false); // ✅ unlocked
                    return;
                }
                if (IsAllowed == 1) {
                    const storedPrinter = localStorage.getItem(storageKey);
                    // else {
                    //     const defRes = await axios.get(`${apiURL}/default-printer`);
                    //     defaultPrinter = defRes.data?.Name;
                    //     if (defaultPrinter) {
                    //         onChange(defaultPrinter);
                    //         localStorage.setItem(storageKey, defaultPrinter);
                    //     }
                    // }
                    setLocked(false); // ✅ unlocked
                    return;
                }

                // 🔒 Otherwise lock user to their specific printer
                if (userId) {
                    const userPrinter = `MTX_BAR_${userId}`;
                    const matchedPrinter = printerList.find(p => p.Name === userPrinter);
                    if (matchedPrinter) {
                        defaultPrinter = matchedPrinter.Name;
                        onChange(defaultPrinter);
                        localStorage.setItem(storageKey, defaultPrinter);
                        setLocked(true); // 🔒 locked
                        return;
                    }
                }

                // 🧩 Fallback to system default
                //const defRes = await axios.get(`${apiURL}/default-printer`);
                if (getPrpTypes() == 'R') {
                    const defRes = await axios.get(`${apiURL}/default-printer`, { headers });
                    defaultPrinter = defRes.data?.Name;
                    if (defaultPrinter) {
                        onChange(defaultPrinter);
                        localStorage.setItem(storageKey, defaultPrinter);
                    }
                }
                setLocked(true); // 🔒 locked for normal users
            } catch (err) {
                setError('❌ Failed to load printers');
            } finally {
                setLoading(false);
            }
        };

        fetchPrinters();
    }, [onChange, storageKey]);

    // Save whenever value changes
    useEffect(() => {
        if (value) {
            localStorage.setItem(storageKey, value);
        }
    }, [value, storageKey]);
    const selectedPrinter = printers.find(p => p.Name === value);
    const statusIcon = selectedPrinter ? renderStatusIcon(selectedPrinter.StatusText) : null;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1 }}>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={loading || printers.length === 0 || locked}
                    // style={{ width: '100%' }}
                    className={className}
                    name="printer"
                >
                    {loading && <option>Loading printers...</option>}

                    {!loading && printers.length === 0 && <option>No printers found</option>}

                    {!loading && printers.length > 0 && (
                        <>
                            <option value="">-- Select Printer --</option>
                            {printers.map((printer) => (
                                <option key={printer.Name} value={printer.Name}>
                                    {/* {printer.Name} {printer.StatusText ? `(${printer.StatusText})` : ''} */}
                                    {printer.Name}
                                </option>
                            ))}
                        </>
                    )}
                </select>
            </div>

            {/* ✅ Inline printer status icon */}
            <div style={{ minWidth: '100px', fontSize: '0.85rem' }}>
                {statusIcon}
            </div>
        </div>
    );
};

export default PrinterSelect;
