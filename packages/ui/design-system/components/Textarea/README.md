# Textarea

The multi-line sibling of FormInput, with the same label, hint and error contract.

**Use it for** anything a person writes in sentences — the event description, a note to sponsors.

## Rules

- Same 16px floor, same on-blur validation, same three-part error text as FormInput.
- `resize: vertical` only. Horizontal resize breaks the layout and no one wants it.
- Four rows by default. Tall enough to show that prose is expected, short enough not to dominate the screen.
- Say what the text is for in the hint, and say how it will appear: "This shows on the poster under the event name."
- Never impose a character limit without showing the count, and never truncate silently.

## Props

`id` · `label` · `placeholder` · `value` · `rows` · `required` · `disabled` · `hint` · `error` · `onChange`
