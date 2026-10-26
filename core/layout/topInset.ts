import React from 'react';

// true = a parent (the NEW ERP tabs shell's <SafeAreaView edges={['top']}>)
// has already applied the top system inset (notch / status bar). Headers
// rendered below it (SubScreenHeader) must not add insets.top a second time,
// otherwise an empty navy band appears above them on iPhone / Android.
export const TopInsetHandled = React.createContext(false);
