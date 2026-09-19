# RadioGroup

One choice from a small set, with every option visible at once.

**Use it for** two to four mutually exclusive options. Above four, use FormSelect.

## Rules

- **Seeing beats remembering.** The reason to prefer radios over a select for small sets is that nothing is hidden behind a tap — which matters most for the reader who is least sure they are doing it right.
- Each option row is 48px and fully tappable, with `--tap-gap` between rows.
- **Pre-select the likely answer.** An unselected radio group is an unanswered question; a pre-selected one is a decision already made that the person can change.
- Order by likelihood. "This Saturday" before "Pick a date".
- The legend is the question: "When is it?"
- The error sits below the whole group with `role="alert"`, not beside one option.

## Props

`name` · `legend` · `options` (`{ value, label, checked, disabled }[]`) · `required` · `error` · `onChange`
