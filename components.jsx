// ─── Shared glass UI primitives ───

function LineDot({ n, size = 18 }) {
  const label = (window.lineLabel ? window.lineLabel(n) : String(n));
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: LINE_COLORS[n] || '#888', color: '#fff',
      fontSize: size * (String(label).length > 1 ? 0.46 : 0.56), fontWeight: 700, lineHeight: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontFamily: '-apple-system, system-ui',
      boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
    }}>{label}</span>
  );
}

function LineBadges({ lines, size = 18 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {lines.map((n) => <LineDot key={n} n={n} size={size} />)}
    </span>
  );
}

function GlassCard({ children, style = {}, className = '', onClick }) {
  return (
    <div className={'glass ' + className} onClick={onClick} style={style}>
      {children}
    </div>
  );
}

function SectionLabel({ icon, children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 4px 9px' }}>
      {icon && <span style={{ width: 16, height: 16, color: 'var(--ink-3)' }}>{icon({ width: 16, height: 16 })}</span>}
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: 'var(--ink-3)' }}>{children}</span>
      {hint && <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 'auto', fontWeight: 500 }}>{hint}</span>}
    </div>
  );
}

// Segmented control on glass. options: [{key,label,icon,color}]
function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button key={o.key} className={'seg-item' + (on ? ' on' : '')} onClick={() => onChange(o.key)}
            style={on && o.color ? { color: '#fff' } : undefined}>
            {on && <span className="seg-pill" style={o.color ? { background: o.color } : undefined} />}
            <span className="seg-content">
              {o.icon && <span style={{ width: 18, height: 18, display: 'inline-flex' }}>{o.icon({ width: 18, height: 18 })}</span>}
              <span>{o.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { LineDot, LineBadges, GlassCard, SectionLabel, Segmented });
