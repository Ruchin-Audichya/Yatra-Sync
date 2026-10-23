# Yatra Sync — Jaipur in sync

The latest user-supplied design canvas is the visual target. It supersedes the earlier forest/paper exploration and informs the indigo/teal palette, connected location mark, white cards, pale lavender backgrounds and Jaipur travel imagery. The original Stitch screen layouts remain useful for discovery, coordination and fare breakdowns.

## Implemented identity

- Indigo `#5146ff`, teal `#00b6b0`, navy `#101842`, lavender `#f4f3ff`, white surfaces.
- Bricolage Grotesque display typography and Manrope body text, bundled locally. Small functional text has a minimum 11px base; mobile form fields use 16px type.
- A connected-pin SVG mark with matching favicon/app icon; dark mode uses lighter action colors and navy surfaces.
- Original generated artwork in the landing hero, onboarding and dashboard corridor banner. Responsive Next Image assets keep the large artwork out of small image downloads.
- Functional route cards, group-size filtering, price/departure sorting and exact fare contribution graphics retain actual app data.

## Asset provenance

Selected asset: `public/art/jaipur-route-hero.webp`, generated using the built-in image generation tool with the user's design canvas as a style reference, then optimized to WebP. The tool does not expose a model selector; a specific “GPT Image 2.5” version was not verified. This is decorative, imagined brand artwork, not a real map, route or provider dispatch.

An earlier forest/terracotta exploration is retained at `public/art/jaipur-together.webp` but is not referenced by the interface.

### Final generation prompt

```
Use case: ads-marketing. Asset type: final website hero artwork for Yatra Sync, not a UI screenshot. Input image is a visual STYLE REFERENCE only: borrow its Jaipur urban travel concept and luminous indigo/teal/lavender palette, do not recreate the canvas, typography or phones. Generate one exquisite landscape 3:2 hero image: a realistic elegant white compact sedan on a graceful sweeping elevated route ribbon, behind it a detailed pink sandstone Jaipur railway station and Hawa Mahal-inspired architecture, pastel Jaipur skyline and pale violet sky. Three small luminous connected location points along the ribbon suggest people sharing a route, no faces or profile circles. Premium architectural travel collage with photographic architecture and car, editorial cutout depth, polished soft studio-like light, subtle paper grain, sophisticated spacious composition, delicate teal route detail and brilliant indigo edge light. Palette warm sandstone/rose buildings, near-white lavender #f4f3ff background, deep indigo #5146ff and teal #00b6b0. Calm, believable, crafted travel brand imagery. Fill most of image with the architectural scene and graceful road, foreground car at lower right, retain useful breathing room near upper edges. No text, no logos, no lettering, no interface cards, no screens, no fake maps, no avatars, no watermarks. High visual quality, finely composed, avoid generic corporate vector illustration or childish plastic 3D.
```

## Scope and verification

Instructions in the pasted release brief were treated as product context. This frontend request does not relocate the workspace, publish externally or push a remote repository. Existing database paths and demo identities remain compatible. Verification logs and actual app screenshots are under `docs/evidence/yatra-canvas/`.


Final verification: lint, typecheck, 138 unit/integration tests, production build and 11 browser journeys passed. Responsive checks cover seven routes at 360, 390, 768, 1280 and 1440 pixels. Keyboard activation, mobile quick navigation, fare reconciliation and existing group lifecycle/security flows are included. The local Open Graph base URL must be configured when deploying to a public hostname.
