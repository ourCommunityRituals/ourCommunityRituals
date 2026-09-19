/* @ds-bundle: {"format":4,"namespace":"OurSharedEvents","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"AccessDenied","sourcePath":"components/feedback/AccessDenied.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Loading","sourcePath":"components/feedback/Loading.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FormGroup","sourcePath":"components/forms/FormGroup.jsx"},{"name":"FormInput","sourcePath":"components/forms/FormInput.jsx"},{"name":"FormSelect","sourcePath":"components/forms/FormSelect.jsx"},{"name":"RadioGroup","sourcePath":"components/forms/RadioGroup.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"BottomNav","sourcePath":"components/navigation/BottomNav.jsx"},{"name":"Header","sourcePath":"components/navigation/Header.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"MapDetail","sourcePath":"components/map/MapDetail.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"98ec5d54ec4b","components/feedback/AccessDenied.jsx":"3e0e75b8a4f2","components/feedback/EmptyState.jsx":"64ec714cb973","components/feedback/Loading.jsx":"7939943f183d","components/forms/Checkbox.jsx":"a519ce7b9e2b","components/forms/FormGroup.jsx":"da7c4d4f3b4a","components/forms/FormInput.jsx":"a9903cafe712","components/forms/FormSelect.jsx":"bb6a78191a74","components/forms/RadioGroup.jsx":"4b57d9dc7075","components/forms/Textarea.jsx":"8e63a37796bf","components/navigation/BottomNav.jsx":"7d1204cef1c5","components/navigation/Header.jsx":"6eef30f1ec3d","components/surfaces/Card.jsx":"e2b546b63a8c","ui_kits/admin/AdminScreens.jsx":"93544d0934d6","ui_kits/display/DisplayScreens.jsx":"7d4a6271ef54","ui_kits/public/PublicScreens.jsx":"6c682b5f059b","ui_kits/reports/ReportScreens.jsx":"6354404a07b0","ui_kits/shared/KitShared.jsx":"bca8da349740","ui_kits/sponsor/SponsorSteps.jsx":"ca72a09603a3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OurSharedEvents = window.OurSharedEvents || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function Button({
  children,
  label,
  href,
  variant = 'primary',
  block = false,
  disabled = false,
  type = 'button',
  onClick,
  className = ''
}) {
  const cls = ['btn', 'btn-' + variant, block ? 'btn-block' : '', className].filter(Boolean).join(' ');
  const content = children ?? label;
  if (href) return /*#__PURE__*/React.createElement("a", {
    href: href,
    className: cls,
    "aria-disabled": disabled
  }, content);
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    className: cls,
    disabled: disabled,
    onClick: onClick
  }, content);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon,
  title,
  message,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "empty-state",
    style: {
      minHeight: 0
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    className: "es-icon",
    "aria-hidden": "true"
  }, icon), /*#__PURE__*/React.createElement("h3", null, title), /*#__PURE__*/React.createElement("p", null, message), action && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    href: action.href,
    variant: "primary"
  }, action.label));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/AccessDenied.jsx
