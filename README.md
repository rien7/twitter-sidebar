# Twitter Sidebar Extension

This project contains a lean rebuild of the original `glowing-fishstick` Chrome extension. The goal is to keep the behaviour of opening Twitter (X) conversations in a sidebar while using a flatter, easier to reason about code layout.

## Project Layout

- `src/content.ts` – entry for the content script. It wires the DOM listeners, sidebar events, and page interceptor.
- `src/components/` – React UI rendered inside the shadow-root sidebar.
  - `components/sidebar/` – layout primitives such as `SidebarSurface` and `SidebarContent`.
  - `components/tweet/` – composable pieces used to render tweets, actions, and media.
- `src/handlers/` – logic that reacts to DOM events or bridge messages.
- `src/api/twitterGraphql.ts` – content-script bridge to the injected GraphQL proxy.
- `src/store/` – small in-memory stores for sidebar/tweet state.
- `src/utils/` – helpers for DOM inspection, response parsing, and conversation grouping.

## Development

```bash
pnpm install
pnpm run dev        # Vite dev server for component development
pnpm run build      # Generate production artifacts in dist/
```

The build step produces four files inside `dist/`: `manifest.json`, `icon-128.png`, `content.js` (content script), and `intercept.js` (injected bridge). Load this folder as the unpacked extension.

## Documentation

Additional newcomer-friendly documentation lives under [`doc/`](./doc/). Start with `doc/structure.md` for a guided tour of the codebase, then move on to components and runtime workflow.

## Testing In Browser

1. Run `pnpm run build` to generate the latest bundles.
2. Open `chrome://extensions`, enable *Developer mode*, and choose *Load unpacked*.
3. Select the `twitter-sidebar/dist` folder.
4. Navigate to `twitter.com` or `x.com`, click any tweet, and confirm the sidebar opens with detail, actions, media overlay, and reply threads.

## Notes

- The content script injects a light-weight interceptor that replays GraphQL requests using the viewer's credentials. Sensitive headers are never hard coded; the script reuses whatever the page sends.
- Tailwind is configured with a flattened colour palette so utilities such as `text-twitter-text-primary` work for both light and dark themes.
- The UI mounts inside a shadow root to avoid collisions with the host page styles; Firefox falls back to inline `<style>` tags automatically.
