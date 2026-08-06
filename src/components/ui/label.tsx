import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Field label.
 *
 * The `uppercase` variant is the admin's field-label treatment, repeated
 * literally in every editor before this existed. `default` is for anywhere a
 * quieter label reads better (dialogs, inline controls).
 */
const labelVariants = cva("block select-none", {
  variants: {
    variant: {
      uppercase:
        "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
      default: "text-sm font-medium text-foreground",
    },
  },
  defaultVariants: { variant: "uppercase" },
})

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  /** Appends a destructive asterisk with an accessible name. */
  required?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant, required, children, ...props }, ref) => (
    <label ref={ref} className={cn(labelVariants({ variant, className }))} {...props}>
      {children}
      {required && (
        <span className="ml-0.5 text-destructive" title="Required">
          *<span className="sr-only"> (required)</span>
        </span>
      )}
    </label>
  )
)
Label.displayName = "Label"

export { Label, labelVariants }
