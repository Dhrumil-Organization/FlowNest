# Browse Show More update

- Browse rows are revealed in batches: 10 on phone, 50 on tablet/desktop.
- The Show more control is rendered as the FlatList footer, directly after the currently visible rows.
- Pressing Show more reveals already-fetched rows when the API returns a full list, or requests the next API page when server pagination is active.
- Search, filters, sort, and grouping reset the visible batch count.
- Fixed declaration order so `data` is defined before `loadMore` captures it, avoiding a block-scoped variable initialization/compile error.
- No automatic onEndReached loading; user controls each batch with Show more.
