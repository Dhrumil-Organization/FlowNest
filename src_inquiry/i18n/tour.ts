// Simple in-memory i18n for tour text.
// User can toggle language; persisted in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type TourLanguage = 'en' | 'hi';

const STORAGE_KEY = 'tour_language';

interface Strings {
  // Common
  next: string;
  back: string;
  skip: string;
  done: string;
  switchLanguage: string;
  startTour: string;

  // Dashboard tour
  welcome_title: string;
  welcome_body: string;
  card_title: string;
  card_body: string;
  status_title: string;
  status_body: string;
  filter_title: string;
  filter_body: string;
  notes_title: string;
  notes_body: string;
  edit_title: string;
  edit_body: string;
  new_title: string;
  new_body: string;

  // Inquiry form tour
  party_title: string;
  party_body: string;
  designs_title: string;
  designs_body: string;
  shades_title: string;
  shades_body: string;
  delivery_title: string;
  delivery_body: string;

  // Costing tour
  costing_tabs_title: string;
  costing_tabs_body: string;
  cost_sheet_title: string;
  cost_sheet_body: string;
  auth_title: string;
  auth_body: string;
}

const en: Strings = {
  next: 'Next',
  back: 'Back',
  skip: 'Skip tour',
  done: 'Done',
  switchLanguage: 'हिंदी में देखें',
  startTour: 'Take a tour',

  welcome_title: 'Welcome!',
  welcome_body:
    'This is your fabric inquiry manager. Let me show you around in a few quick steps.',
  card_title: 'Inquiry cards',
  card_body:
    'Each inquiry shows up here as a card. Tap any card to open its full details.',
  status_title: 'Status pill',
  status_body:
    'The colored pill shows where the inquiry is in the workflow — pending, costed, sent, etc.',
  filter_title: 'Filter your view',
  filter_body:
    'Use these chips to filter inquiries by status or TAT health. Tap "Breached" to see what needs attention.',
  notes_title: 'Notes (chat)',
  notes_body:
    'Tap this to leave notes about an inquiry — like a WhatsApp chat. Your team can see and reply.',
  edit_title: 'Edit & delete',
  edit_body:
    'You can only edit or delete an inquiry while it is in "Pending Costing". Once costed, these buttons disappear.',
  new_title: 'Create new inquiry',
  new_body: 'Tap this + button to start a new inquiry from scratch.',

  party_title: 'Pick the party',
  party_body:
    'First, choose which party this inquiry is for. You can also add a new party using their GSTIN.',
  designs_title: 'Add designs',
  designs_body:
    'One inquiry can have multiple designs. Add each design with its construction details.',
  shades_title: 'Multiple shades',
  shades_body:
    'For each design, list the shades you need with quantity. The stock will show next to each shade.',
  delivery_title: 'Delivery date',
  delivery_body: 'Set when the party needs the goods. This drives planning.',

  costing_tabs_title: 'Two costing methods',
  costing_tabs_body:
    'Simple Costing is a quick rate-per-unit entry. Cost Sheet (new) is the full breakdown with all charges.',
  cost_sheet_title: 'Cost sheet breakdown',
  cost_sheet_body:
    'Enter greige rate, dyeing, freight, overheads etc. The system computes your gross margin live.',
  auth_title: 'Submit for authorization',
  auth_body:
    'Once filled, submit for authorization. The approver will review your costing and approve or reject.',
};

const hi: Strings = {
  next: 'Aage',
  back: 'Peeche',
  skip: 'Tour chhodein',
  done: 'Ho gaya',
  switchLanguage: 'Show in English',
  startTour: 'Tour shuru karein',

  welcome_title: 'Swagat hai!',
  welcome_body:
    'Yeh aapka fabric inquiry manager hai. Kuch quick steps mein main aapko sab kuch dikhata hoon.',
  card_title: 'Inquiry cards',
  card_body:
    'Har inquiry yahan ek card mein dikhti hai. Kisi bhi card pe tap karein to uska poora detail open ho jaayega.',
  status_title: 'Status pill',
  status_body:
    'Colored pill se pata chalta hai inquiry kahan hai workflow mein — pending, costed, sent, etc.',
  filter_title: 'View filter karein',
  filter_body:
    'In chips se status ya TAT health ke hisaab se filter karein. "Breached" tap karke woh dekho jinhe attention chahiye.',
  notes_title: 'Notes (chat)',
  notes_body:
    'Inquiry pe notes likhne ke liye yeh tap karein — WhatsApp jaisa chat. Aapki team dekh sakti hai aur reply bhi.',
  edit_title: 'Edit aur delete',
  edit_body:
    'Sirf "Pending Costing" status mein hi inquiry edit ya delete kar sakte hain. Costed hone ke baad yeh buttons gayab ho jaate hain.',
  new_title: 'Nayi inquiry banayein',
  new_body: 'Yeh + button tap karein nayi inquiry shuru karne ke liye.',

  party_title: 'Party select karein',
  party_body:
    'Pehle decide karein yeh inquiry kis party ke liye hai. Naya party bhi GSTIN se add kar sakte hain.',
  designs_title: 'Designs add karein',
  designs_body:
    'Ek inquiry mein multiple designs ho sakte hain. Har design ke saath uski construction details daaliye.',
  shades_title: 'Multiple shades',
  shades_body:
    'Har design ke liye shades aur quantity list karein. Har shade ke saath uska stock bhi dikhega.',
  delivery_title: 'Delivery date',
  delivery_body:
    'Party ko goods kab chahiye, woh date set karein. Planning isi se hoti hai.',

  costing_tabs_title: 'Do costing methods',
  costing_tabs_body:
    'Simple Costing seedha rate-per-unit hai. Cost Sheet (new) mein poora breakdown hai saare charges ke saath.',
  cost_sheet_title: 'Cost sheet breakdown',
  cost_sheet_body:
    'Greige rate, dyeing, freight, overheads sab daalein. System apne aap gross margin nikalega.',
  auth_title: 'Authorization ke liye submit karein',
  auth_body:
    'Fill karne ke baad authorization ke liye bhejein. Approver aapki costing review karega aur approve ya reject karega.',
};

class I18n {
  private current: TourLanguage = 'en';
  private listeners: Array<() => void> = [];

  async load() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') {
        this.current = saved;
      }
    } catch {
      // ignore
    }
  }

  get language(): TourLanguage {
    return this.current;
  }

  get strings(): Strings {
    return this.current === 'hi' ? hi : en;
  }

  async setLanguage(lang: TourLanguage) {
    this.current = lang;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    this.listeners.forEach(fn => fn());
  }

  toggle() {
    return this.setLanguage(this.current === 'en' ? 'hi' : 'en');
  }

  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }
}

export const i18n = new I18n();

// Hook for components to use i18n
import {useEffect, useState} from 'react';

export const useTourStrings = (): Strings => {
  const [, force] = useState(0);
  useEffect(() => {
    return i18n.subscribe(() => force(c => c + 1));
  }, []);
  return i18n.strings;
};
