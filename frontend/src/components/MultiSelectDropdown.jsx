import { useEffect, useRef, useState } from 'react';
import styles from './MultiSelectDropdown.module.css';

export default function MultiSelectDropdown({
  label,
  allLabel,
  selectedValues,
  options,
  onToggle,
  onClear,
  getOptionLabel,
  getSelectedLabel,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const buttonLabel = selectedValues.length === 0
    ? allLabel
    : selectedValues.length === 1
      ? getOptionLabel(selectedValues[0])
      : getSelectedLabel(selectedValues.length);

  return (
    <div className={styles.container} ref={containerRef}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selectedValues.length ? styles.selectedLabel : styles.allLabel}>
          {buttonLabel}
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className={styles.menu} role="listbox" aria-label={label} aria-multiselectable="true">
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClear}
            disabled={selectedValues.length === 0}
          >
            {allLabel}
          </button>
          {options.map((option) => {
            const selected = selectedValues.includes(option);
            return (
              <label key={option} className={styles.option}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(option)}
                />
                <span>{getOptionLabel(option)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
