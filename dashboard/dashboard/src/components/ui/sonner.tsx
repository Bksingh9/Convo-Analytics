import * as React from "react"

export interface ToasterProps {
  // Add any props you need
}

export const Toaster: React.FC<ToasterProps> = ({ ...props }) => {
  return <div {...props} />
}
