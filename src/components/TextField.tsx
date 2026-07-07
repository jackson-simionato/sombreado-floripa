import { forwardRef, type InputHTMLAttributes } from "react";

import styles from "./TextField.module.css";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ className, id, label, ...props }, ref) {
    const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const classes = [styles.input, className].filter(Boolean).join(" ");

    return (
      <label className={styles.field} htmlFor={inputId}>
        <span>{label}</span>
        <input ref={ref} className={classes} id={inputId} {...props} />
      </label>
    );
  }
);
