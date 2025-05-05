import * as React from "react"

interface CurrentUrlProps {
  url: string
}

export const CurrentUrl: React.FC<CurrentUrlProps> = ({ url }) => {
  return <div className="current-url">{url}</div>
}
