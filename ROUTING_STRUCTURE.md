# Source Structure

This project uses one canonical source directory: `src/`.

- Removed accidental nested `src/src/` tree.
- Removed legacy `src_old/` trees.
- The active permission registry is `src/registry/`.
- The active UI registry is `src/core/ui-registry/`.
- Production permissions are registered from `src/registry/index.ts` before UI validation.