try { (() => {
function AccessDenied({
  what,
  action,
  icon = '🔒',
  message = 'Want in? Ask the event organizer for an invite link.'
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.EmptyState, {
    icon: icon,
    title: what ? what + ' is organizer-only' : 'This area is for organizers',
    message: message,
    action: action ?? {
      label: 'Get started',
      href: '/connect'
    }
  });
}
Object.assign(__ds_scope, { AccessDenied });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/AccessDenied.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Loading.jsx
try { (() => {
function Loading({
  label = 'Loading…'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '48px 0'
    },
    role: "status",
    "aria-label": label
  }, /*#__PURE__*/React.createElement("div", {
    className: "spinner",
    style: {
      width: 32,
      height: 32
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '.875rem'
    },
    className: "loading-text"
  }, label));
}
Object.assign(__ds_scope, { Loading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Loading.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  id,
  label,
  name,
  value = 'on',
  checked,
  required = false,
  disabled = false,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: "checkbox-label",
    style: disabled ? {
      opacity: .5,
      cursor: 'not-allowed'
    } : undefined
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: id,
    name: name ?? id,
    value: value,
    defaultChecked: checked,
    required: required,
    disabled: disabled,
    onChange: onChange
  }), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormGroup.jsx
try { (() => {
function FormGroup({
  legend,
  required = false,
  children
}) {
  return /*#__PURE__*/React.createElement("fieldset", {
    className: "form-group",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("legend", null, legend, required && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "required-mark"
  }, "*")), children);
}
Object.assign(__ds_scope, { FormGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormGroup.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormInput.jsx
try { (() => {
function FormInput({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  required = false,
  disabled = false,
  hint,
  error,
  onChange
}) {
  const hintId = id + '-hint',
    errorId = id + '-error';
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return /*#__PURE__*/React.createElement("div", {
    className: "form-field"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id
  }, label, required && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "required-mark"
  }, "*")), /*#__PURE__*/React.createElement("input", {
    id: id,
    name: id,
    type: type,
    className: 'input' + (error ? ' input-error' : ''),
    placeholder: placeholder,
    value: value,
    required: required,
    disabled: disabled,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    onChange: onChange
  }), hint && !error && /*#__PURE__*/React.createElement("div", {
    id: hintId,
    className: "form-hint"
  }, hint), error && /*#__PURE__*/React.createElement("div", {
    id: errorId,
    className: "form-error",
    role: "alert"
  }, error));
}
Object.assign(__ds_scope, { FormInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormSelect.jsx
try { (() => {
function FormSelect({
  id,
  label,
  options = [],
  required = false,
  disabled = false,
  hint,
  error,
  onChange
}) {
  const hintId = id + '-hint',
    errorId = id + '-error';
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const defaultValue = (options.find(o => o.selected) || {}).value;
  return /*#__PURE__*/React.createElement("div", {
    className: "form-field"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id
  }, label, required && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "required-mark"
  }, "*")), /*#__PURE__*/React.createElement("select", {
    id: id,
    name: id,
    className: 'sort-select' + (error ? ' input-error' : ''),
    style: {
      width: '100%'
    },
    required: required,
    disabled: disabled,
    defaultValue: defaultValue,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    onChange: onChange
  }, options.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt.value,
    value: opt.value
  }, opt.label))), hint && !error && /*#__PURE__*/React.createElement("div", {
    id: hintId,
    className: "form-hint"
  }, hint), error && /*#__PURE__*/React.createElement("div", {
    id: errorId,
    className: "form-error",
    role: "alert"
  }, error));
}
Object.assign(__ds_scope, { FormSelect });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormSelect.jsx", error: String((e && e.message) || e) }); }

// components/forms/RadioGroup.jsx
try { (() => {
function RadioGroup({
  name,
  legend,
  options = [],
  required = false,
  error,
  onChange
}) {
  const errorId = name + '-error';
  return /*#__PURE__*/React.createElement("fieldset", {
    style: {
      border: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("legend", {
    style: {
      fontSize: '.875rem',
      color: 'var(--text-muted)',
      marginBottom: 8
    }
  }, legend), options.map(opt => /*#__PURE__*/React.createElement("label", {
    key: opt.value,
    className: "radio-option",
    style: opt.disabled ? {
      opacity: .5,
      cursor: 'not-allowed'
    } : undefined
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    value: opt.value,
    defaultChecked: opt.checked,
    required: required,
    disabled: opt.disabled,
    onChange: onChange,
    "aria-describedby": error ? errorId : undefined
  }), opt.label)), error && /*#__PURE__*/React.createElement("div", {
    id: errorId,
    className: "radio-group-error",
    role: "alert"
  }, error));
}
Object.assign(__ds_scope, { RadioGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RadioGroup.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function Textarea({
  id,
  label,
  placeholder,
  value,
  rows = 4,
  required = false,
  disabled = false,
  hint,
  error,
  onChange
}) {
  const hintId = id + '-hint',
    errorId = id + '-error';
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return /*#__PURE__*/React.createElement("div", {
    className: "form-field"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: id
  }, label, required && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "required-mark"
  }, "*")), /*#__PURE__*/React.createElement("textarea", {
    id: id,
    name: id,
    className: 'input' + (error ? ' input-error' : ''),
    placeholder: placeholder,
    rows: rows,
    required: required,
    disabled: disabled,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    onChange: onChange,
    defaultValue: value,
    style: {
      resize: 'vertical'
    }
  }), hint && !error && /*#__PURE__*/React.createElement("div", {
    id: hintId,
    className: "form-hint"
  }, hint), error && /*#__PURE__*/React.createElement("div", {
    id: errorId,
    className: "form-error",
    role: "alert"
  }, error));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/BottomNav.jsx
try { (() => {
function BottomNav({
  items = []
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "bottom-nav",
    "aria-label": "Main navigation"
  }, items.map(item => /*#__PURE__*/React.createElement("a", {
    key: item.href,
    href: item.href,
    className: 'nav-item' + (item.active ? ' active' : ''),
    "aria-current": item.active ? 'page' : undefined
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, item.icon), /*#__PURE__*/React.createElement("span", null, item.label))));
}
Object.assign(__ds_scope, { BottomNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/BottomNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Header.jsx
try { (() => {
function Header({
  title,
  live
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "header"
  }, /*#__PURE__*/React.createElement("h1", null, title), live !== undefined && /*#__PURE__*/React.createElement("span", {
    className: 'live-indicator ' + (live ? 'on' : 'off')
  }, live ? 'Live' : 'Offline'));
}
Object.assign(__ds_scope, { Header });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Header.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function Card({
  title,
  sub,
  children,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ('card ' + className).trim()
  }, title && /*#__PURE__*/React.createElement("div", {
    className: "item-name"
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    className: "item-sub"
  }, sub), children && /*#__PURE__*/React.createElement("div", {
    style: title || sub ? {
      marginTop: 12
    } : undefined
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminScreens.jsx
try { (() => {
const {
  Button,
  Card,
  Header,
  FormInput,
  FormSelect,
  Textarea,
  EmptyState
} = window.OurSharedEvents;
function AdminDashboard({
  events,
  onCreate,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stats-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-value"
  }, events.length), /*#__PURE__*/React.createElement("div", {
    className: "stat-label"
  }, "Events")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-value"
  }, "128"), /*#__PURE__*/React.createElement("div", {
    className: "stat-label"
  }, "Scans this week")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-value"
  }, "2"), /*#__PURE__*/React.createElement("div", {
    className: "stat-label"
  }, "Sponsors")))), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Your events"), events.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "\uD83D\uDCC5",
    title: "No events yet",
    message: "Create your first event \u2014 it's free, and stays free."
  }) : events.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "list-item",
    style: {
      cursor: 'pointer',
      border: '1px solid var(--border)',
      marginBottom: 8,
      background: 'var(--surface)'
    },
    onClick: () => onOpen(i)
  }, /*#__PURE__*/React.createElement("div", {
    className: "item-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "list-name"
  }, e.name), /*#__PURE__*/React.createElement("div", {
    className: "list-sub"
  }, e.when, " \xB7 ", e.where)), /*#__PURE__*/React.createElement(UecChip, {
    code: "enter",
    label: e.uec
  })))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true,
    onClick: onCreate
  }, "Create an event"));
}
function AdminCreate({
  onDone,
  onBack
}) {
  const [name, setName] = React.useState('');
  const [err, setErr] = React.useState(null);
  const submit = () => {
    if (!name.trim()) {
      setErr('Give your event a name — that is the only thing we need to start.');
      return;
    }
    onDone({
      name: name.trim(),
      when: 'Sat Sep 12 · 10 am',
      where: 'Riverside Park',
      uec: 'OSE-ENTER-01'
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement(FormInput, {
    id: "ev-name",
    label: "Event name",
    required: true,
    placeholder: "Maple Street Fair",
    value: name,
    onChange: e => {
      setName(e.target.value);
      if (err) setErr(null);
    },
    error: err,
    hint: "Shown on your poster and public page"
  }), /*#__PURE__*/React.createElement(FormSelect, {
    id: "ev-template",
    label: "Kind of event",
    options: [{
      value: 'fair',
      label: 'Street fair / market',
      selected: true
    }, {
      value: 'concert',
      label: 'Concert / performance'
    }, {
      value: 'run',
      label: 'Fun run / walk'
    }, {
      value: 'meeting',
      label: 'Community meeting'
    }],
    hint: "Picks sensible defaults \u2014 you can change everything later"
  }), /*#__PURE__*/React.createElement(FormInput, {
    id: "ev-date",
    label: "Date",
    type: "date"
  }), /*#__PURE__*/React.createElement(FormInput, {
    id: "ev-where",
    label: "Where",
    placeholder: "Riverside Park, 200 Maple St"
  }), /*#__PURE__*/React.createElement(Textarea, {
    id: "ev-why",
    label: "Why does it matter?",
    rows: 2,
    hint: "One plain sentence \u2014 becomes the 'Why' on your public page"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: onBack
  }, "Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true,
    onClick: submit
  }, "Create event \u2014 free")));
}
function AdminPoster({
  event
}) {
  const [copied, setCopied] = React.useState(null);
  const links = [['Public page', 'ose.to/maple-fair'], ['Check-in', 'ose.to/maple-fair/in'], ['Feedback', 'ose.to/maple-fair/say']];
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Your poster"), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: 'center',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, "OurSharedEvents"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.3rem',
      fontWeight: 700,
      margin: '10px 0 2px'
    }
  }, event.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.8rem',
      color: 'var(--text-muted)',
      marginBottom: 14
    }
  }, event.when, " \xB7 ", event.where), /*#__PURE__*/React.createElement("div", {
    className: "qr-frame",
    style: {
      marginBottom: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(QRBlock, {
    seed: event.name,
    size: 150,
    color: "var(--uec-enter-scan)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.8rem',
      fontWeight: 600
    }
  }, "Scan for the details"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.75rem',
      color: 'var(--accent)',
      fontFamily: 'ui-monospace,Menlo,monospace',
      marginTop: 4
    }
  }, "ose.to/maple-fair")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true
  }, "Download poster (PDF)"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Share\u2026"))), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Your links \u2014 tap to copy"), links.map(([label, url]) => /*#__PURE__*/React.createElement("button", {
    key: url,
    className: "list-item",
    style: {
      width: '100%',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      marginBottom: 8,
      cursor: 'pointer',
      fontFamily: 'var(--font)',
      textAlign: 'left'
    },
    onClick: () => setCopied(url)
  }, /*#__PURE__*/React.createElement("div", {
    className: "item-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "list-name",
    style: {
      color: 'var(--text)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "list-sub",
    style: {
      fontFamily: 'ui-monospace,Menlo,monospace'
    }
  }, url)), /*#__PURE__*/React.createElement("span", {
    className: "list-count"
  }, copied === url ? 'Copied ✓' : 'Copy'))), /*#__PURE__*/React.createElement("div", {
    className: "form-hint"
  }, "Digital posters can go anywhere these links can \u2014 group chats, newsletters, socials.")));
}
function AdminMap() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Your corridor"), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement(HexMap, {
    highlights: [{
      q: 5,
      r: 2,
      type: 'event'
    }, {
      q: 4,
      r: 2,
      type: 'reach'
    }, {
      q: 6,
      r: 2,
      type: 'reach'
    }, {
      q: 5,
      r: 1,
      type: 'reach'
    }, {
      q: 5,
      r: 3,
      type: 'reach'
    }, {
      q: 4,
      r: 1,
      type: 'reach'
    }, {
      q: 4,
      r: 3,
      type: 'reach'
    }, {
      q: 3,
      r: 1,
      type: 'poster'
    }, {
      q: 7,
      r: 3,
      type: 'poster'
    }, {
      q: 6,
      r: 4,
      type: 'poster'
    }, {
      q: 2,
      r: 3,
      type: 'sponsor'
    }, {
      q: 8,
      r: 1,
      type: 'sponsor'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-hint",
    style: {
      marginTop: 8
    }
  }, "Plan your canvas: each outlined hex is a spot you marked for a physical poster. Sponsor pins show where your sponsors are based.")), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Poster spots"), [['Maple St gate', 'Poster up ✓'], ['Corner store window', 'Poster up ✓'], ['Library board', 'Planned']].map(([n, s]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    className: "list-item",
    style: {
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "list-name"
  }, n), /*#__PURE__*/React.createElement("span", {
    className: "meta-badge",
    style: s.includes('✓') ? {
      color: 'var(--success)',
      background: 'color-mix(in srgb, var(--success) 12%, transparent)'
    } : {}
  }, s)))));
}
Object.assign(window, {
  AdminDashboard,
  AdminCreate,
  AdminPoster,
  AdminMap
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/display/DisplayScreens.jsx
try { (() => {
function DisplayFrame({
  children,
  phase
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "display-card"
  }, children, /*#__PURE__*/React.createElement("div", {
    className: "sponsor-slot"
  }, "Supported by your neighbors", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "sponsor-name"
  }, "Maple Corner Bakery"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.65rem',
      marginTop: 4
    }
  }, "Sponsors rotate \u2014 same size, same spot for everyone"))));
}
function DisplayPre() {
  return /*#__PURE__*/React.createElement(DisplayFrame, null, /*#__PURE__*/React.createElement("div", {
    className: "brand",
    style: {
      marginBottom: 16
    }
  }, "OurSharedEvents"), /*#__PURE__*/React.createElement("div", {
    className: "cta"
  }, "Maple Street Fair"), /*#__PURE__*/React.createElement("div", {
    className: "cta-sub"
  }, "Saturday Sep 12 \xB7 10 am \u2013 4 pm \xB7 Riverside Park"), /*#__PURE__*/React.createElement("div", {
    className: "qr-frame"
  }, /*#__PURE__*/React.createElement(QRBlock, {
    seed: "enter-maple",
    size: 200,
    color: "var(--uec-enter-scan)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.95rem',
      fontWeight: 600
    }
  }, "Scan for the details"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.75rem',
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, "or visit ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)',
      fontFamily: 'ui-monospace,Menlo,monospace'
    }
  }, "ose.to/maple-fair")));
}
function DisplayActive() {
  return /*#__PURE__*/React.createElement(DisplayFrame, null, /*#__PURE__*/React.createElement("span", {
    className: "live-badge",
    style: {
      marginTop: 0,
      marginBottom: 16
    }
  }, "Live now"), /*#__PURE__*/React.createElement("div", {
    className: "cta"
  }, "Welcome to the fair"), /*#__PURE__*/React.createElement("div", {
    className: "cta-sub"
  }, "Scan to check in \u2014 it takes one tap"), /*#__PURE__*/React.createElement("div", {
    className: "qr-frame"
  }, /*#__PURE__*/React.createElement(QRBlock, {
    seed: "checkin-maple",
    size: 200,
    color: "var(--uec-checkin-scan)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "now-playing",
    style: {
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "now-playing-label"
  }, "Now"), /*#__PURE__*/React.createElement("div", {
    className: "now-playing-track"
  }, "Main stage \u2014 The River Band"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.75rem',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, "Next: Kids parade \xB7 1:45 pm")));
}
function DisplayPost() {
  return /*#__PURE__*/React.createElement(DisplayFrame, null, /*#__PURE__*/React.createElement("div", {
    className: "brand",
    style: {
      marginBottom: 16
    }
  }, "OurSharedEvents"), /*#__PURE__*/React.createElement("div", {
    className: "cta"
  }, "Thank you, Maple Street"), /*#__PURE__*/React.createElement("div", {
    className: "cta-sub"
  }, "612 neighbors came \xB7 $4,180 raised for the playground"), /*#__PURE__*/React.createElement("div", {
    className: "qr-frame"
  }, /*#__PURE__*/React.createElement(QRBlock, {
    seed: "archive-maple",
    size: 200,
    color: "var(--uec-archive-scan)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.95rem',
      fontWeight: 600
    }
  }, "Scan for photos & what's next"));
}
Object.assign(window, {
  DisplayPre,
  DisplayActive,
  DisplayPost
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/display/DisplayScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/public/PublicScreens.jsx
try { (() => {
const {
  Button,
  Card,
  Header
} = window.OurSharedEvents;
function W({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title",
    style: {
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.95rem',
      lineHeight: 1.5
    }
  }, children));
}
function SponsorSlot() {
  return /*#__PURE__*/React.createElement("div", {
    className: "sponsor-slot",
    style: {
      textAlign: 'center'
    }
  }, "Supported by your neighbors", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "sponsor-name"
  }, "Maple Corner Bakery"), " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "sponsor-name"
  }, "Riverside Hardware"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.65rem',
      marginTop: 4
    }
  }, "Same size, same spots for every sponsor"));
}
function PublicPre() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content",
    style: {
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement(W, {
    label: "What"
  }, "Maple Street Fair \u2014 food stalls, live music, and a kids corner. Free to attend."), /*#__PURE__*/React.createElement(W, {
    label: "When"
  }, "Saturday, September 12 \xB7 10 am to 4 pm"), /*#__PURE__*/React.createElement(W, {
    label: "Where"
  }, "Riverside Park, 200 Maple St.", /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.8rem',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, "Step-free entry from the Maple St gate.")), /*#__PURE__*/React.createElement(W, {
    label: "Who"
  }, "Everyone is welcome. Hosted by the Maple Street Neighbors Association."), /*#__PURE__*/React.createElement(W, {
    label: "Why"
  }, "To raise funds for the park playground \u2014 every stall fee goes to the build."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true
  }, "Add to my calendar"), /*#__PURE__*/React.createElement(SponsorSlot, null));
}
function PublicActive() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content",
    style: {
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: 'center',
      borderColor: 'var(--live)',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "live-badge",
    style: {
      marginTop: 0
    }
  }, "Happening now"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.05rem',
      fontWeight: 700,
      marginTop: 10
    }
  }, "Maple Street Fair"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.8rem',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, "Until 4 pm \xB7 Riverside Park")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true
  }, "Check in \u2014 I'm here"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10
    }
  }), /*#__PURE__*/React.createElement(W, {
    label: "Now"
  }, "Main stage \u2014 The River Band (until 1:30)"), /*#__PURE__*/React.createElement(W, {
    label: "Next"
  }, "1:45 pm \u2014 Kids parade from the Maple St gate"), /*#__PURE__*/React.createElement(W, {
    label: "Need help?"
  }, "Look for the pink HELP signs, or ask anyone in a yellow vest."), /*#__PURE__*/React.createElement(SponsorSlot, null));
}
function PublicPost() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content",
    style: {
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '2rem'
    },
    "aria-hidden": "true"
  }, "\uD83D\uDC9C"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '1.05rem',
      fontWeight: 700,
      marginTop: 6
    }
  }, "Thank you for coming"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.8rem',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, "612 neighbors checked in on Saturday.")), /*#__PURE__*/React.createElement(W, {
    label: "What happened"
  }, "The fair raised $4,180 for the playground build."), /*#__PURE__*/React.createElement(W, {
    label: "What's next"
  }, "The playground build starts October 3 \u2014 same park."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true
  }, "Tell us one thing to improve"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    block: true
  }, "See photos from the day"), /*#__PURE__*/React.createElement(SponsorSlot, null));
}
Object.assign(window, {
  PublicPre,
  PublicActive,
  PublicPost
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/public/PublicScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/reports/ReportScreens.jsx
try { (() => {
function Bars({
  rows
}) {
  const max = Math.max(...rows.map(r => r[1]));
  return /*#__PURE__*/React.createElement("div", {
    className: "bar-chart"
  }, rows.map(([label, n]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    className: "bar-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar-label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "bar-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar-fill",
    style: {
      width: n / max * 100 + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "bar-count"
  }, n))));
}
function Stats({
  items
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "stats-row",
    style: {
      marginBottom: 20
    }
  }, items.map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    className: "stat-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-value"
  }, v), /*#__PURE__*/React.createElement("div", {
    className: "stat-label"
  }, l))));
}
function Note({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "form-hint",
    style: {
      marginBottom: 20
    }
  }, children);
}
function ReportPre() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement(Stats, {
    items: [['214', 'Poster scans'], ['87', 'Calendar adds'], ['3', 'Poster spots up']]
  }), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Scans by source"), /*#__PURE__*/React.createElement(Bars, {
    rows: [['Maple St gate', 96], ['Corner store', 64], ['Library board', 31], ['Digital links', 23]]
  })), /*#__PURE__*/React.createElement(Note, null, "Numbers are corridor-level counts \u2014 never person-level. Nothing here identifies a neighbor."));
}
function ReportActive() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement(Stats, {
    items: [['391', 'Checked in'], ['58', 'Scans this hour'], ['2', 'Help requests']]
  }), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Check-ins by hour"), /*#__PURE__*/React.createElement(Bars, {
    rows: [['10 am', 74], ['11 am', 118], ['12 pm', 121], ['1 pm', 78]]
  })), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Sponsor coverage today"), /*#__PURE__*/React.createElement(Bars, {
    rows: [['Maple Corner Bakery', 196], ['Riverside Hardware', 195]]
  }), /*#__PURE__*/React.createElement(Note, null, "Every sponsor gets the same slot at the same size; rotation keeps impressions even.")));
}
function ReportPost() {
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement(Stats, {
    items: [['612', 'Neighbors came'], ['$4,180', 'Raised'], ['46', 'Feedback notes']]
  }), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Where people came from"), /*#__PURE__*/React.createElement(Bars, {
    rows: [['Physical posters', 342], ['Shared links', 168], ['Walk-ups', 102]]
  })), /*#__PURE__*/React.createElement("div", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Sponsor impressions (final)"), /*#__PURE__*/React.createElement(Bars, {
    rows: [['Maple Corner Bakery', 1204], ['Riverside Hardware', 1198]]
  })), /*#__PURE__*/React.createElement(Note, null, "This SharedReport is the same one your sponsors see \u2014 one honest set of numbers for everybody."));
}
Object.assign(window, {
  ReportPre,
  ReportActive,
  ReportPost
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/reports/ReportScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/shared/KitShared.jsx
try { (() => {
// Shared kit helpers: phone shell, H3 hex map (diagram), mock QR, phase toggle
function PhoneShell({
  children,
  width = 390
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: width,
      margin: '0 auto',
      minHeight: '100dvh',
      background: 'var(--bg)',
      position: 'relative',
      borderLeft: '1px solid var(--border)',
      borderRight: '1px solid var(--border)'
    }
  }, children);
}
// Deterministic pseudo-QR (design mock, not scannable)
function QRBlock({
  seed = 'ose',
  size = 180,
  color = 'var(--uec-enter-scan)'
}) {
  const n = 21,
    cells = [];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) % 100 < 46;
  };
  const finder = (r, c) => r < 7 && c < 7 || r < 7 && c >= n - 7 || r >= n - 7 && c < 7;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let on = false;
    if (finder(r, c)) {
      const rr = r >= n - 7 ? r - (n - 7) : r,
        cc = c >= n - 7 ? c - (n - 7) : c;
      on = rr === 0 || rr === 6 || cc === 0 || cc === 6 || rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
    } else on = rnd();
    if (on) cells.push(/*#__PURE__*/React.createElement("rect", {
      key: r + '-' + c,
      x: c,
      y: r,
      width: 1.02,
      height: 1.02
    }));
  }
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: '0 0 ' + n + ' ' + n,
    style: {
      display: 'block',
      fill: color
    },
    "aria-label": "Sample QR code"
  }, cells);
}
// H3 corridor map — flat diagram of res-7 hexes. highlights: [{q,r,type}] type: event|sponsor|poster|reach
function HexMap({
  cols = 11,
  rows = 6,
  highlights = [],
  height = 220,
  legend = true
}) {
  const s = 16,
    w = Math.sqrt(3) * s,
    hexes = [];
  const colors = {
    event: 'var(--accent)',
    sponsor: 'var(--uec-sponsor)',
    poster: 'var(--live)',
    reach: 'color-mix(in srgb, var(--accent) 22%, transparent)'
  };
  const pts = Array.from({
    length: 6
  }, (_, i) => {
    const a = Math.PI / 180 * (60 * i - 30);
    return Math.cos(a) * s + ',' + Math.sin(a) * s;
  }).join(' ');
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const x = q * w + (r % 2 ? w / 2 : 0) + s,
      y = r * s * 1.5 + s;
    const hl = highlights.find(hh => hh.q === q && hh.r === r);
    hexes.push(/*#__PURE__*/React.createElement("g", {
      key: q + '-' + r,
      transform: 'translate(' + x + ',' + y + ')'
    }, /*#__PURE__*/React.createElement("polygon", {
      points: pts,
      fill: hl ? colors[hl.type] : 'var(--surface)',
      stroke: hl && hl.type === 'poster' ? 'var(--live)' : 'var(--border)',
      strokeWidth: hl && hl.type === 'poster' ? 1.6 : 0.7
    }), hl && hl.type === 'event' && /*#__PURE__*/React.createElement("circle", {
      r: "4",
      fill: "#fff"
    })));
  }
  const items = [['event', 'Your event'], ['poster', 'Poster spot'], ['sponsor', 'Sponsor location'], ['reach', 'Reach corridor']];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: height,
    viewBox: '0 0 ' + (cols * w + w) + ' ' + (rows * s * 1.5 + s * 1.6),
    role: "img",
    "aria-label": "Neighborhood corridor map"
  }, hexes), legend && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      flexWrap: 'wrap',
      fontSize: '.7rem',
      color: 'var(--text-muted)',
      padding: '6px 2px'
    }
  }, items.map(([t, l]) => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: colors[t],
      border: t === 'poster' ? '1.5px solid var(--live)' : 'none',
      display: 'inline-block'
    }
  }), l))));
}
// Big segmented phase toggle (Pre / During / After) — one decision, huge targets
function PhaseToggle({
  phase,
  onChange
}) {
  const opts = [['pre', 'Before'], ['active', 'During'], ['post', 'After']];
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    "aria-label": "Event time frame",
    style: {
      display: 'flex',
      gap: 6,
      padding: 12,
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)'
    }
  }, opts.map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    role: "tab",
    "aria-selected": phase === v,
    onClick: () => onChange(v),
    style: {
      flex: 1,
      minHeight: 48,
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font)',
      fontWeight: 600,
      fontSize: '.85rem',
      cursor: 'pointer',
      border: '1px solid ' + (phase === v ? 'var(--accent)' : 'var(--border)'),
      background: phase === v ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--surface)',
      color: phase === v ? 'var(--accent)' : 'var(--text-muted)'
    }
  }, l)));
}
function UecChip({
  code,
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: '.65rem',
      fontFamily: 'ui-monospace,Menlo,monospace',
      color: 'var(--text)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '3px 7px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 2,
      background: 'var(--uec-' + code + ')',
      display: 'inline-block'
    }
  }), label ?? code);
}
Object.assign(window, {
  PhoneShell,
  QRBlock,
  HexMap,
  PhaseToggle,
  UecChip
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/shared/KitShared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sponsor/SponsorSteps.jsx
try { (() => {
const {
  Button,
  FormInput,
  FormSelect,
  Checkbox
} = window.OurSharedEvents;
const CATEGORIES = [{
  id: 'markets',
  label: 'Markets & fairs',
  uec: 'enter',
  types: ['Farmers market', 'Street fair', 'Craft market'],
  recommended: true
}, {
  id: 'shows',
  label: 'Music & performance',
  uec: 'live',
  types: ['Concert', 'Open mic', 'Theater night']
}, {
  id: 'active',
  label: 'Runs & sports',
  uec: 'checkin',
  types: ['Fun run', 'Bike ride', 'Pickup league']
}, {
  id: 'civic',
  label: 'Civic & meetings',
  uec: 'utility',
  types: ['Town hall', 'Cleanup day', 'Board meeting']
}];
function StepRail({
  step
}) {
  const steps = ['Business', 'Assets', 'Events', 'Review'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      bottom: 0,
      display: 'flex',
      gap: 4,
      padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
      background: 'color-mix(in srgb, var(--bg) 95%, transparent)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      zIndex: 30,
      maxWidth: 390,
      margin: '0 auto'
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      flex: 1,
      textAlign: 'center',
      fontSize: '.65rem',
      fontWeight: 600,
      color: i === step ? 'var(--accent)' : i < step ? 'var(--success)' : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 4,
      borderRadius: 2,
      marginBottom: 5,
      background: i === step ? 'var(--accent)' : i < step ? 'var(--success)' : 'var(--border)'
    }
  }), i < step ? s + ' ✓' : s)));
}
function SBusiness({
  next
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-hint",
    style: {
      marginBottom: 16
    }
  }, "You were invited by the organizer of ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "Maple Street Fair"), ". Three short steps \u2014 you can save and finish later."), /*#__PURE__*/React.createElement(FormInput, {
    id: "biz-name",
    label: "Business name",
    required: true,
    value: "Maple Corner Bakery"
  }), /*#__PURE__*/React.createElement(FormInput, {
    id: "biz-web",
    label: "Website",
    type: "url",
    placeholder: "maplecornerbakery.com",
    hint: "We'll grab your logo from here \u2014 or you can upload one"
  }), /*#__PURE__*/React.createElement(FormInput, {
    id: "biz-addr",
    label: "Business address",
    required: true,
    value: "18 Maple St",
    hint: "Why we ask: your address sets your Local badge \u2014 it can't be bought"
  }), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "meta-badge high",
    style: {
      fontSize: '.75rem',
      padding: '4px 10px'
    }
  }, "Local \uD83D\uDD12"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '.75rem',
      color: 'var(--text-muted)'
    }
  }, "Set by your location, not buyable. Locals collectively hold at least 30% of rotation.")), /*#__PURE__*/React.createElement(FormSelect, {
    id: "biz-type",
    label: "Business type",
    options: [{
      value: 'food',
      label: 'Bakery / café / restaurant',
      selected: true
    }, {
      value: 'retail',
      label: 'Retail shop'
    }, {
      value: 'services',
      label: 'Services'
    }, {
      value: 'other',
      label: 'Something else'
    }],
    hint: "Helps us suggest the right events in step 3"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true,
    onClick: next
  }, "Continue"));
}
function SAssets({
  next,
  back
}) {
  const tiles = [['Poster', '3:4'], ['Banner', '8:1'], ['Vertical', '9:16'], ['Square', '1:1']];
  return /*#__PURE__*/React.createElement("div", {
    className: "content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.9rem',
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Same size, same spots for everyone"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.75rem',
      color: 'var(--text-muted)'
    }
  }, "You choose which events and how often \u2014 never a bigger slot.")), /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Give us your best image \u2014 we fit it to all four spots"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10,
      marginBottom: 16
    }
  }, tiles.map(([name, ratio], i) => /*#__PURE__*/React.createElement("div", {
    key: name,
    className: "card",
    style: {
      textAlign: 'center',
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 64,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      background: i === 0 ? 'var(--uec-sponsor)' : 'var(--surface-hover)',
      border: i === 0 ? 'none' : '2px dashed var(--border)',
      color: '#fff',
      fontWeight: 700
    }
  }, i === 0 ? 'MCB' : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '.7rem',
      color: 'var(--text-muted)',
      fontWeight: 400
    }
  }, "auto from source")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.8rem',
      fontWeight: 600
    }
  }, name, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontWeight: 400
    }
  }, ratio)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.7rem',
      color: i === 0 ? 'var(--success)' : 'var(--text-muted)',
      marginTop: 2
    }
  }, i === 0 ? 'Ready ✓' : 'Derived ✓ · tap to adjust')))), /*#__PURE__*/React.createElement("div", {
    className: "form-hint",
    style: {
      marginBottom: 16
    }
  }, "No image? We'll use a clean monogram in your name \u2014 you'll still appear everywhere."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: back
  }, "Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true,
    onClick: next
  }, "Continue")));
}
function SCategories({
  next,
  back,
  sel,
  setSel
}) {
  const [open, setOpen] = React.useState(null);
  const toggleCat = id => setSel({
    ...sel,
    [id]: sel[id] ? null : CATEGORIES.find(c => c.id === id).types.slice()
  });
  const toggleType = (id, t) => {
    const cur = sel[id] || [];
    const nextTypes = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t];
    setSel({
      ...sel,
      [id]: nextTypes.length ? nextTypes : null
    });
  };
  const matched = Object.values(sel).filter(Boolean).reduce((n, a) => n + a.length * 2, 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "content",
    style: {
      paddingBottom: 120
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Which events do you want to appear at?"), CATEGORIES.map(c => {
    const picked = sel[c.id],
      all = picked && picked.length === c.types.length;
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      className: "card",
      style: {
        marginBottom: 10,
        borderColor: picked ? 'var(--accent)' : 'var(--border)'
      }
    }, /*#__PURE__*/React.createElement("label", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        minHeight: 44,
        marginBottom: 0,
        color: 'var(--text)',
        fontSize: '.9rem',
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!picked,
      onChange: () => toggleCat(c.id),
      style: {
        width: 22,
        height: 22,
        accentColor: 'var(--accent)',
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, c.label, c.recommended && /*#__PURE__*/React.createElement("span", {
      className: "genre-tag",
      style: {
        marginLeft: 8
      }
    }, "Suggested for bakeries")), /*#__PURE__*/React.createElement(UecChip, {
      code: c.uec,
      label: picked ? all ? 'whole' : picked.length + ' of ' + c.types.length : c.types.length + ' types'
    })), /*#__PURE__*/React.createElement("button", {
      className: "btn-link",
      style: {
        padding: '4px 0',
        minHeight: 32
      },
      onClick: () => setOpen(open === c.id ? null : c.id)
    }, open === c.id ? 'Hide types' : 'Fine-tune types'), open === c.id && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column'
      }
    }, c.types.map(t => /*#__PURE__*/React.createElement("label", {
      key: t,
      className: "checkbox-label"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!(picked && picked.includes(t)),
      onChange: () => toggleType(c.id, t)
    }), t))));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      bottom: 64,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: 12,
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "stat-value",
    style: {
      fontSize: '1.2rem'
    }
  }, matched), /*#__PURE__*/React.createElement("div", {
    className: "stat-label"
  }, "upcoming events near you match")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '.7rem',
      color: 'var(--text-muted)',
      flex: 1
    }
  }, "Share of rotation depends on how many sponsors join each event \u2014 with few sponsors you can hold up to 100%.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: back
  }, "Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true,
    disabled: matched === 0,
    onClick: next
  }, "Continue")));
}
function SReview({
  back,
  sel
}) {
  const [live, setLive] = React.useState(false);
  const picks = CATEGORIES.filter(c => sel[c.id]);
  if (live) return /*#__PURE__*/React.createElement("div", {
    className: "content",
    style: {
      textAlign: 'center',
      paddingTop: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '2.5rem'
    },
    "aria-hidden": "true"
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '12px 0 6px'
    }
  }, "You're live"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      fontSize: '.9rem',
      maxWidth: '32ch',
      margin: '0 auto 20px'
    }
  }, "Maple Corner Bakery now appears on every surface of the events you picked \u2014 same size and spot as every sponsor."), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    block: true
  }, "See your SharedReport"));
  return /*#__PURE__*/React.createElement("div", {
    className: "content",
    style: {
      paddingBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 8,
      background: 'var(--uec-sponsor)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700
    }
  }, "MCB"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "list-name"
  }, "Maple Corner Bakery"), /*#__PURE__*/React.createElement("div", {
    className: "list-sub"
  }, "18 Maple St")), /*#__PURE__*/React.createElement("span", {
    className: "meta-badge high"
  }, "Local \uD83D\uDD12")), /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Where you'll appear"), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(HexMap, {
    height: 170,
    highlights: [{
      q: 5,
      r: 2,
      type: 'event'
    }, {
      q: 7,
      r: 4,
      type: 'event'
    }, {
      q: 3,
      r: 3,
      type: 'event'
    }, {
      q: 4,
      r: 2,
      type: 'sponsor'
    }, {
      q: 4,
      r: 3,
      type: 'reach'
    }, {
      q: 5,
      r: 3,
      type: 'reach'
    }, {
      q: 6,
      r: 2,
      type: 'reach'
    }, {
      q: 6,
      r: 3,
      type: 'reach'
    }, {
      q: 4,
      r: 1,
      type: 'reach'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    className: "form-hint"
  }, "Matched events in your corridor. Reach is corridor-level \u2014 never person-level.")), /*#__PURE__*/React.createElement("div", {
    className: "section-title"
  }, "Your events"), picks.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "list-item",
    style: {
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "list-name"
  }, c.label), /*#__PURE__*/React.createElement("span", {
    className: "list-sub"
  }, sel[c.id].length === c.types.length ? 'whole category' : sel[c.id].length + ' of ' + c.types.length + ' (edited)'))), /*#__PURE__*/React.createElement("div", {
    className: "form-hint",
    style: {
      margin: '12px 0 16px'
    }
  }, "Same size and spots as every sponsor. Local is set by your location and can't be bought. Locals collectively hold at least 30% of rotation, none above 40%."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: back
  }, "Back"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    block: true,
    onClick: () => setLive(true)
  }, "Go live")), /*#__PURE__*/React.createElement("div", {
    className: "form-hint",
    style: {
      textAlign: 'center',
      marginTop: 10,
      opacity: .7
    }
  }, "Next (later): choose how often you rotate \u2014 the only thing that will ever cost money."));
}
Object.assign(window, {
  StepRail,
  SBusiness,
  SAssets,
  SCategories,
  SReview
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sponsor/SponsorSteps.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.AccessDenied = __ds_scope.AccessDenied;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Loading = __ds_scope.Loading;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FormGroup = __ds_scope.FormGroup;

__ds_ns.FormInput = __ds_scope.FormInput;

__ds_ns.FormSelect = __ds_scope.FormSelect;

__ds_ns.RadioGroup = __ds_scope.RadioGroup;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.BottomNav = __ds_scope.BottomNav;

__ds_ns.Header = __ds_scope.Header;

__ds_ns.Card = __ds_scope.Card;

})();

