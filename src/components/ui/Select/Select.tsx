import React, { useState, useRef, useEffect, useId } from 'react';
import styles from './Select.module.css';
import { cx } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
  id: propId,
}: SelectProps) {
  const autoId = useId();
  const id = propId ?? autoId;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={cx(styles.wrapper, className)} ref={containerRef}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        className={cx(styles.trigger, disabled && styles.triggerDisabled)}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ color: selectedOption ? 'inherit' : 'var(--color-text-muted)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {options.length === 0 ? (
            <div className={styles.option} style={{ color: 'var(--color-text-muted)', cursor: 'default' }}>
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={cx(styles.option, isSelected && styles.optionSelected)}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
