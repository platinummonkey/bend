"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { DndProvider } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { CurrentUrl } from "./components/CurrentUrl"
import { PinnedTabs } from "./components/PinnedTabs"
import { SpaceContent } from "./components/SpaceContent"
import { CurrentTabs } from "./components/CurrentTabs"
import { VirtualSpaces } from "./components/VirtualSpaces"
import type { Space, Tab, PinnedTab } from "./types"

// Declare chrome if it's not available globally (e.g., in a testing environment)
declare const chrome: any

export const App: React.FC = () => {
  const [spaces, setSpaces] = useState<Record<string, Space>>({})
  const [currentSpace, setCurrentSpace] = useState<string>("")
  const [currentTabs, setCurrentTabs] = useState<Tab[]>([])
  const [pinnedTabs, setPinnedTabs] = useState<PinnedTab[]>([])
  const [currentUrl, setCurrentUrl] = useState<string>("")

  useEffect(() => {
    // Load data from storage
    chrome.storage.local.get(["spaces", "currentSpace", "currentTabs", "pinnedTabs"], (result: any) => {
      if (result.spaces) setSpaces(result.spaces)
      if (result.currentSpace) setCurrentSpace(result.currentSpace)
      if (result.currentTabs) setCurrentTabs(result.currentTabs)
      if (result.pinnedTabs) setPinnedTabs(result.pinnedTabs)
    })

    // Get current URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url)
        setCurrentUrl(url.hostname)
      }
    })

    // Listen for storage changes
    const handleStorageChange = (changes: any, area: string) => {
      if (area === "local") {
        if (changes.spaces?.newValue) setSpaces(changes.spaces.newValue)
        if (changes.currentSpace?.newValue) setCurrentSpace(changes.currentSpace.newValue)
        if (changes.currentTabs?.newValue) setCurrentTabs(changes.currentTabs.newValue)
        if (changes.pinnedTabs?.newValue) setPinnedTabs(changes.pinnedTabs.newValue)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleSwitchSpace = (spaceId: string) => {
    chrome.storage.local.set({ currentSpace: spaceId })
  }

  const handleCreateSpace = () => {
    const spaceId = `space-${Date.now()}`
    const newSpace: Space = {
      name: "New Space",
      emoji: "🌟",
      tabs: [],
      folders: [],
    }

    const updatedSpaces = { ...spaces, [spaceId]: newSpace }
    chrome.storage.local.set({
      spaces: updatedSpaces,
      currentSpace: spaceId,
    })
  }

  const handleTidyTabs = () => {
    // Logic to organize tabs into folders based on domain or other criteria
    console.log("Tidying tabs...")
    // This would be implemented based on your specific organization logic
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="sidebar">
        <CurrentUrl url={currentUrl} />
        <PinnedTabs pinnedTabs={pinnedTabs} />

        {currentSpace && spaces[currentSpace] && <SpaceContent space={spaces[currentSpace]} spaceId={currentSpace} />}

        <hr className="divider" />

        <button className="new-tab-button">
          <span className="icon">+</span> New Tab
        </button>

        <button className="tidy-tabs-button" onClick={handleTidyTabs}>
          <span className="icon">🧹</span> Tidy Tabs
        </button>

        <CurrentTabs tabs={currentTabs} />

        <hr className="divider" />

        <VirtualSpaces
          spaces={spaces}
          currentSpace={currentSpace}
          onSwitchSpace={handleSwitchSpace}
          onCreateSpace={handleCreateSpace}
        />
      </div>
    </DndProvider>
  )
}
