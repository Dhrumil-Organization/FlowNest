import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './PaymentsMadeCard.css';

const rowColors = ['#6e278e', '#236449', '#365c9b', '#a34f38', '#ab7b2e', '#288783'];

function formatMoney(amount, compact = true) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return '₹0';
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  if (compact && absolute >= 10000000) return `${sign}₹${(absolute / 10000000).toFixed(2)} Cr`;
  if (compact && absolute >= 100000) return `${sign}₹${(absolute / 100000).toFixed(2)} L`;
  return `${sign}₹${absolute.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function rawDate(input) {
  return String(input ?? '').replace(/\D/g, '');
}

function parsedDate(ymd) {
  const value = rawDate(ymd);
  const day = Number(value.slice(6, 8));
  const month = Number(value.slice(4, 6));
  const year = Number(value.slice(0, 4));
  if (value.length !== 8 || !year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function labelForDay(value) {
  const d = parsedDate(value);
  return d ? `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-GB', { month: 'short' })}` : value;
}

/**
 * Exact artifact-style dashboard CARD presentation; data is never mocked.
 *
 * Integration contract:
 *   loadPaymentsMade({ prptype, date, day, yearno, prpcode, prpcodes })
 *   -> return API `data` (or an Axios response with `data.data`).
 *   onOpenFullReport({ date, day, prptype, prpcode, prpcodes })
 *   onOpenPayment({ ...payment, date, day, prptype })
 *
 * Keep the authenticated API client and the existing report routes in the parent.
 */
