import './CompareToggle.css';

type CompareToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
};

/**
 * Alterna “Comparar com período anterior” (ou segundo período escolhido). Acessível, foco visível.
 */
export function CompareToggle({
  checked,
  onChange,
  disabled = false,
  id = 'dashboard-compare-toggle',
}: CompareToggleProps) {
  return (
    <div className="compare-toggle">
      <input
        id={id}
        type="checkbox"
        className="compare-toggle__input"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="compare-toggle__label">
        <span className="compare-toggle__track" aria-hidden="true">
          <span className="compare-toggle__thumb" />
        </span>
        <span className="compare-toggle__text">Comparar com período anterior</span>
      </label>
    </div>
  );
}
