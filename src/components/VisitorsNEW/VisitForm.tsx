// FILE: src/components/VisitorsNEW/VisitForm.tsx
// The entry form of the Visits screen (full-screen, English / Hindi). The
// Visitors Report opens the same form to correct an entry.
//
//   ① Who has come?      one or MANY people: mobile, name and COMPANY for each.
//                        Mobile / name / company → people from
//                        EARLIER VISITS appear and fill the form (an exact
//                        10-digit mobile fills by itself). Any number of
//                        photos per person: face, visiting card, other.
//   ② Why / whom?        purpose, work details, whom to meet (typed; names used
//                        before are offered as chips), appointment
//   ③ Time & note        in date + time (default: now), note
//
// Everything is optional — a name, a mobile number or one photo is enough.
// "Save + Next" saves and clears the form for the next visitor in the queue.
// In edit mode the form shows ONE person (the entry being corrected) and a
// Delete button when the user has that right.
// There is NO master: every suggestion comes from earlier visits (api.ts →
// searchVisitors / fetchSuggestions).
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimeField } from '../DoffEntryNEW/ui';
import { Btn } from '../StockVerificationNEW/ui';
import { addVisits, Api, apiErrorText, searchVisitors, updateVisit } from './api';
import { StrKey, t } from './i18n';
import {
  buildPayloads, cleanMobile, emptyPerson, emptyShared, fmtDate, fmtMobile, fmtTime, GENDERS, isBlankPerson, isMobileOk,
  Lang, PersonDraft, PhotoKind, PURPOSES, str, suggestFor, toDraft, Visit, VisitorProfile, VisitorSuggestions, VisitPhoto,
  VisitShared,
} from './model';
import { PhotoPermissionError, pickPhotos, takePhoto } from './photos';
import { Avatar, ChipGroup, HIT, LangToggle, PhotoButton, PhotoStrip, PhotoViewer, Section, Stepper, Suggest, TextField, v } from './ui';

type Props = {
  open: boolean;
  api: Api;
  lang: Lang;
  onLang: (l: Lang) => void;
  /** Words used in earlier visits (company, whom to meet). */
  suggestions: VisitorSuggestions;
  /** Entry being corrected; null / undefined = new entry. */
  editing?: Visit | null;
  /** Mobile numbers that are inside right now (to warn about a double entry). */
  insideMobiles: Set<string>;
  onClose: () => void;
  /** Called after every successful save. `keepOpen` = the form stays open for the next visitor. */
  onSaved: (visits: Visit[], keepOpen: boolean) => void;
  /** Edit mode only: shows a Delete button (pass it only when the user has the delete right). */
  onDelete?: (visit: Visit) => void;
  /** Hide the English / Hindi switch (the report is English only). */
  hideLang?: boolean;
};

type PhotoTarget = { personKey: string };
type FieldKey = 'host';

