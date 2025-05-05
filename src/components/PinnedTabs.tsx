import * as React from "react"
import { useDrag } from "react-dnd"
import { type PinnedTab, DragItemTypes } from "../types"

interface PinnedTabsProps {
  pinnedTabs: PinnedTab[]
}

export const PinnedTabs: React.FC<PinnedTabsProps> = ({ pinnedTabs }) => {
  return (
    <div className="pinned-tabs">
      {pinnedTabs.map((tab, index) => (
        <PinnedTabItem key={tab.id} tab={tab} index={index} />
      ))}
    </div>
  )
}

interface PinnedTabItemProps {
  tab: PinnedTab
  index: number
}

const PinnedTabItem: React.FC<PinnedTabItemProps> = ({ tab, index }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragItemTypes.TAB,
    item: { type: DragItemTypes.TAB, id: tab.id, index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div ref={drag} className={`pinned-tab ${isDragging ? "dragging" : ""}`} style={{ opacity: isDragging ? 0.5 : 1 }}>
      {tab.favicon ? (
        <img src={tab.favicon || "/placeholder.svg"} alt={tab.title} className="favicon" />
      ) : (
        <div className="favicon-placeholder"></div>
      )}
    </div>
  )
}
