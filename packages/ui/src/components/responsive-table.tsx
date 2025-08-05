import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  mobileView?: "cards" | "scroll"
}

const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, mobileView = "cards", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          mobileView === "cards" ? "responsive-table-cards" : "responsive-table-scroll",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveTable.displayName = "ResponsiveTable"

interface ResponsiveTableRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  onClick?: () => void
  expandable?: boolean
}

const ResponsiveTableRow = React.forwardRef<HTMLDivElement, ResponsiveTableRowProps>(
  ({ className, children, onClick, expandable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group",
          // Desktop styles
          "md:table-row md:border-b md:transition-colors md:hover:bg-muted/50",
          // Mobile card styles
          "max-md:block max-md:mb-4 max-md:rounded-lg max-md:border max-md:bg-card max-md:p-4 max-md:shadow-sm",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
        {expandable && (
          <ChevronRight className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        )}
      </div>
    )
  }
)
ResponsiveTableRow.displayName = "ResponsiveTableRow"

interface ResponsiveTableCellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  label?: string
  priority?: "primary" | "secondary" | "hidden-mobile"
}

const ResponsiveTableCell = React.forwardRef<HTMLDivElement, ResponsiveTableCellProps>(
  ({ className, children, label, priority = "secondary", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Desktop styles
          "md:table-cell md:p-4 md:align-middle",
          // Mobile styles
          "max-md:flex max-md:justify-between max-md:items-start max-md:py-1",
          priority === "hidden-mobile" && "max-md:hidden",
          priority === "primary" && "max-md:font-semibold max-md:text-base",
          className
        )}
        {...props}
      >
        {label && (
          <span className="md:hidden text-sm text-muted-foreground min-w-[120px]">
            {label}:
          </span>
        )}
        <div className={cn(
          "max-md:text-right max-md:flex-1",
          priority === "primary" && "max-md:text-left"
        )}>
          {children}
        </div>
      </div>
    )
  }
)
ResponsiveTableCell.displayName = "ResponsiveTableCell"

const ResponsiveTableHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "md:table-header-group",
      "max-md:hidden", // Hide headers on mobile since we show labels inline
      className
    )}
    {...props}
  />
))
ResponsiveTableHeader.displayName = "ResponsiveTableHeader"

const ResponsiveTableBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "md:table-row-group",
      className
    )}
    {...props}
  />
))
ResponsiveTableBody.displayName = "ResponsiveTableBody"

const ResponsiveTableHead = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "md:table-cell md:h-12 md:px-4 md:text-left md:align-middle md:font-medium md:text-muted-foreground",
      className
    )}
    {...props}
  />
))
ResponsiveTableHead.displayName = "ResponsiveTableHead"

// Add CSS for responsive table layouts
const responsiveTableStyles = `
  .responsive-table-cards {
    @apply md:table md:w-full md:caption-bottom md:text-sm;
  }
  
  .responsive-table-scroll {
    @apply w-full overflow-x-auto;
  }
  
  .responsive-table-scroll > table {
    @apply min-w-full;
  }
  
  /* Ensure proper table display on desktop */
  @media (min-width: 768px) {
    .responsive-table-cards > *:not(style) {
      display: table-row-group;
    }
  }
`

// Inject styles
if (typeof window !== "undefined") {
  const styleEl = document.createElement("style")
  styleEl.textContent = responsiveTableStyles
  document.head.appendChild(styleEl)
}

export {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableHead,
  ResponsiveTableRow,
  ResponsiveTableCell,
}