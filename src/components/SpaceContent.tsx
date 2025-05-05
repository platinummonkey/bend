"use client"

import * as React from "react"
import { type Space, type Folder, type Tab, DragItemTypes } from "../types"
import { useDrag, useDrop } from "react-dnd"

// Declare chrome if it's not available globally (e.g., in a testing environment)
declare const chrome: any

interface SpaceContentProps {
  space: Space
  spaceId: string
}

export const SpaceContent: React.FC<SpaceContentProps> = ({ space, spaceId }) => {
  return (
    <div className="space-content">
      <div className="space-header">
        <span className="space-emoji">{space.emoji}</span>
        <span className="space-name">{space.name}</span>
      </div>

      <div className="space-items">
        {space.folders.map((folder, index) => (
          <FolderItem key={folder.id} folder={folder} index={index} spaceId={spaceId} />
        ))}

        {space.tabs.map((tab, index) => (
          <TabItem key={tab.id} tab={tab} index={index} spaceId={spaceId} />
        ))}
      </div>
    </div>
  )
}

interface FolderItemProps {
  folder: Folder
  index: number
  spaceId: string
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, index, spaceId }) => {
  const [isExpanded, setIsExpanded] = React.useState(folder.expanded)

  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragItemTypes.FOLDER,
    item: {
      type: DragItemTypes.FOLDER,
      id: folder.id,
      spaceId,
      index,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  const [{ isOver }, drop] = useDrop(() => ({
    accept: [DragItemTypes.TAB, DragItemTypes.FOLDER],
    drop: (item: any, monitor) => {
      if (item.type === DragItemTypes.TAB) {
        console.log(`Dropped tab ${item.id} into folder ${folder.id}`)
        // Handle moving tab to folder
      } else if (item.type === DragItemTypes.FOLDER) {
        console.log(`Dropped folder ${item.id} near folder ${folder.id}`)
        // Handle reordering folders
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)

    // Update folder expanded state in storage
    chrome.storage.local.get(["spaces"], (result: any) => {
      const spaces = result.spaces
      const updatedSpaces = { ...spaces }

      const folderIndex = updatedSpaces[spaceId].folders.findIndex((f: Folder) => f.id === folder.id)
      if (folderIndex !== -1) {
        updatedSpaces[spaceId].folders[folderIndex].expanded = !isExpanded
        chrome.storage.local.set({ spaces: updatedSpaces })
      }
    })
  }

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`folder ${isDragging ? "dragging" : ""} ${isOver ? "drop-target" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="folder-header" onClick={toggleExpanded}>
        <span className="folder-icon">📁</span>
        <span className="folder-name">{folder.name}</span>
        <span className="folder-toggle">{isExpanded ? "▼" : "►"}</span>
      </div>

      {isExpanded && (
        <div className="folder-content">
          {folder.tabs.map((tab, tabIndex) => (
            <TabItem key={tab.id} tab={tab} index={tabIndex} spaceId={spaceId} folderId={folder.id} />
          ))}
        </div>
      )}
    </div>
  )
}

interface TabItemProps {
  tab: Tab
  index: number
  spaceId: string
  folderId?: string
}

const TabItem: React.FC<TabItemProps> = ({ tab, index, spaceId, folderId }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DragItemTypes.TAB,
    item: {
      type: DragItemTypes.TAB,
      id: tab.id,
      spaceId,
      folderId,
      index,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  const [{ isOver }, drop] = useDrop(() => ({
    accept: DragItemTypes.TAB,
    drop: (item: any) => {
      if (item.id !== tab.id) {
        console.log(`Reordering tab ${item.id} near tab ${tab.id}`)
        // Handle reordering tabs
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))

  const handleClick = () => {
    // Open the tab URL
    chrome.tabs.create({ url: tab.url })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Remove tab from storage
    chrome.storage.local.get(["spaces"], (result: any) => {
      const spaces = result.spaces
      const updatedSpaces = { ...spaces }

      if (folderId) {
        // Tab is in a folder
        const folderIndex = updatedSpaces[spaceId].folders.findIndex((f: Folder) => f.id === folderId)
        if (folderIndex !== -1) {
          updatedSpaces[spaceId].folders[folderIndex].tabs = updatedSpaces[spaceId].folders[folderIndex].tabs.filter(
            (t: Tab) => t.id !== tab.id,
          )
          chrome.storage.local.set({ spaces: updatedSpaces })
        }
      } else {
        // Tab is directly in space
        updatedSpaces[spaceId].tabs = updatedSpaces[spaceId].tabs.filter((t: Tab) => t.id !== tab.id)
        chrome.storage.local.set({ spaces: updatedSpaces })
      }
    })
  }

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`tab ${isDragging ? "dragging" : ""} ${isOver ? "drop-target" : ""}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={handleClick}
    >
      {tab.favicon ? (
        <img src={tab.favicon || "/placeholder.svg"} alt="" className="tab-favicon" />
      ) : (
        <div className="tab-favicon-placeholder"></div>
      )}
      <span className="tab-title">{tab.title}</span>
      <button className="tab-delete" onClick={handleDelete}>
        ×
      </button>
    </div>
  )
}
