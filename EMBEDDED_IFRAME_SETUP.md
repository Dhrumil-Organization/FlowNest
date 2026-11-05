# FlowNest iframe integration

This update adds a dedicated web-only `/embed` route. The existing browser and mobile login flows are intentionally left as-is.

## Flow

1. Parent React app embeds `https://flownest.tms-webapp.com/embed`.
2. FlowNest sends `FLOWNEST_READY` to the parent.
3. Parent sends `{ type: 'FLOWNEST_AUTH', username, password, property }` with `postMessage`.
4. FlowNest signs in and opens the ERP directly (there is one ERP now — the `New ERP` / `Legacy ERP` choice was removed on 6 Oct 2026).
5. The login reuses the existing `performLogin()` + property API selection.
6. If the login fails, the reason and a `Try again` button are shown inside the iframe.

## Parent-origin configuration

Set this at web build time:

```env
EXPO_PUBLIC_EMBED_PARENT_ORIGIN=https://YOUR-REACT-APP-DOMAIN.com
```

Do not put username/password into the iframe URL or query string.

## Apache

The parent React origin must be allowed by FlowNest's `Content-Security-Policy: frame-ancestors` header. Do not use `X-Frame-Options: DENY` or `SAMEORIGIN` for this cross-origin embed.