export default function VisitForm({ open, api, lang, onLang, suggestions, editing, insideMobiles, onClose, onSaved, onDelete, hideLang }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const isEdit = !!editing;
  const tr = useCallback((key: StrKey, vars?: Record<string, string | number>) => t(lang, key, vars), [lang]);

  const [people, setPeople] = useState<PersonDraft[]>([emptyPerson()]);
  const [shared, setShared] = useState<VisitShared>(emptyShared());
  const [moreOpen, setMoreOpen] = useState<Record<string, boolean>>({});
  const [known, setKnown] = useState<Record<string, number>>({});              // personKey -> earlier visits
  const [found, setFound] = useState<Record<string, VisitorProfile[]>>({});    // personKey -> people who came before
  const [active, setActive] = useState<FieldKey | ''>('');                       // free-text field showing suggestions
  const [companyFor, setCompanyFor] = useState('');                              // personKey whose company field shows suggestions
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState<'' | 'save' | 'next'>('');
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [viewer, setViewer] = useState<{ target: PhotoTarget; index: number } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const lookupSeq = useRef(0);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------- (re)start when opened ------------------------ */
  const reset = useCallback(() => {
    if (editing) {
      const d = toDraft(editing);
      setPeople([d.person]);
      setShared(d.shared);
      setMoreOpen({ [d.person.key]: !!(d.person.designation || d.person.altMobile || d.person.gender) });
    } else {
      setPeople([emptyPerson()]);
      setShared(emptyShared());
      setMoreOpen({});
    }
    setKnown({});
    setFound({});
    setActive('');
    setCompanyFor('');
    setTouched(false);
    setError('');
  }, [editing]);

  useEffect(() => {
    if (!open) return;
    reset();
    setSavedNote('');
    setSaving('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  useEffect(() => () => { if (lookupTimer.current) clearTimeout(lookupTimer.current); }, []);

  /* ------------------------------- setters -------------------------------- */
  const setP = (key: string, patch: Partial<PersonDraft>) => {
    setTouched(true);
    setError('');
    setPeople((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };
  const setS = (patch: Partial<VisitShared>) => {
    setTouched(true);
    setError('');
    setShared((s) => ({ ...s, ...patch }));
  };

  /** Fill a person (and the empty shared fields) from someone who came before. */
  const applyProfile = useCallback((key: string, profile: VisitorProfile, overwrite: boolean) => {
    setPeople((list) => list.map((p) => {
      if (p.key !== key) return p;
      const keep = (cur: string, next: string) => (overwrite ? next || cur : cur || next);
      return {
        ...p,
        mobile: keep(p.mobile, profile.mobile),
        name: keep(p.name, profile.name),
        company: keep(p.company, profile.company),
        designation: keep(p.designation, profile.designation),
      };
    }));
    setKnown((k) => ({ ...k, [key]: profile.visits }));
    setFound((m) => ({ ...m, [key]: [] }));
    setTouched(true);
  }, []);

  /**
   * Look up earlier visits while the watchman types the mobile, the name or the company.
   * An exact 10-digit mobile fills the form by itself; otherwise the matches
   * are listed under the fields and one tap fills everything.
   */
  const lookup = (key: string, text: string, kind: 'mobile' | 'name' | 'company') => {
    if (isEdit) return;
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    const enough = kind === 'mobile' ? text.length >= 4 : str(text).length >= 3;
    if (!enough) { setFound((m) => ({ ...m, [key]: [] })); return; }
    const seq = ++lookupSeq.current;
    lookupTimer.current = setTimeout(() => {
      searchVisitors(api, text)
        .then((rows) => {
          if (seq !== lookupSeq.current) return;
          const exact = kind === 'mobile' && text.length === 10 ? rows.find((r) => r.mobile === text) : undefined;
          if (exact) applyProfile(key, exact, false);
          else setFound((m) => ({ ...m, [key]: rows.slice(0, 4) }));
        })
        .catch(() => undefined);
    }, kind === 'mobile' && text.length === 10 ? 0 : 280);
  };

  const onMobile = (key: string, raw: string) => {
    const mobile = cleanMobile(raw);
    setP(key, { mobile });
    setKnown((k) => { if (!(key in k)) return k; const n = { ...k }; delete n[key]; return n; });
    lookup(key, mobile, 'mobile');
  };
  const onName = (key: string, name: string) => {
    setP(key, { name });
    if (!known[key]) lookup(key, name, 'name');
  };
  const onCompany = (key: string, company: string) => {
    setP(key, { company });
    // people of that company who came before (only while the person is still unknown)
    const p = people.find((x) => x.key === key);
    if (!known[key] && p && !str(p.name) && !p.mobile) lookup(key, company, 'company');
  };

  /* -------------------------------- photos -------------------------------- */
  const photosOf = (target: PhotoTarget): VisitPhoto[] => people.find((p) => p.key === target.personKey)?.photos || [];

  const addPhotos = (target: PhotoTarget, photos: VisitPhoto[]) => {
    if (!photos.length) return;
    setPeople((list) => list.map((p) => (p.key === target.personKey ? { ...p, photos: [...p.photos, ...photos] } : p)));
    setTouched(true);
    setError('');
  };

  const capture = async (target: PhotoTarget, kind: PhotoKind, source: 'camera' | 'gallery') => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      if (source === 'camera') {
        const photo = await takePhoto(kind);
        if (photo) addPhotos(target, [photo]);
      } else {
        addPhotos(target, await pickPhotos(kind));
      }
    } catch (e) {
      AppAlert.alert(tr('photos'), e instanceof PhotoPermissionError ? tr('noCamera') : tr('photoFailed'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = (target: PhotoTarget, id: string) => {
    setTouched(true);
    setPeople((list) => list.map((p) => (p.key === target.personKey ? { ...p, photos: p.photos.filter((x) => x.id !== id) } : p)));
  };

  /* --------------------------------- save --------------------------------- */
  const filled = useMemo(() => people.filter((p) => !isBlankPerson(p)), [people]);

  const submit = async (keepOpen: boolean, force = false) => {
    if (saving) return;
    if (!filled.length) { setError(tr('needOne')); return; }
    const badIndex = people.findIndex((p) => !isBlankPerson(p) && (!isMobileOk(p.mobile) || !isMobileOk(p.altMobile)));
    if (badIndex >= 0) { setError(tr('badMobile', { n: badIndex + 1 })); return; }
    if (new Date(shared.inAt).getTime() > Date.now() + 5 * 60000) { setError(tr('futureTime')); return; }

    if (!isEdit && !force) {
      const dup = filled.find((p) => p.mobile && insideMobiles.has(p.mobile));
      if (dup) {
        AppAlert.alert(tr('alreadyInsideTitle'), tr('alreadyInside', { name: str(dup.name) || fmtMobile(dup.mobile) }), [
          { text: tr('cancel'), style: 'cancel' },
          { text: tr('saveAnyway'), onPress: () => { void submit(keepOpen, true); } },
        ]);
        return;
      }
    }

    setSaving(keepOpen ? 'next' : 'save');
    setError('');
    try {
      const payloads = buildPayloads(people, shared);
      const result = isEdit && editing ? [await updateVisit(api, editing.id, payloads[0])] : await addVisits(api, payloads);
      onSaved(result, keepOpen);
      if (keepOpen) {
        // next visitor in the queue: blank form, time = now
        setPeople([emptyPerson()]);
        setShared(emptyShared());
        setMoreOpen({});
        setKnown({});
        setFound({});
        setActive('');
        setCompanyFor('');
        setTouched(false);
        setSavedNote(result.length === 1 ? tr('saved1', { no: result[0].visitNo }) : tr('savedN', { n: result.length }));
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    } catch (e) {
      setError(apiErrorText(e));
    } finally {
      setSaving('');
    }
  };

  const requestClose = () => {
    if (saving) return;
    if (!touched) { onClose(); return; }
    AppAlert.alert(tr('discardTitle'), tr('discardMsg'), [
      { text: tr('keepEditing'), style: 'cancel' },
      { text: tr('discard'), style: 'destructive', onPress: onClose },
    ]);
  };

  /* -------------------------------- render -------------------------------- */
  const inDate = new Date(shared.inAt);
  const hints = (field: FieldKey, list: string[], typed: string) => (active === field ? suggestFor(list, typed, 5) : []);

  const renderPerson = (p: PersonDraft, index: number) => {
    const more = !!moreOpen[p.key];
    const target: PhotoTarget = { personKey: p.key };
    const count = (kind: PhotoKind) => p.photos.filter((x) => x.kind === kind).length;
    const before = found[p.key] || [];
    return (
      <View key={p.key} style={f.person}>
        <View style={f.personHead}>
          <Avatar uri={p.photos.find((x) => x.kind === 'visitor')?.uri} name={p.name || String(index + 1)} size={38} />
          <Text style={f.personTitle}>{tr('person', { n: index + 1 })}</Text>
          {people.length > 1 ? (
            <TouchableOpacity
              style={f.removeBtn}
              onPress={() => { setTouched(true); setPeople((list) => list.filter((x) => x.key !== p.key)); }}
              hitSlop={HIT}
              accessibilityRole="button"
            >
              <Icon name="delete-outline" size={18} color={T.red} />
              <Text style={f.removeText}>{tr('removePerson')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={f.row}>
          <TextField
            label={tr('mobile')}
            icon="phone"
            value={p.mobile}
            onChangeText={(x: string) => onMobile(p.key, x)}
            placeholder={tr('mobilePh')}
            keyboardType="number-pad"
            maxLength={10}
            error={p.mobile && !isMobileOk(p.mobile) && p.mobile.length === 10 ? tr('badMobile', { n: index + 1 }) : undefined}
          />
          <TextField
            label={tr('name')}
            icon="person"
            value={p.name}
            onChangeText={(x: string) => onName(p.key, x)}
            placeholder={tr('namePh')}
            autoCapitalize="words"
          />
          <View style={f.cell}>
            <TextField
              label={tr('company')}
              icon="business"
              value={p.company}
              onChangeText={(x: string) => onCompany(p.key, x)}
              onFocus={() => { setCompanyFor(p.key); setActive(''); }}
              placeholder={tr('companyPh')}
              autoCapitalize="words"
              style={f.fill}
            />
            <Suggest
              items={companyFor === p.key ? suggestFor(suggestions.companies, p.company, 4) : []}
              onPick={(x) => { setP(p.key, { company: x }); setCompanyFor(''); }}
            />
          </View>
        </View>

        {known[p.key] ? (
          <View style={f.known}>
            <Icon name="history" size={18} color={T.green} />
            <Text style={f.knownText}>{tr('knownFilled', { n: known[p.key] })}</Text>
          </View>
        ) : before.length ? (
          <View style={f.before}>
            <View style={f.beforeHead}>
              <Icon name="person-search" size={17} color={T.yd} />
              <Text style={f.beforeTitle}>{tr('cameBefore')}</Text>
              <TouchableOpacity onPress={() => setFound((m) => ({ ...m, [p.key]: [] }))} hitSlop={HIT} accessibilityLabel={tr('close')}>
                <Icon name="close" size={17} color={T.yd} />
              </TouchableOpacity>
            </View>
            {before.map((item) => (
              <TouchableOpacity key={item.key} style={f.beforeRow} onPress={() => applyProfile(p.key, item, true)} accessibilityRole="button" accessibilityLabel={`Fill ${item.name || item.mobile}`}>
                <Avatar uri={item.photo} name={item.name || item.mobile} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={f.beforeName} numberOfLines={1}>{item.name || fmtMobile(item.mobile)}</Text>
                  <Text style={f.beforeSub} numberOfLines={1}>
                    {[item.mobile ? fmtMobile(item.mobile) : '', item.company].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={f.beforeCount}>{tr('visitsN', { n: item.visits })}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View>
          <Text style={v.label}>{tr('photos')} <Text style={f.soft}>· {tr('photoHint')}</Text></Text>
          <View style={f.photoBtns}>
            <PhotoButton icon="face" label={tr('addFace')} busy={photoBusy} count={count('visitor')} onPress={() => capture(target, 'visitor', 'camera')} />
            <PhotoButton icon="contact-mail" label={tr('addCard')} busy={photoBusy} count={count('card')} onPress={() => capture(target, 'card', 'camera')} />
            <PhotoButton icon="photo-camera" label={tr('addOther')} busy={photoBusy} count={count('other')} onPress={() => capture(target, 'other', 'camera')} />
            <PhotoButton icon="photo-library" label={tr('fromGallery')} busy={photoBusy} onPress={() => capture(target, 'other', 'gallery')} />
          </View>
          {p.photos.length ? (
            <View style={f.photoBox}>
              <Text style={f.photoNote}>{tr('photosTaken', { n: p.photos.length })}</Text>
              <PhotoStrip photos={p.photos} lang={lang} onOpen={(i) => setViewer({ target, index: i })} onRemove={(id) => removePhoto(target, id)} />
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={f.moreBtn} onPress={() => setMoreOpen((m) => ({ ...m, [p.key]: !more }))} accessibilityRole="button" accessibilityState={{ expanded: more }}>
          <Icon name={more ? 'expand-less' : 'expand-more'} size={20} color={T.copper} />
          <Text style={f.moreText}>{more ? tr('less') : tr('more')}</Text>
          <Text style={f.soft}>{tr('moreHint')}</Text>
        </TouchableOpacity>

        {more ? (
          <View style={{ gap: 14 }}>
            <View style={f.row}>
              <TextField label={tr('designation')} icon="work-outline" value={p.designation} onChangeText={(x: string) => setP(p.key, { designation: x })} autoCapitalize="words" />
              <TextField
                label={tr('altMobile')}
                icon="phone"
                value={p.altMobile}
                onChangeText={(x: string) => setP(p.key, { altMobile: cleanMobile(x) })}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <ChipGroup label={tr('gender')} options={GENDERS} value={p.gender} onChange={(x) => setP(p.key, { gender: x as PersonDraft['gender'] })} lang={lang} compact />
          </View>
        ) : null}
      </View>
    );
  };

  const saveLabel = isEdit ? tr('saveChanges') : filled.length > 1 ? tr('saveN', { n: filled.length }) : tr('save');
  const hostHints = hints('host', suggestions.hosts, shared.hostName);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={requestClose} presentationStyle="fullScreen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={f.root}>
        {/* header */}
        <View style={[f.header, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
          <TouchableOpacity style={f.headBtn} onPress={requestClose} accessibilityRole="button" accessibilityLabel={tr('close')}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={f.headEyebrow}>{isEdit && editing ? editing.visitNo : 'MADHUSUDHAN FABRICS'}</Text>
            <Text style={f.headTitle} numberOfLines={1}>{isEdit ? tr('formEdit') : tr('formNew')}</Text>
          </View>
          {hideLang ? null : <LangToggle lang={lang} onChange={onLang} dark />}
        </View>

        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={[f.content, wide && f.contentWide]}>
          {savedNote ? (
            <View style={f.savedNote}>
              <Icon name="check-circle" size={20} color={T.green} />
              <Text style={f.savedText}>{savedNote}</Text>
              <TouchableOpacity onPress={() => setSavedNote('')} hitSlop={HIT} accessibilityLabel={tr('close')}>
                <Icon name="close" size={18} color={T.green} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={f.tip}>
            <Icon name="info-outline" size={18} color={T.yd} />
            <Text style={f.tipText}>{tr('allOptional')}</Text>
          </View>

          {/* ① who */}
          <Section n={1} title={tr('s1')}>
            {people.map(renderPerson)}
            {!isEdit ? (
              <TouchableOpacity
                style={f.addPerson}
                onPress={() => { setTouched(true); setPeople((list) => [...list, emptyPerson(list[0]?.company || '')]); }}
                accessibilityRole="button"
              >
                <Icon name="person-add" size={24} color={T.copper} />
                <View style={{ flex: 1 }}>
                  <Text style={f.addPersonText}>{tr('addPerson')}</Text>
                  <Text style={f.soft}>{tr('addPersonSub')}</Text>
                </View>
              </TouchableOpacity>
            ) : null}
            <View style={f.extraRow}>
              <Text style={[v.label, { flex: 1, marginBottom: 0 }]}>{tr('extraPersons')}</Text>
              <Stepper value={shared.extraPersons} onChange={(n) => setS({ extraPersons: n })} />
            </View>
          </Section>

          {/* ② why / whom */}
          <Section n={2} title={tr('s3')}>
            <ChipGroup label={tr('purpose')} options={PURPOSES} value={shared.purpose} onChange={(x) => setS({ purpose: x })} lang={lang} />
            <View style={f.row}>
              <TextField label={tr('purposeNote')} icon="notes" value={shared.purposeNote} onChangeText={(x: string) => setS({ purposeNote: x })} placeholder={tr('purposeNotePh')} />
            </View>
            <View style={f.row}>
              <View style={f.cell}>
                <TextField label={tr('host')} icon="support-agent" value={shared.hostName} onChangeText={(x: string) => setS({ hostName: x })} onFocus={() => { setActive('host'); setCompanyFor(''); }} placeholder={tr('hostPh')} autoCapitalize="words" style={f.fill} />
                <Suggest items={hostHints} onPick={(x) => { setS({ hostName: x }); setActive(''); }} />
              </View>
            </View>
            <ChipGroup
              label={tr('appointment')}
              options={[
                { value: 'Y', en: 'Yes', hi: 'हाँ', icon: 'event-available' },
                { value: 'N', en: 'No', hi: 'नहीं', icon: 'event-busy' },
              ]}
              value={shared.appointment}
              onChange={(x) => setS({ appointment: x as VisitShared['appointment'] })}
              lang={lang}
              compact
            />
          </Section>

          {/* ③ time / note */}
          <Section n={3} title={tr('s5')}>
            <View style={[f.row, { alignItems: 'flex-end' }]}>
              <DateTimeField
                label={tr('inDate')}
                mode="date"
                value={inDate}
                text={fmtDate(inDate)}
                maximumDate={new Date()}
                onPick={(d) => { setS({ inAt: d.toISOString() }); }}
                style={f.dt}
              />
              <DateTimeField
                label={tr('inClock')}
                mode="time"
                value={inDate}
                text={fmtTime(inDate)}
                onPick={(d) => { setS({ inAt: d.toISOString() }); }}
                style={f.dt}
              />
              <TouchableOpacity style={f.nowBtn} onPress={() => setS({ inAt: new Date().toISOString() })} accessibilityRole="button">
                <Icon name="schedule" size={17} color={T.nav} />
                <Text style={f.nowText}>{tr('nowBtn')}</Text>
              </TouchableOpacity>
            </View>
            <View style={f.row}>
              <TextField label={tr('remarks')} value={shared.remarks} onChangeText={(x: string) => setS({ remarks: x })} placeholder={tr('remarksPh')} multiline />
            </View>
          </Section>

          {isEdit && editing && onDelete ? (
            <TouchableOpacity style={f.deleteBtn} onPress={() => onDelete(editing)} disabled={!!saving} accessibilityRole="button">
              <Icon name="delete-outline" size={20} color={T.red} />
              <Text style={f.deleteText}>{tr('deleteEntry')}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* footer */}
        <View style={[f.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {error ? (
            <View style={f.errBox}>
              <Icon name="error-outline" size={18} color={T.red} />
              <Text style={f.errText}>{error}</Text>
            </View>
          ) : null}
          <View style={[f.footRow, wide && { maxWidth: 860, alignSelf: 'center', width: '100%' }]}>
            {!isEdit ? (
              <Btn label={tr('saveNext')} icon="playlist-add" kind="ghost" onPress={() => submit(true)} loading={saving === 'next'} disabled={!!saving} style={f.footBtn} />
            ) : (
              <Btn label={tr('cancel')} kind="ghost" onPress={requestClose} disabled={!!saving} style={f.footBtn} />
            )}
            <Btn label={saveLabel} icon="check" kind="copper" onPress={() => submit(false)} loading={saving === 'save'} disabled={!!saving} style={[f.footBtn, { flex: 1.5 }]} />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* full-screen photo preview (inside the Modal so it opens above it) */}
      <PhotoViewer
        photos={viewer ? photosOf(viewer.target) : []}
        index={viewer ? viewer.index : null}
        onClose={() => setViewer(null)}
        lang={lang}
        onRemove={viewer ? (id) => removePhoto(viewer.target, id) : undefined}
      />
    </Modal>
  );
}

const f = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 12 },
  headBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  headEyebrow: { color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  headTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 1 },

  content: { padding: 12, gap: 12, paddingBottom: 28 },
  contentWide: { maxWidth: 860, width: '100%', alignSelf: 'center', paddingHorizontal: 18 },
  tip: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#E9F1F6', borderRadius: 12, padding: 11 },
  tipText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: T.yd, fontWeight: '600' },
  savedNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E6F1EA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#B9D8C5' },
  savedText: { flex: 1, fontSize: 14.5, fontWeight: '800', color: T.green },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  fill: { flexGrow: 0, flexBasis: 'auto' },
  soft: { fontSize: 12.5, color: T.muted, fontWeight: '500' },

  person: { borderWidth: 1.5, borderColor: T.border, borderRadius: 14, padding: 12, gap: 14, backgroundColor: '#FDFCFA' },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  personTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: T.nav },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 38, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FCEDEA' },
  removeText: { fontSize: 13, fontWeight: '800', color: T.red },
  known: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E6F1EA', borderRadius: 10, padding: 10 },
  knownText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: T.green },
  before: { backgroundColor: '#E9F1F6', borderRadius: 12, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 4 },
  beforeHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  beforeTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: T.yd },
  beforeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(28,86,122,0.14)' },
  beforeName: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  beforeSub: { fontSize: 12.5, color: '#5E5852', marginTop: 1 },
  beforeCount: { fontSize: 12, fontWeight: '800', color: T.yd },
  photoBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoBox: { marginTop: 12, gap: 10 },
  photoNote: { fontSize: 12.5, fontWeight: '700', color: T.green },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40, flexWrap: 'wrap' },
  moreText: { fontSize: 14, fontWeight: '800', color: T.copper },

  addPerson: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1.5, borderColor: T.copper, borderStyle: 'dashed', backgroundColor: '#FBF3EA',
  },
  addPersonText: { fontSize: 15, fontWeight: '800', color: T.pd },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  quick: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 34, paddingHorizontal: 10, borderRadius: 17, backgroundColor: T.alt },
  quickText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  dt: { flexGrow: 1, flexBasis: 140 },
  nowBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 42, paddingHorizontal: 14, borderRadius: 10, backgroundColor: T.alt },
  nowText: { fontSize: 13.5, fontWeight: '800', color: T.nav },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E3B4AC', backgroundColor: '#FCEDEA',
  },
  deleteText: { fontSize: 14.5, fontWeight: '800', color: T.red },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  footRow: { flexDirection: 'row', gap: 10 },
  footBtn: { flex: 1, height: 52, borderRadius: 12 },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FCEDEA', borderRadius: 10, padding: 10 },
  errText: { flex: 1, color: T.red, fontSize: 13.5, fontWeight: '700' },
});
