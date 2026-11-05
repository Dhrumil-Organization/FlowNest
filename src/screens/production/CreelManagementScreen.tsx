import React from 'react';
import Module from '../creelManagement/CreelManagementModule';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Creel Management System: creel browse, start session, carton scan / issue, finalize. Token + API host from ErpSessionGate.
export function CreelManagementScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
