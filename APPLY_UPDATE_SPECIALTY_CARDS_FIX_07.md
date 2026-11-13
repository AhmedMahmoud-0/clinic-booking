# MERUNO — Specialty Directory Card Interaction Fix 07

## Purpose

Make each specialty card on `/specialties` a single, fully clickable link to its own specialty details page. The hover treatment remains on the whole card, and the visible `Explore` label remains as a visual cue inside the card.

## Apply

1. Stop the running Next.js development server.
2. Extract this ZIP into a temporary folder.
3. Merge the included `src` and `tests` folders into the existing `clinic-booking` project.
4. Replace only the files listed in `FILE_GUIDE.md`.
5. Restart the project only after the files are copied.

Do not replace `.env`, `.git`, `node_modules`, `.next`, `generated/prisma`, `package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma/migrations`, `prisma7.config.ts`, or any database content.

## What to verify manually

- Open `/specialties`.
- Hover any specialty card: the card should show the existing lift/border/shadow treatment and pointer cursor.
- Click the card title, description, icon, or empty card area: all should open that specialty's detail page.
- The visible `Explore` cue should remain in the card.
- Keyboard users should be able to Tab to each specialty card and press Enter to open it.
- The links must open the correct specialty, not always the first one.

## Scope boundaries

- No footer changes in this fix; footer identity, color, logo, and complete link groups remain in the third enhancement package.
- No changes to the homepage specialty cards, doctor cards, booking logic, public catalog data, database, permissions, or dependencies.
- No database migration or seed is required.
