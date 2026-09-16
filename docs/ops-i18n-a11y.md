# Phase 35 — i18n (FR/AR) + accessibility

## Languages

- Preference key: `localStorage.polyspace_lang` (`fr` | `ar`)
- Switching language updates `html[lang]` and `html[dir]` (`ltr` / `rtl`)
- Add strings under `src/locales/{fr,ar}/*.json` then `t('ns:key')`
- Namespaces: `common`, `auth`, `nav`, `eleves`, `modules`, `errors`, `a11y`

## RTL checklist

- Prefer logical Tailwind: `ms`/`me`, `ps`/`pe`, `border-s`, `text-start`/`text-end`
- Use `RtlIcon` for directional chevrons/arrows
- Arabic name inputs: `dir="rtl" lang="ar"` even when UI is French
- Digits stay Western `0–9` (matricule, NNI)

## Accessibility definition of done

- Shared `Modal`: `role="dialog"`, `aria-modal`, focus trap, Escape, restore focus
- Login: labelled fields, `aria-describedby` on errors, forgot-password outside password label
- DataTable: sortable header buttons + `aria-sort`, keyboard row open, named selection
- Skip link → `#main-content`; staff nav in `<nav>`
- Toasts: `role="status"` for success/info; `alert` for errors
- CI: `eslint-plugin-jsx-a11y` (recommended, some rules warn) + Playwright axe smoke

## Acceptance (Phase 35)

- [x] FR/AR switch changes visible UI strings and `html[lang]` + `dir` (login + Header)
- [x] Preference survives refresh (`localStorage.polyspace_lang`)
- [x] Nav, auth, élèves list/create/fiche Arabic names, sanctions module translated
- [x] RTL logical chrome + `RtlIcon` for chevrons
- [x] `prenom_ar` / `nom_famille_ar` migration + API + form/fiche
- [x] Modal dialog + focus trap; axe smoke on login; keyboard Escape on harness
- [x] DataTable keyboard/`aria-sort`; skip link; toast roles
- [x] Official PDF remains French-primary; Excel headers may follow UI

## Official exports

- PDF/Word remain French-primary in Phase 35
- Excel/CSV headers may follow UI language via i18n

## Commands

```bash
cd ScolariteMilitaireFront
npm run test                 # includes src/i18n/i18n.test.js
npx playwright test e2e/smoke.a11y-rtl.spec.js
```
