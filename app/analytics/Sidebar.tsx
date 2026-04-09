"use client";

import React from "react";

export type AppPage = "analytics" | "usage";

interface SidebarProps {
  activePage: AppPage;
  onNavigateAction: (page: AppPage) => void;
}

const NAV_ITEMS: { id: AppPage; label: string; icon: string; description: string }[] = [
  {
    id: "analytics",
    label: "Analytics",
    icon: "📊",
    description: "Property condition insights",
  },
  {
    id: "usage",
    label: "Usage",
    icon: "⚡",
    description: "API & resource consumption",
  },
];

export default function Sidebar({ activePage, onNavigateAction }: SidebarProps) {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="text-lg font-bold text-gray-900 tracking-tight">
          paint<span className="text-blue-600">·</span>mvp
        </div>
        <div className="text-xs text-gray-400 mt-0.5">Assessment Platform</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigateAction(item.id)}
              className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {/* <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span> */}
              <div>
                <div
                  className={`text-sm font-semibold leading-tight ${
                    isActive ? "text-blue-700" : "text-gray-800"
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-xs text-gray-400 leading-tight mt-0.5">
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">localhost:8080</span>
        </div>
      </div>
    </aside>
  );
}