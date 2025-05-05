"use client"

import * as React from "react"
import type { Space } from "../types"

interface VirtualSpacesProps {
  spaces: Record<string, Space>
  currentSpace: string
  onSwitchSpace: (spaceId: string) => void
  onCreateSpace: () => void
}

export const VirtualSpaces: React.FC<VirtualSpacesProps> = ({ spaces, currentSpace, onSwitchSpace, onCreateSpace }) => {
  return (
    <div className="virtual-spaces">
      <div className="section-title">Spaces</div>
      <div className="spaces-list">
        {Object.entries(spaces).map(([spaceId, space]) => (
          <div
            key={spaceId}
            className={`space-item ${spaceId === currentSpace ? "active" : ""}`}
            onClick={() => onSwitchSpace(spaceId)}
          >
            <span className="space-emoji">{space.emoji}</span>
            <span className="space-name">{space.name}</span>
          </div>
        ))}
        <button className="new-space-button" onClick={onCreateSpace}>
          <span className="icon">+</span>
        </button>
      </div>
    </div>
  )
}
