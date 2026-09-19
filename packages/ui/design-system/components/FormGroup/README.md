# FormGroup

A `<fieldset>` that binds related fields into one set with a visible legend.

**Use it when** two or more controls answer one question together — an address, a set of notification choices, a group of checkboxes.

## Rules

- The legend is 14px uppercase in `--text-muted` and names the set, not the first field in it.
- The border is `--border-strong`, because a fieldset marks a real boundary and `--border` at 1.36:1 cannot carry one.
- Do not nest fieldsets. If a set needs a sub-set, it needs its own screen — one decision per screen.
- Keep a group to a handful of controls. A fieldset with nine things in it is a form pretending to be tidy.
- `required` renders a `--error` asterisk on the legend, and the asterisk is `aria-hidden` because the requirement is already in each control.

## Props

`legend` · `required` · `children`
