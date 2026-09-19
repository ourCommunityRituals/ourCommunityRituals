# FormSelect

A labelled native `<select>`. Native on purpose: every platform's own picker is more usable than a custom dropdown, and far more usable with a screen reader or a shaky hand.

**Use it for** a closed list of 4–15 options. Under four, use RadioGroup — seeing all the options at once is easier than remembering them. Over about fifteen, the list needs search, which means it is not a select.

## Rules

- **Order by likelihood, not alphabet.** The answer most people want comes first. This is the clearest case of the system's "do the thinking for them" rule.
- **Pre-select the likely answer** rather than showing an empty "Choose…". A default is a decision the person cannot get wrong.
- 16px text and a 48px minimum height, like every other control.
- Do not build a custom dropdown to match a design. Nothing is worth losing the native picker.
- Option labels are plain language — "Street fair", not "STREET_FAIR".

## Props

`id` · `label` · `options` (`{ value, label, selected }[]`) · `required` · `disabled` · `hint` · `error` · `onChange`
