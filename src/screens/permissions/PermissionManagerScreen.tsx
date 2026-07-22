import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { T } from "../../theme";
import { useAppSessionStore } from "../../stores/AppSessionStore";
import { AppAccessAPI } from "../../api/accessControl";
import { usePermission } from "../../core/permissions";
import { getPermissionRegistry } from "../../registry";
import type {
  PermissionActionDefinition,
  PermissionAreaDefinition,
  PermissionResourceDefinition,
} from "../../core/permissions/types";

type SourceMode = "role" | "user";
type Draft = Record<string, boolean>;
type Preset = "full" | "view" | "work" | "none";

type SearchResult = {
  areaKey: string;
  areaName: string;
  path: string;
  resource: PermissionResourceDefinition;
  matchedAction?: PermissionActionDefinition;
};

const normalize = (value: string) =>
  value
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.+/g, ".")
    .toLowerCase();

const grantKey = (
  kind: "resource" | "action",
  path: string,
  action?: string,
) =>
  kind === "resource"
    ? `resource::${normalize(path)}`
    : `action::${normalize(path)}::${normalize(action || "")}`;

const prettyType = (type: string) =>
  type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isViewAction = (key: string) =>
  ["view", "open", "preview", "list", "read", "browse"].includes(
    normalize(key),
  );

const isDangerousAction = (key: string) =>
  [
    "delete",
    "authorize",
    "auth",
    "approve",
    "reject",
    "cancel",
    "unlock",
    "post",
  ].includes(normalize(key));

function flattenResource(
  area: PermissionAreaDefinition,
  resource: PermissionResourceDefinition,
  parentPath = "",
): SearchResult[] {
  const path = parentPath ? `${parentPath}.${resource.key}` : resource.key;
  const output: SearchResult[] = [
    { areaKey: area.key, areaName: area.name, path, resource },
  ];

  for (const action of resource.actions || []) {
    output.push({
      areaKey: area.key,
      areaName: area.name,
      path,
      resource,
      matchedAction: action,
    });
  }

  for (const child of resource.children || []) {
    output.push(...flattenResource(area, child, path));
  }

  return output;
}

function collectBranch(
  resource: PermissionResourceDefinition,
  path: string,
): Array<{ path: string; resource: PermissionResourceDefinition }> {
  const output = [{ path, resource }];
  for (const child of resource.children || []) {
    output.push(...collectBranch(child, `${path}.${child.key}`));
  }
  return output;
}

function Toggle({ value, onPress }: { value: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.toggle, value && styles.toggleOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </TouchableOpacity>
  );
}

