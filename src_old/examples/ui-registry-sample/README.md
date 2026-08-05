# Ready-made developer sample

For a new module:

1. Copy `sample.permission.ts` into `src/registry/modules/<module>.permission.ts`.
2. Import it once from `src/registry/index.ts`.
3. Copy `sample.ui.ts` into `src/core/ui-registry/modules/<module>.ui.ts`.
4. Import it once from `src/core/ui-registry/index.ts`.
5. Add screen/card renderers. Do not write direct permission conditions throughout JSX.
6. Run **Sync Registry** as SuperAdmin.
7. Assign role/user permissions in Permission Manager.

The same permission path must be used in both files. SuperAdmin receives new resources automatically.
