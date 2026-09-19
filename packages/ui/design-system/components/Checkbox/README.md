# Checkbox

A single yes/no, with the **whole row** as the target.

**Use it for** one independent choice. For several related ones, wrap them in a FormGroup so they read as a set.

## Rules

- **The label row is the target**, 48px tall and the full width — never just the box. This is the single biggest usability difference for an unsteady hand, and it costs nothing.
- The box itself is 24px, up from `@ocr/ui`'s 18px.
- Write the label as the state when checked: "Email me when someone scans a poster." Never "Notifications" with an implied meaning.
- A checkbox must never be the only thing standing between a person and a mistake. Consent that matters gets a sentence above it, not fine print beside it.
- Disabled renders at 50% opacity — but prefer explaining why something is unavailable to showing a dead control.

## Props

`id` · `label` · `name` · `value` · `checked` · `required` · `disabled` · `onChange`