function StateBadge({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "green" | "blue" | "orange" | "muted";
}) {
  return (
    <View
      style={[
        styles.stateBadge,
        tone === "green" && styles.stateGreen,
        tone === "blue" && styles.stateBlue,
        tone === "orange" && styles.stateOrange,
      ]}
    >
      <Text
        style={[
          styles.stateText,
          tone === "green" && styles.stateGreenText,
          tone === "blue" && styles.stateBlueText,
          tone === "orange" && styles.stateOrangeText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionRow({
  action,
  value,
  onPress,
}: {
  action: PermissionActionDefinition;
  value: boolean;
  onPress: () => void;
}) {
  const dangerous = action.dangerous || isDangerousAction(action.key);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.actionRow,
        value && styles.actionRowOn,
        dangerous && !value && styles.actionDanger,
      ]}
    >
      <View style={[styles.checkBox, value && styles.checkBoxOn]}>
        {value && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionName}>{action.name}</Text>
        <Text style={styles.actionKey}>{action.key}</Text>
      </View>
      <Text style={[styles.actionState, value && styles.actionStateOn]}>
        {value ? "Allowed" : "Blocked"}
      </Text>
    </TouchableOpacity>
  );
}

function ResourceTreeNode({
  resource,
  path,
  depth,
  expanded,
  onToggleExpanded,
  readResource,
  readAction,
  writeResource,
  writeAction,
  applyPresetToBranch,
  forceOpen,
}: {
  resource: PermissionResourceDefinition;
  path: string;
  depth: number;
  expanded: Set<string>;
  onToggleExpanded: (path: string) => void;
  readResource: (path: string) => boolean;
  readAction: (path: string, action: string) => boolean;
  writeResource: (path: string, value: boolean) => void;
  writeAction: (path: string, action: string, value: boolean) => void;
  applyPresetToBranch: (
    resource: PermissionResourceDefinition,
    path: string,
    preset: Preset,
  ) => void;
  forceOpen?: boolean;
}) {
  const hasChildren = Boolean((resource.children || []).length);
  const hasActions = Boolean((resource.actions || []).length);
  const hasDetails = hasChildren || hasActions;
  const open = forceOpen || expanded.has(path);
  const allowed = readResource(path);

  const enabledActions = (resource.actions || []).filter((a) =>
    readAction(path, a.key),
  ).length;
  const totalActions = (resource.actions || []).length;
  const childEnabled = (resource.children || []).filter((c) =>
    readResource(`${path}.${c.key}`),
  ).length;
  const childTotal = (resource.children || []).length;

  let badgeLabel = allowed ? "Allowed" : "No access";
  let badgeTone: "green" | "blue" | "orange" | "muted" = allowed
    ? "green"
    : "muted";
  if (
    allowed &&
    ((totalActions && enabledActions < totalActions) ||
      (childTotal && childEnabled < childTotal))
  ) {
    badgeLabel = "Custom";
    badgeTone = "orange";
  }
  if (
    allowed &&
    totalActions > 0 &&
    enabledActions > 0 &&
    (resource.actions || []).every(
      (a) => isViewAction(a.key) || !readAction(path, a.key),
    )
  ) {
    badgeLabel = "View only";
    badgeTone = "blue";
  }

  return (
    <View style={[styles.nodeWrap, depth > 0 && styles.nodeNested]}>
      <View style={styles.nodeHeader}>
        <TouchableOpacity
          style={styles.nodeMain}
          onPress={() => hasDetails && onToggleExpanded(path)}
          activeOpacity={hasDetails ? 0.76 : 1}
        >
          <View style={[styles.nodeIcon, depth > 0 && styles.nodeIconSmall]}>
            <Text style={styles.nodeIconText}>
              {resource.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.nodeName} numberOfLines={1}>
              {resource.name}
            </Text>
            <Text style={styles.nodeMeta} numberOfLines={1}>
              {prettyType(resource.type)}
              {childTotal
                ? ` · ${childTotal} child${childTotal === 1 ? "" : "ren"}`
                : ""}
              {totalActions
                ? ` · ${totalActions} action${totalActions === 1 ? "" : "s"}`
                : ""}
            </Text>
            <Text style={styles.nodePath} numberOfLines={1}>
              {path}
            </Text>
          </View>
          <StateBadge label={badgeLabel} tone={badgeTone} />
          {hasDetails && <Text style={styles.chevron}>{open ? "⌃" : "⌄"}</Text>}
        </TouchableOpacity>
        <Toggle value={allowed} onPress={() => writeResource(path, !allowed)} />
      </View>

      {open && allowed && (
        <View style={styles.nodeBody}>
          <View style={styles.branchPresetRow}>
            <Text style={styles.branchPresetLabel}>Apply to this branch</Text>
            <View style={styles.branchPresetButtons}>
              {(["full", "view", "work", "none"] as Preset[]).map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.miniPreset}
                  onPress={() => applyPresetToBranch(resource, path, preset)}
                >
                  <Text style={styles.miniPresetText}>
                    {preset === "full"
                      ? "Full"
                      : preset === "view"
                        ? "View"
                        : preset === "work"
                          ? "Work"
                          : "None"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {hasActions && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>ACTIONS</Text>
              {(resource.actions || []).map((action) => (
                <ActionRow
                  key={`${path}.${action.key}`}
                  action={action}
                  value={readAction(path, action.key)}
                  onPress={() =>
                    writeAction(path, action.key, !readAction(path, action.key))
                  }
                />
              ))}
            </View>
          )}

          {hasChildren && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>CHILD RESOURCES</Text>
              {(resource.children || []).map((child) => {
                const childPath = `${path}.${child.key}`;
                return (
                  <ResourceTreeNode
                    key={childPath}
                    resource={child}
                    path={childPath}
                    depth={depth + 1}
                    expanded={expanded}
                    onToggleExpanded={onToggleExpanded}
                    readResource={readResource}
                    readAction={readAction}
                    writeResource={writeResource}
                    writeAction={writeAction}
                    applyPresetToBranch={applyPresetToBranch}
                    forceOpen={forceOpen}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function PermissionManagerScreen() {
  const appSession = useAppSessionStore((s) => s.appSession);
  const setAppSession = useAppSessionStore((s) => s.setAppSession);
  const user = useAppSessionStore((s) => s.user);
  const rawLoginResponse = useAppSessionStore((s) => s.rawLoginResponse);
  const { canAccess, canDo, isSuperAdmin } = usePermission();

  const registry = useMemo(() => getPermissionRegistry(), []);
  const flatRegistry = useMemo(
    () =>
      registry.flatMap((area) =>
        area.resources.flatMap((resource) => flattenResource(area, resource)),
      ),
    [registry],
  );

  const [mode, setMode] = useState<SourceMode>("role");
  const [selectedAreaKey, setSelectedAreaKey] = useState(
    registry[0]?.key || "",
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [serverValues, setServerValues] = useState<Draft>({});

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const registryPayload = {
          client_version: "mobile-registry-v1",
          areas: registry,
        };
        await AppAccessAPI.syncRegistry(registryPayload);
        const boot = await AppAccessAPI.bootstrap();
        const data = boot?.response || boot?.data?.response || boot?.data || boot || {};
        const roles = data.roles || [];
        const users = data.users || [];
        const role = roles.find((r: any) =>
          String(r.role_name || '').toLowerCase().includes(isSuperAdmin ? 'owner' : String(currentRole).toLowerCase())
        ) || roles[0];
        const currentUid = Number(user?.id || 0);
        const selectedUser = users.find((u: any) => Number(u.id) === currentUid) || users[0];
        if (!active) return;
        setSelectedRoleId(role ? Number(role.id) : null);
        setSelectedUserId(selectedUser ? Number(selectedUser.id) : currentUid || null);
        if (role) {
          const roleRes = await AppAccessAPI.getRole(Number(role.id));
          const roleData = roleRes?.response || roleRes?.data?.response || roleRes?.data || roleRes || {};
          const next: Draft = {};
          for (const item of roleData.permissions || []) {
            const path = item.resource_path;
            if (!path) continue;
            const key = item.action_key
              ? grantKey("action", path, item.action_key)
              : grantKey("resource", path);
            next[key] = String(item.decision).toLowerCase() === "allow";
          }
          if (active) setServerValues(next);
        }
      } catch (e: any) {
        Alert.alert("Access setup", e?.message || "Unable to load access control data.");
      } finally {
        if (active) setLoadingAccess(false);
      }
    };
    void run();
    return () => { active = false; };
  }, []);

  const context = appSession?.business_context;
  const changedCount = Object.keys(draft).length;
  const searchText = query.trim().toLowerCase();

  const currentRole = useMemo(() => {
    const role = rawLoginResponse?.role1;
    if (typeof role === "string" && role.trim()) return role;
    if (Array.isArray(role) && role.length) {
      return role
        .map((r: any) => r?.name || r?.role_name || String(r))
        .join(", ");
    }
    if (role && typeof role === "object") {
      return role.name || role.role_name || role.RoleName || "Current role";
    }
    return isSuperAdmin ? "Owner / Super Admin" : "Current role";
  }, [isSuperAdmin, rawLoginResponse]);

  const currentUser =
    user?.first_name || user?.displayname || user?.name || "Current user";

  const selectedArea =
    registry.find((area) => area.key === selectedAreaKey) ||
    registry[0] ||
    null;

  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    if (!q) return registry;
    return registry.filter((area) =>
      [area.name, area.key, ...area.resources.map((resource) => resource.name)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [areaSearch, registry]);

  const searchResults = useMemo(() => {
    if (!searchText) return [];
    const seen = new Set<string>();
    return flatRegistry
      .filter((entry) => {
        const action = entry.matchedAction;
        const haystack = [
          entry.areaName,
          entry.areaKey,
          entry.path,
          entry.resource.name,
          entry.resource.key,
          entry.resource.type,
          action?.name,
          action?.key,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchText)) return false;
        const id = `${entry.areaKey}|${entry.path}|${action?.key || ""}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 60);
  }, [flatRegistry, searchText]);

  const readResource = (path: string) => {
    const key = grantKey("resource", path);
    if (Object.prototype.hasOwnProperty.call(draft, key)) return draft[key];
    if (Object.prototype.hasOwnProperty.call(serverValues, key)) return serverValues[key];
    return canAccess(path);
  };

  const readAction = (path: string, action: string) => {
    const key = grantKey("action", path, action);
    if (Object.prototype.hasOwnProperty.call(draft, key)) return draft[key];
    if (Object.prototype.hasOwnProperty.call(serverValues, key)) return serverValues[key];
    return canDo(path, action);
  };

  const writeResource = (path: string, value: boolean) => {
    setDraft((prev) => ({ ...prev, [grantKey("resource", path)]: value }));
  };

  const writeAction = (path: string, action: string, value: boolean) => {
    setDraft((prev) => ({
      ...prev,
      [grantKey("action", path, action)]: value,
    }));
  };

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const applyPresetToBranch = (
    resource: PermissionResourceDefinition,
    path: string,
    preset: Preset,
  ) => {
    setDraft((previous) => {
      const next = { ...previous };
      for (const entry of collectBranch(resource, path)) {
        next[grantKey("resource", entry.path)] = preset !== "none";
        for (const action of entry.resource.actions || []) {
          let allowed = false;
          if (preset === "full") allowed = true;
          if (preset === "view") allowed = isViewAction(action.key);
          if (preset === "work") allowed = !isDangerousAction(action.key);
          next[grantKey("action", entry.path, action.key)] = allowed;
        }
      }
      return next;
    });
  };

  const applyAreaPreset = (preset: Preset) => {
    if (!selectedArea) return;
    for (const resource of selectedArea.resources) {
      applyPresetToBranch(resource, resource.key, preset);
    }
  };

  const jumpToSearchResult = (result: SearchResult) => {
    setSelectedAreaKey(result.areaKey);
    setQuery("");
    const parts = result.path.split(".");
    const toOpen = new Set<string>();
    for (let i = 1; i <= parts.length; i += 1) {
      toOpen.add(parts.slice(0, i).join("."));
    }
    setExpanded(toOpen);
  };

  const discardChanges = () => {
    Alert.alert(
      "Discard changes?",
      "All unsaved permission changes will be removed.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => setDraft({}) },
      ],
    );
  };

  const saveChanges = async () => {
    if (mode === "role" && !selectedRoleId) {
      Alert.alert("Role required", "No app role is available. Run the SQL Server setup script first.");
      return;
    }
    if (mode === "user" && !selectedUserId) {
      Alert.alert("User required", "No user is selected.");
      return;
    }

    const effective = { ...serverValues, ...draft };
    const rows = Object.entries(effective).map(([key, value]) => {
      if (key.startsWith("resource::")) {
        return { resource_path: key.slice("resource::".length), action_key: "", decision: value ? "allow" : "deny" };
      }
      const rest = key.slice("action::".length);
      const splitAt = rest.lastIndexOf("::");
      return {
        resource_path: rest.slice(0, splitAt),
        action_key: rest.slice(splitAt + 2),
        decision: value ? "allow" : "deny",
      };
    });

    try {
      setSaving(true);
      if (mode === "role") {
        await AppAccessAPI.saveRole(selectedRoleId as number, rows);
      } else {
        await AppAccessAPI.saveUser(selectedUserId as number, selectedRoleIds, rows);
      }
      setServerValues(effective);
      setDraft({});

      const sessionRes = await AppAccessAPI.session();
      const sessionData = sessionRes?.response || sessionRes?.data?.response || sessionRes?.data || sessionRes || {};
      if (sessionData.permissions) {
        await setAppSession({
          ...(appSession as any),
          permissions: {
            ...((appSession as any)?.permissions || {}),
            resources: sessionData.permissions,
          },
        } as any);
      }
      Alert.alert("Permissions saved", "The selected role/user access is active now.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Unable to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>
          <Text style={styles.title}>Access Control Center</Text>
          <Text style={styles.subtitle}>
            {context?.prp_code || "—"} · FY {context?.year_no || "—"} · Store{" "}
            {context?.str_code || "—"}
          </Text>
        </View>
        {changedCount > 0 && (
          <View style={styles.changeBadge}>
            <Text style={styles.changeNumber}>{changedCount}</Text>
            <Text style={styles.changeText}>unsaved</Text>
          </View>
        )}
      </View>

      {loadingAccess && <View style={styles.loadingStrip}><ActivityIndicator color={T.copper} size="small" /><Text style={styles.loadingStripText}>Loading access data…</Text></View>}

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.content,
          changedCount > 0 && styles.contentWithFooter,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sourceCard}>
          <View style={styles.segmentWrap}>
            <TouchableOpacity
              style={[styles.segment, mode === "role" && styles.segmentActive]}
              onPress={() => setMode("role")}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === "role" && styles.segmentTextActive,
                ]}
              >
                Role
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, mode === "user" && styles.segmentActive]}
              onPress={() => setMode("user")}
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === "user" && styles.segmentTextActive,
                ]}
              >
                User Override
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sourceSummary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.smallLabel}>
                {mode === "role" ? "CURRENT ROLE" : "CURRENT USER"}
              </Text>
              <Text style={styles.sourceName}>
                {mode === "role" ? currentRole : currentUser}
              </Text>
            </View>
            <StateBadge
              label={mode === "role" ? "Default access" : "Overrides"}
              tone={mode === "role" ? "blue" : "orange"}
            />
          </View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search screen, report, tab, dialog or action…"
            placeholderTextColor={T.muted}
            style={styles.searchInput}
          />
          {!!query && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {searchText ? (
          <View>
            <Text style={styles.topLabel}>
              SEARCH RESULTS · {searchResults.length}
            </Text>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={`${result.areaKey}-${result.path}-${result.matchedAction?.key || index}`}
                style={styles.searchResult}
                onPress={() => jumpToSearchResult(result)}
              >
                <View style={styles.searchResultIcon}>
                  <Text style={styles.searchResultIconText}>
                    {result.areaName.slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchResultTitle}>
                    {result.matchedAction?.name || result.resource.name}
                  </Text>
                  <Text style={styles.searchResultPath}>
                    {result.areaName} · {result.path}
                  </Text>
                </View>
                <Text style={styles.searchArrow}>›</Text>
              </TouchableOpacity>
            ))}
            {!searchResults.length && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nothing found</Text>
                <Text style={styles.emptySub}>
                  Try a screen, report, dialog or action name.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.topLabel}>BUSINESS AREA</Text>
            <TouchableOpacity
              style={styles.areaSelector}
              activeOpacity={0.8}
              onPress={() => { Keyboard.dismiss(); setAreaSearch(""); setAreaPickerOpen(true); }}
            >
              <View style={styles.areaSelectorIcon}>
                <Text style={styles.areaSelectorIconText}>
                  {(selectedArea?.name || "A").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.areaSelectorName}>
                  {selectedArea?.name || "Select business area"}
                </Text>
                <Text style={styles.areaSelectorMeta}>
                  {selectedArea?.resources.length || 0} item
                  {selectedArea?.resources.length === 1 ? "" : "s"} ·{" "}
                  {registry.length} total areas
                </Text>
              </View>
              <View style={styles.areaChangePill}>
                <Text style={styles.areaChangeText}>Change</Text>
              </View>
              <Text style={styles.areaSelectorArrow}>›</Text>
            </TouchableOpacity>

            {selectedArea && (
              <View style={styles.areaPresetCard}>
                <Text style={styles.areaPresetName}>{selectedArea.name}</Text>
                <View style={styles.areaPresetActions}>
                  {(["full", "view", "work", "none"] as Preset[]).map(
                    (preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={styles.areaPresetButton}
                        onPress={() => applyAreaPreset(preset)}
                      >
                        <Text style={styles.areaPresetText}>
                          {preset === "full"
                            ? "Full"
                            : preset === "view"
                              ? "View"
                              : preset === "work"
                                ? "Work"
                                : "None"}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>
            )}

            <Text style={styles.topLabel}>
              {selectedArea?.name?.toUpperCase() || "ACCESS"}
            </Text>
            {(selectedArea?.resources || []).map((resource) => (
              <ResourceTreeNode
                key={resource.key}
                resource={resource}
                path={resource.key}
                depth={0}
                expanded={expanded}
                onToggleExpanded={toggleExpanded}
                readResource={readResource}
                readAction={readAction}
                writeResource={writeResource}
                writeAction={writeAction}
                applyPresetToBranch={applyPresetToBranch}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={areaPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAreaPickerOpen(false)}
      >
        <View style={styles.areaModalOverlay}>
          <View style={styles.areaModalSheet}>
            <View style={styles.areaModalHandle} />
            <View style={styles.areaModalHeader}>
              <View>
                <Text style={styles.areaModalTitle}>Choose business area</Text>
                <Text style={styles.areaModalSub}>
                  {registry.length} areas available
                </Text>
              </View>
              <TouchableOpacity
                style={styles.areaModalClose}
                onPress={() => {
                  setAreaPickerOpen(false);
                  setAreaSearch("");
                }}
              >
                <Text style={styles.areaModalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.areaModalSearch}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={areaSearch}
                onChangeText={setAreaSearch}
                placeholder="Search Purchase, Sales, Production…"
                placeholderTextColor={T.muted}
                style={styles.areaModalSearchInput}
              />
              {!!areaSearch && (
                <TouchableOpacity
                  onPress={() => setAreaSearch("")}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearText}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.areaModalList}
              keyboardShouldPersistTaps="handled"
            >
              {filteredAreas.map((area) => {
                const active = area.key === selectedArea?.key;
                return (
                  <TouchableOpacity
                    key={area.key}
                    style={[
                      styles.areaModalRow,
                      active && styles.areaModalRowActive,
                    ]}
                    onPress={() => {
                      setSelectedAreaKey(area.key);
                      setExpanded(new Set());
                      setAreaPickerOpen(false);
                      setAreaSearch("");
                    }}
                  >
                    <View
                      style={[
                        styles.areaModalIcon,
                        active && styles.areaModalIconActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.areaModalIconText,
                          active && styles.areaModalIconTextActive,
                        ]}
                      >
                        {area.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.areaModalName,
                          active && styles.areaModalNameActive,
                        ]}
                      >
                        {area.name}
                      </Text>
                      <Text style={styles.areaModalMeta}>
                        {area.resources.length} item
                        {area.resources.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    {active ? (
                      <View style={styles.areaSelectedBadge}>
                        <Text style={styles.areaSelectedText}>Selected</Text>
                      </View>
                    ) : (
                      <Text style={styles.areaModalArrow}>›</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {!filteredAreas.length && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No business area found</Text>
                  <Text style={styles.emptySub}>
                    Try another area or module name.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {changedCount > 0 && (
        <View style={styles.saveBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saveBarTitle}>
              {changedCount} unsaved change{changedCount === 1 ? "" : "s"}
            </Text>
            <Text style={styles.saveBarSub}>
              {mode === "role" ? currentRole : currentUser}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.discardButton}
            onPress={discardChanges}
          >
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.55 }]} onPress={saveChanges} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.nav,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 17,
    flexDirection: "row",
    alignItems: "center",
  },
  brand: {
    color: "#6F91AD",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  title: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: -0.6,
  },
  subtitle: { color: "#A9C0D4", fontSize: 11, fontWeight: "700", marginTop: 4 },
  changeBadge: {
    minWidth: 63,
    backgroundColor: "#1B3042",
    borderRadius: 15,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  changeNumber: { color: "#fff", fontSize: 18, fontWeight: "900" },
  changeText: { color: "#A9C0D4", fontSize: 9, fontWeight: "800" },
  loadingStrip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 8, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  loadingStripText: { color: T.muted, fontSize: 11, fontWeight: "700" },
  body: { flex: 1 },
  content: { padding: 20, paddingBottom: 34 },
  contentWithFooter: { paddingBottom: 108 },
  sourceCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: T.sub,
    borderRadius: 13,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 11,
  },
  segmentActive: { backgroundColor: T.nav },
  segmentText: { color: T.muted, fontSize: 13, fontWeight: "900" },
  segmentTextActive: { color: "#fff" },
  sourceSummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingTop: 13,
    paddingBottom: 4,
  },
  smallLabel: {
    color: T.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sourceName: { color: T.ink, fontSize: 16, fontWeight: "900", marginTop: 3 },
  stateBadge: {
    backgroundColor: T.sub,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stateText: { color: T.muted, fontSize: 9, fontWeight: "900" },
  stateGreen: { backgroundColor: "#E8F5EE" },
  stateGreenText: { color: "#267052" },
  stateBlue: { backgroundColor: "#EAF2FA" },
  stateBlueText: { color: "#316589" },
  stateOrange: { backgroundColor: "#FBF0E4" },
  stateOrangeText: { color: T.copper },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 15,
    paddingHorizontal: 13,
    minHeight: 54,
    marginBottom: 17,
  },
  searchIcon: { color: T.muted, fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, color: T.ink, fontSize: 14, paddingVertical: 12 },
  clearButton: { padding: 8 },
  clearText: { color: T.muted, fontSize: 21 },
  topLabel: {
    color: T.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 10,
    marginTop: 3,
  },
  areaSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  areaSelectorIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FCF2E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  areaSelectorIconText: { color: T.copper, fontSize: 16, fontWeight: "900" },
  areaSelectorName: { color: T.ink, fontSize: 15, fontWeight: "900" },
  areaSelectorMeta: {
    color: T.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  areaChangePill: {
    backgroundColor: T.sub,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
  },
  areaChangeText: { color: T.ink, fontSize: 9.5, fontWeight: "900" },
  areaSelectorArrow: { color: T.copper, fontSize: 23, marginLeft: 7 },
  areaModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.48)",
    justifyContent: "flex-end",
  },
  areaModalSheet: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    maxHeight: "82%",
  },
  areaModalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  areaModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  areaModalTitle: { color: T.ink, fontSize: 19, fontWeight: "900" },
  areaModalSub: { color: T.muted, fontSize: 10.5, marginTop: 3 },
  areaModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  areaModalCloseText: { color: T.muted, fontSize: 22, lineHeight: 24 },
  areaModalSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
    marginBottom: 13,
  },
  areaModalSearchInput: {
    flex: 1,
    color: T.ink,
    fontSize: 14,
    paddingVertical: 11,
  },
  areaModalList: { paddingBottom: 18 },
  areaModalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 15,
    padding: 12,
    marginBottom: 9,
  },
  areaModalRowActive: { borderColor: T.nav, backgroundColor: "#F7FAFC" },
  areaModalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FCF2E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  areaModalIconActive: { backgroundColor: T.nav },
  areaModalIconText: { color: T.copper, fontSize: 15, fontWeight: "900" },
  areaModalIconTextActive: { color: "#fff" },
  areaModalName: { color: T.ink, fontSize: 14, fontWeight: "900" },
  areaModalNameActive: { color: T.nav },
  areaModalMeta: { color: T.muted, fontSize: 10, marginTop: 3 },
  areaSelectedBadge: {
    backgroundColor: "#E8F5EE",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  areaSelectedText: { color: "#267052", fontSize: 9, fontWeight: "900" },
  areaModalArrow: { color: T.copper, fontSize: 22 },
  areaPresetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 15,
    padding: 10,
    marginBottom: 19,
  },
  areaPresetName: {
    flex: 1,
    color: T.ink,
    fontSize: 13,
    fontWeight: "900",
    paddingLeft: 4,
  },
  areaPresetActions: { flexDirection: "row", gap: 4 },
  areaPresetButton: {
    backgroundColor: T.sub,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  areaPresetText: { color: T.ink, fontSize: 10, fontWeight: "900" },
  nodeWrap: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
  },
  nodeNested: { borderRadius: 14, marginBottom: 9, backgroundColor: "#FFFEFC" },
  nodeHeader: { flexDirection: "row", alignItems: "center", padding: 13 },
  nodeMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  nodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FCF2E9",
    alignItems: "center",
    justifyContent: "center",
  },
  nodeIconSmall: { width: 40, height: 40, borderRadius: 12 },
  nodeIconText: { color: T.copper, fontSize: 17, fontWeight: "900" },
  nodeName: { color: T.ink, fontSize: 16, fontWeight: "900" },
  nodeMeta: { color: T.muted, fontSize: 10, fontWeight: "700", marginTop: 2 },
  nodePath: { color: T.copper, fontSize: 9.5, fontWeight: "800", marginTop: 2 },
  chevron: { color: T.muted, fontSize: 15, paddingHorizontal: 5 },
  toggle: {
    width: 57,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#D8D4CF",
    padding: 3,
    marginLeft: 8,
  },
  toggleOn: { backgroundColor: "#2C7457" },
  knob: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff" },
  knobOn: { transform: [{ translateX: 23 }] },
  nodeBody: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: "#FAF8F4",
    padding: 13,
  },
  branchPresetRow: { marginBottom: 13 },
  branchPresetLabel: {
    color: T.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 7,
  },
  branchPresetButtons: { flexDirection: "row", gap: 6 },
  miniPreset: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  miniPresetText: { color: T.ink, fontSize: 10, fontWeight: "900" },
  sectionBlock: { marginTop: 5 },
  sectionLabel: {
    color: T.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
  },
  actionRowOn: { borderColor: T.copper, backgroundColor: "#FFF8F0" },
  actionDanger: { borderColor: "#F0D6D2" },
  checkBox: {
    width: 27,
    height: 27,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkBoxOn: { backgroundColor: T.copper, borderColor: T.copper },
  checkMark: { color: "#fff", fontSize: 15, fontWeight: "900" },
  actionName: { color: T.ink, fontSize: 13, fontWeight: "900" },
  actionKey: { color: T.muted, fontSize: 9.5, marginTop: 1 },
  actionState: { color: T.muted, fontSize: 9, fontWeight: "900" },
  actionStateOn: { color: T.copper },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  searchResultIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#FCF2E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  searchResultIconText: { color: T.copper, fontWeight: "900" },
  searchResultTitle: { color: T.ink, fontSize: 13, fontWeight: "900" },
  searchResultPath: { color: T.muted, fontSize: 9.5, marginTop: 2 },
  searchArrow: { color: T.copper, fontSize: 22 },
  emptyCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: { color: T.ink, fontSize: 14, fontWeight: "900" },
  emptySub: { color: T.muted, fontSize: 11, marginTop: 4 },
  saveBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.nav,
    borderRadius: 17,
    padding: 11,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  saveBarTitle: { color: "#fff", fontSize: 12, fontWeight: "900" },
  saveBarSub: { color: "#A9C0D4", fontSize: 9, marginTop: 2 },
  discardButton: { paddingHorizontal: 13, paddingVertical: 10 },
  discardText: { color: "#D6E0E8", fontSize: 11, fontWeight: "900" },
  saveButton: {
    backgroundColor: T.copper,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  saveText: { color: "#fff", fontSize: 11, fontWeight: "900" },
});

export default PermissionManagerScreen;