export default function PaymentsMadeCard({
  asOfDate,
  prptype = 'S',
  yearno,
  prpcode,
  prpcodes,
  loadPaymentsMade,
  onOpenFullReport,
  onOpenPayment,
  className = '',
}) {
  const asOf = rawDate(asOfDate);
  const [chosenDay, setChosenDay] = useState(asOf);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState('');
  const [expandedPayment, setExpandedPayment] = useState(null);
  const codesSignature = Array.isArray(prpcodes) ? prpcodes.join('|') : '';

  useEffect(() => {
    setChosenDay(asOf);
    setHovered('');
  }, [asOf, prptype, prpcode, codesSignature]);

  const fetchData = useCallback(async (day, signal) => {
    if (typeof loadPaymentsMade !== 'function') {
      throw new Error('Payments Made loader is not connected to the authenticated dashboard API.');
    }
    const result = await loadPaymentsMade({
      prptype,
      date: asOf,
      day: day || asOf,
      ...(yearno != null ? { yearno } : {}),
      ...(prpcode ? { prpcode } : {}),
      ...(Array.isArray(prpcodes) && prpcodes.length ? { prpcodes } : {}),
    }, signal);
    const response = result?.data?.data || result?.data || result;
    if (!response?.summary || !Array.isArray(response?.daily)) {
      throw new Error('Payments Made API returned an unexpected response.');
    }
    return response;
  }, [loadPaymentsMade, prptype, asOf, yearno, prpcode, codesSignature]);

  useEffect(() => {
    if (!asOf) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    fetchData(chosenDay || asOf, controller.signal)
      .then(result => { if (active) setData(result); })
      .catch(err => {
        if (active && err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
          setError(err?.message || 'Unable to load payment data.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [asOf, chosenDay, fetchData]);

  const daily = Array.isArray(data?.daily) ? data.daily : [];
  const payments = Array.isArray(data?.payments) ? data.payments : [];
  const selected = String(data?.selected_date || chosenDay);
  const maxAmount = useMemo(() => Math.max(1, ...daily.map(row => Number(row.amount) || 0)), [daily]);
  const activeDays = useMemo(() => daily.filter(day => Number(day.payment_count) > 0), [daily]);
  const tooltipDay = daily.find(row => String(row.date) === hovered);
  const openReport = () => {
    if (typeof onOpenFullReport === 'function') {
      onOpenFullReport({ prptype, date: asOf, day: selected, prpcode, prpcodes });
    } else {
      setExpandedPayment({ _isReport: true });
    }
  };
  const openPayment = (payment) => {
    if (typeof onOpenPayment === 'function') {
      onOpenPayment({ ...payment, date: asOf, day: selected, prptype });
    } else {
      setExpandedPayment(payment);
    }
  };

  return (
    <section className={`pm-card ${className}`} aria-label="Payments Made">
      <div className="pm-card-head">
        <span className="pm-card-title"><span aria-hidden="true" className="pm-title-icon">💸</span> PAYMENTS MADE</span>
        <div className="pm-head-actions">
          <span className="pm-fy">{data?.fy_label || 'FY'}</span>
          <button className="pm-full-report" type="button" onClick={openReport}>Full report ›</button>
          <span className="pm-from-accounts">from accounts</span>
        </div>
      </div>

      <div className="pm-content">
        <div className="pm-totals">
          <div><span className="pm-kicker">TODAY</span><strong className="pm-today">{formatMoney(data?.summary?.today_amount)}</strong></div>
          <div><span className="pm-kicker">THIS MONTH</span><strong>{formatMoney(data?.summary?.month_amount)}</strong></div>
        </div>

        <div className="pm-chart-section">
          <div className="pm-bars" role="group" aria-label="Payments by day; hover or select a bar for payment details">
            {daily.map((row) => {
              const isSelected = String(row.date) === selected;
              const isHovered = String(row.date) === hovered;
              const height = Math.max(Number(row.amount) > 0 ? 5 : 0, (Number(row.amount || 0) / maxAmount) * 100);
              return (
                <button
                  type="button"
                  key={row.date}
                  className={`pm-chart-day ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                  aria-label={`${labelForDay(row.date)}: ${formatMoney(row.amount, false)}, ${row.payment_count} payments, ${row.party_count} parties`}
                  aria-pressed={isSelected}
                  onClick={() => { setChosenDay(String(row.date)); setHovered(String(row.date)); }}
                  onMouseEnter={() => setHovered(String(row.date))}
                  onMouseLeave={() => setHovered('')}
                  onFocus={() => setHovered(String(row.date))}
                  onBlur={() => setHovered('')}
                >
                  <div className="pm-bar-track"><div className="pm-bar" style={{ height: `${height}%` }} /></div>
                  <span className="pm-tick">{row.day}</span>
                </button>
              );
            })}
          </div>
          {tooltipDay && (
            <div className="pm-chart-tooltip" role="status">
              <strong>{labelForDay(tooltipDay.date)} · {formatMoney(tooltipDay.amount, false)}</strong>
              <span>{tooltipDay.payment_count} payments · {tooltipDay.party_count} parties</span>
            </div>
          )}
        </div>

        <div className="pm-divider" />
        <div className="pm-days" role="group" aria-label="Days with recorded payments">
          {activeDays.length ? activeDays.map((day) => (
            <button
              type="button" key={day.date}
              className={`pm-day-pill ${String(day.date) === selected ? 'is-active' : ''}`}
              onClick={() => { setChosenDay(String(day.date)); setHovered(''); }}
              aria-pressed={String(day.date) === selected}
              title={`${formatMoney(day.amount, false)} · ${day.payment_count} payments`}
            >{labelForDay(day.date)}</button>
          )) : <span className="pm-day-empty">No payment days this month</span>}
        </div>

        <div className="pm-selected-caption">{selected === asOf ? 'TODAY' : labelForDay(selected).toUpperCase()} · {data?.summary?.selected_day_payment_count ?? 0} PAYMENTS</div>
        <div className="pm-payment-list" aria-label="Selected day payments">
          {payments.map((item, index) => (
            <button className="pm-payment-item" type="button"
              key={`${item.prpcode}-${item.payment_uid}-${item.payment_srno}`}
              onClick={() => openPayment(item)}>
              <span className="pm-party-color" style={{ background: rowColors[index % rowColors.length] }} aria-hidden="true" />
              <span className="pm-party-detail">
                <strong>{item.party_name || item.party_code}</strong>
                <small>{[
                  item.voucher_no,
                  item.payment_method,
                  Number(item.bill_count) > 0 ? `${item.bill_count} ${item.bill_count === 1 ? 'bill' : 'bills'}` : 'on account',
                ].filter(Boolean).join(' · ')}</small>
              </span>
              <strong className="pm-party-amount">{formatMoney(item.amount)}</strong>
            </button>
          ))}
          {!loading && !error && !payments.length && <p className="pm-no-payments">No payments recorded for this day.</p>}
        </div>

        {loading && <div className="pm-loading" role="status">Loading payments…</div>}
        {error && <div className="pm-error" role="alert">{error}</div>}
        <p className="pm-footnote">Tap a day on the chart for its payments · a payment opens the party in the full report, with its bill-wise adjustment and voucher.</p>
      </div>

      {expandedPayment && (
        <div className="pm-overlay" role="presentation" onMouseDown={() => setExpandedPayment(null)}>
          <div className="pm-detail-dialog" role="dialog" aria-modal="true" aria-label="Payment details" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="pm-close" aria-label="Close details" onClick={() => setExpandedPayment(null)}>×</button>
            <h3>{expandedPayment._isReport ? 'Full payment report' : (expandedPayment.party_name || expandedPayment.party_code)}</h3>
            {expandedPayment._isReport ? (
              <p>Connect <code>onOpenFullReport</code> to the existing authorized accounting report route. This card does not guess or replace that route.</p>
            ) : (
              <>
                <p><strong>Voucher:</strong> {expandedPayment.voucher_no}</p>
                <p><strong>Amount:</strong> {formatMoney(expandedPayment.amount, false)}</p>
                <p><strong>Linked purchase bills:</strong> {expandedPayment.bill_count}</p>
                <p><strong>Amount allocated:</strong> {formatMoney(expandedPayment.settled_amount, false)}</p>
                <p>Connect <code>onOpenPayment</code> to the existing voucher and bill-wise adjustment report for the actual linked records.</p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