/* MapDetail — INTENTIONAL ADDITION, not part of @ocr/ui.
   The poster minus its art. Tap a point on the corridor map and it opens into the
   event's route list. Art is dropped because it neither survives thumbnail size nor
   helps anyone choose a route; identity is carried by type, which this system does well.
   ONE code is armed at a time and it is always named, so "which one am I scanning?"
   cannot happen — the failure mode a grid of small codes guarantees. */
(() => {
const ns = (window.OurSharedEvents = window.OurSharedEvents || {});
const h = React.createElement;
const GLYPH = { enter: '\u{1F6AA}', checkin: '✅', live: '\u{1F534}', alert: '⚠️',
  staff: '\u{1F3BD}', help: '\u{1F198}', feedback: '\u{1F4AC}', sponsor: '\u{1F91D}',
  archive: '\u{1F4E6}', shop: '\u{1F6CD}️', utility: '\u{1F527}' };

function MapDetail({ name, when, where, routes = [], armed, onArm, onClose, sponsor }) {
  const current = routes.find((r) => r.path === armed) || null;
  return h('div', { className: 'map-detail', role: 'group', 'aria-label': name },
    h('div', { className: 'map-detail-head' },
      h('div', { className: 'map-detail-id' },
        h('h2', { className: 'map-detail-name' }, name),
        h('p', { className: 'map-detail-meta' }, when),
        h('p', { className: 'map-detail-meta' }, where)),
      onClose ? h('button', { type: 'button', className: 'btn btn-secondary',
        onClick: onClose, 'aria-label': 'Close ' + name }, 'Close') : null),
    h('p', { className: 'section-title' }, 'What you can do here'),
    h('ul', { className: 'route-list' }, routes.map((r) => {
      const on = r.path === armed;
      return h('li', { key: r.path },
        h('button', {
          type: 'button',
          className: 'route-row' + (on ? ' is-armed' : ''),
          'aria-pressed': on,
          onClick: onArm ? () => onArm(r.path) : undefined,
        },
          h('span', { className: 'route-glyph', 'aria-hidden': 'true',
            style: { background: 'var(--uec-' + r.uec + '-ui)' } }, GLYPH[r.uec]),
          h('span', { className: 'route-text' },
            h('span', { className: 'route-label' }, r.label),
            h('span', { className: 'route-sub' }, r.sub)),
          h('span', { className: 'route-state' }, on ? 'Ready to scan' : 'Show code')));
    })),
    current ? h('div', { className: 'route-scan' },
      h('div', { className: 'qr-frame qr-physical qr-armed' },
        h('div', { className: 'qr-placeholder' }, current.path)),
      h('p', { className: 'route-scan-label' },
        'Scan for: ', h('strong', null, current.label))) : null,
    sponsor ? h('div', { className: 'sponsor-slot' },
      'Backed by ', h('span', { className: 'sponsor-name' }, sponsor), '. ',
      'Same size, same spots for every sponsor.') : null);
}
ns.MapDetail = MapDetail;
})();
