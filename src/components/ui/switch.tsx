'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Toggle switch — 38×22 pill.
 *
 * Uses role="switch" + aria-checked, NOT aria-pressed. aria-pressed describes
 * a toggle *button* ("is this button depressed"); a switch announces its state
 * as on/off, which is what a visibility control actually is. SectionToggle
 * previously used aria-pressed and so announced incorrectly.
 */
export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Accessible name when there is no visible <label>. */
  label?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, label, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full",
        "border border-transparent transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block h-[18px] w-[18px] rounded-full bg-background shadow-sm",
          "transition-transform duration-150 ease-out",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  )
)
Switch.displayName = "Switch"

export { Switch }
