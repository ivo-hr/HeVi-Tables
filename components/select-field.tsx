"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SelectFieldProps = {
  name: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function SelectField({
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  id,
  ariaLabel,
  disabled,
  className
}: SelectFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${controlId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value ?? ""
  );
  const selectedValue = value ?? internalValue;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue)
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      return;
    }
    event.preventDefault();
    if (event.key === "Enter" || event.key === " ") {
      setOpen((current) => !current);
      return;
    }
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : event.key === "ArrowDown"
            ? Math.min(selectedIndex + 1, options.length - 1)
            : Math.max(selectedIndex - 1, 0);
    choose(options[nextIndex]?.value ?? selectedValue);
  };

  return (
    <div className={["custom-select", className].filter(Boolean).join(" ")} ref={rootRef}>
      <input type="hidden" name={name} value={selectedValue} />
      <button
        ref={buttonRef}
        id={controlId}
        type="button"
        className="custom-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
      >
        <span>
          <strong>{selected?.label}</strong>
          {selected?.description ? <small>{selected.description}</small> : null}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div className="custom-select-popover" id={listboxId} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              className={option.value === selectedValue ? "selected" : undefined}
              onClick={() => choose(option.value)}
            >
              <span>
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
              {option.value === selectedValue ? <Check size={17} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
