"use client";

import React, { useState } from "react";
import Sidebar, {type AppPage } from "./Sidebar";
import AnalyticsDashboard from "./AnalyticsDashboard";
import UsageDashboard from "./Usagedashboard";

export default function AppPage() {
  const [activePage, setActivePage] = useState<AppPage>("analytics");

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage={activePage} onNavigateAction={setActivePage} />
      <main className="flex-1 overflow-y-auto">
        {activePage === "analytics" && <AnalyticsDashboard />}
        {activePage === "usage"     && <UsageDashboard />}
      </main>
    </div>
  );
}