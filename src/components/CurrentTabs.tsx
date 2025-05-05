"use client"

import * as React from "react"
import type { Tab } from "../types"

interface CurrentTabsProps {
  tabs: Tab[]
}

// Declare chrome if it's not available globally
declare const chrome: any

export const CurrentTabs: React.FC<CurrentTabsProps> = ({ tabs }) => {
  const handleTabClick = (tabId?: number) => {
    if (tabId) {
      chrome.tabs.update(tabId, { active: true })
    }
  }

  return (
    <div className="current-tabs">
      <div className="section-title">Current Tabs</div>
      <div className="tabs-list">
        {tabs.map((tab) => (
          <div key={tab.id} className="current-tab" onClick={() => handleTabClick(tab.tabId)}>
            {tab.favicon ? (
              <img src={tab.favicon || "/placeholder.svg"} alt="" className="tab-favicon" />
            ) : (
              <div className="tab-favicon-placeholder"></div>
            )}
            <span className="tab-title">{tab.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
