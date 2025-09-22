import * as React from "react"

export interface TooltipProviderProps {
  children: React.ReactNode
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>
}
