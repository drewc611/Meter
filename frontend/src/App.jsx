import { useState } from "react";

import { AppDataProvider } from "./context/AppDataContext.jsx";
import AuthGate from "./components/AuthGate.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Overview from "./views/Overview.jsx";
import People from "./views/People.jsx";
import Teams from "./views/Teams.jsx";
import Alerts from "./views/Alerts.jsx";
import Integrations from "./views/Integrations.jsx";

function Dashboard() {
  const [view, setView] = useState("overview");
  const [peopleFilter, setPeopleFilter] = useState(null);

  function goToPeopleWithFilter(filter) {
    setPeopleFilter(filter);
    setView("people");
  }

  return (
    <>
      <Sidebar view={view} onSelect={setView} />
      <main>
        <Topbar view={view} />
        <Overview active={view === "overview"} />
        <People
          active={view === "people"}
          presetFilter={peopleFilter}
          onFilterConsumed={() => setPeopleFilter(null)}
        />
        <Teams active={view === "teams"} />
        <Alerts active={view === "alerts"} onNavigateToPeople={goToPeopleWithFilter} />
        <Integrations active={view === "integrations"} />
      </main>
      <AuthGate />
    </>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <Dashboard />
    </AppDataProvider>
  );
}
