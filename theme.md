# Accio AI Cozy UI Theme

## Direction

Accio AI should feel like a focused workspace that blends Notion's calm document structure with Miro's spatial, visual planning energy. The dashboard should look like a real app surface, not a marketing page or an explanatory slide.

## Color Palette

- App background: fresh warm stone, `#f7f3ea`, for a soft but brighter workspace surface.
- Sidebar surface: near-white warm paper, `#f8f5ef`.
- Primary text: stone black, `#1c1917`.
- Secondary text: muted stone, `#78716c`.
- Borders: low-contrast warm gray, `#e7e5e4`.
- Primary action: fresh coral, `#ef6f61`.
- Feature colors: coral, mint, sky, sunflower, teal, violet, rose, and orange used sparingly for icons, badges, and status marks.

Avoid a one-note palette. Warm neutrals should carry the layout, while colorful accents help users scan different tools quickly.

## Typography

- Use the app's system sans-serif stack through Tailwind defaults.
- Keep dashboard headings compact and work-focused.
- Avoid oversized marketing typography inside the app shell.
- Use normal letter spacing; do not use negative tracking.
- Sidebar labels should be small, uppercase, and muted so grouped menu items remain easy to scan.

## Layout And Spacing

- Use an app shell with a persistent left sidebar and a flexible main workspace.
- Keep sidebar menu items compact: 32px row height, 8px radius, and tight section spacing.
- Use cards only for dashboard widgets: metrics, workspace pulse, activity, notes, and whiteboard previews.
- Avoid nesting cards inside cards.
- Prefer 8px or smaller corner radius for app surfaces.
- Use stable sizes for icon buttons, sidebar rows, cards, and board tiles to prevent layout shift.

## Sidebar

- Expanded width: about 252px.
- Collapsed width: about 74px.
- Expanded state shows logo, app name, group labels, icon, and menu text.
- Collapsed state shows icons only, with browser titles/tooltips on icon-only menu buttons.
- Sidebar menu groups should be labeled as Workspace, Create, and System.
- Collapse control should use a Lucide sidebar icon and stay reachable near the sidebar edge.
- Footer section should remain visually separate with a top border and include profile, workspace/team switching, and logout actions.
- On mobile, the sidebar should open as a drawer from a header menu button and close from the overlay or close icon.

## Dashboard Content

- Start with a concise page header: section label, focused headline, supporting copy, and practical actions.
- Use four compact metric cards across the top on desktop.
- Follow with operational panels such as workspace pulse, recent activity, pinned notes, and whiteboard preview.
- Avoid instructional chapter cards, numbered explainer panels, and slide-like compositions in the app UI.

## Iconography

- Use `lucide-react` icons for all menu and action icons.
- Icons should be colorful in the sidebar to make navigation easier to scan.
- Keep icon size consistent, usually 16px for menu items and 20px for the logo mark.
- Use familiar icons instead of text-only controls when the action is visually standard.

## Interaction

- Buttons and navigation rows should have clear hover states using warm neutrals.
- Active navigation should use a white surface, subtle ring, and light shadow.
- The first implementation uses local React state for sidebar collapse. Persistence can be added later if product behavior requires it.
