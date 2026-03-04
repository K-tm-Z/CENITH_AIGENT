import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  Navigate
} from "react-router-dom";
import "./App.css";

type TabId = "chat" | "tasks" | "checklist";

const TABS: { id: TabId; label: string }[] = [
  { id: "chat", label: "Assistant" },
  { id: "tasks", label: "Tasks" },
  { id: "checklist", label: "checklist" }
];

type WeatherState = {
  temp: number;
  description: string;
  high: number;
  low: number;
  windKmh: number;
};


// LOGIN PAGE

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onLogin();
    navigate("/dashboard");
  };

  return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h2>Login</h2>
        <input type="text" placeholder="Email" className="login-input" />
        <input type="password" placeholder="Password" className="login-input" />
        <button className="login-button" onClick={handleLogin}>
          Sign In
        </button>
      </div>
    </div>
  );
};

// DASHBOARD

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
    if (!apiKey) {
      setWeatherStatus("error");
      return;
    }

    setWeatherStatus("loading");

    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Toronto&units=metric&appid=${apiKey}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Weather request failed");
        return res.json();
      })
      .then((data) => {
        const temp = data.main?.temp ?? 0;
        const high = data.main?.temp_max ?? temp;
        const low = data.main?.temp_min ?? temp;
        const windMs = data.wind?.speed ?? 0;
        const description =
          (Array.isArray(data.weather) && data.weather[0]?.description) ||
          "Current conditions";

        setWeather({
          temp: Math.round(temp),
          high: Math.round(high),
          low: Math.round(low),
          windKmh: Math.round(windMs * 3.6),
          description
        });

        setWeatherStatus("ready");
      })
      .catch(() => setWeatherStatus("error"));
  }, []);

  const handleSignOut = () => {
    onLogout();
    navigate("/");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "chat":
        return (
          <div className="tab-section">
            <h2>AI Assistant</h2>
            <p>
              Ask anything and I&apos;ll help you research, summarize, or
              generate content in real time.
            </p>
            <div className="fake-input">
              <input type="text" placeholder="What should I work on next?" />
              <button className="voice-button">
                <span className="voice-dot" />
              </button>
            </div>
          </div>
        );

      case "tasks":
        return (
          <div className="tab-section">
            <h2>Task Planner</h2>
            <ul className="pill-list">
              <li>Brainstorm ideas</li>
              <li>Draft outline</li>
              <li>Review & refine</li>
            </ul>
          </div>
        );

      case "checklist":
  return (
    <div className="tab-section">
      <h2>Paramedic Checklist</h2>

      <div className="table-wrapper">
        <table className="checklist-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ACR Completion</td>
              <td>Number of ACRs/PCRs that are unfinished</td>
              <td className="status-high">Bad</td>
              <td>Each must be completed with 24 hours of call completion</td>
            </tr>
            <tr>
              <td>Vaccinations</td>
              <td>Required vaccinations up to date</td>
              <td className="status-high">Bad</td>
              <td>Vaccination Status as per guidelines</td>
            </tr>
            <tr>
              <td>Overtime Req.</td>
              <td>Overtime Requests outstanding</td>
              <td className="status-high">Bad</td>
              <td>Overtime claims outstanding</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

      default:
        return null;
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">Work Buddy</h1>

        {/* ONLY SIGN OUT NOW */}
        <button className="top-login-button" onClick={handleSignOut}>
          Sign Out
        </button>
      </header>

      <main className="column column-center">
        <section key={activeTab} className="glass-card tab-shell">
          <div className="tab-panel">{renderTabContent()}</div>

          <footer className="tab-footer">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={
                  "tab-icon" + (tab.id === activeTab ? " tab-icon-active" : "")
                }
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon-glyph">
                  {tab.id === "chat" && "◎"}
                  {tab.id === "tasks" && "▤"}
                  {tab.id === "checklist" && "✦"}
                </span>
                <span className="tab-icon-label">{tab.label}</span>
              </button>
            ))}
          </footer>
        </section>
      </main>

      {/* WIDGETS */}
      <aside className="column column-right">
  {/* WEATHER WIDGET */}
  <div className="widget widget-weather">
    <div className="widget-header">
      <span>Weather</span>
      <span className="widget-location">Toronto, CA</span>
    </div>

    {weatherStatus === "loading" && (
      <div className="weather-main">
        <span className="weather-temp">--</span>
        <span className="weather-desc">Loading...</span>
      </div>
    )}

    {weatherStatus === "error" && (
      <div className="weather-main">
        <span className="weather-temp">--</span>
        <span className="weather-desc">Weather unavailable</span>
      </div>
    )}

    {weatherStatus === "ready" && weather && (
      <>
        <div className="weather-main">
          <span className="weather-temp">{weather.temp}°</span>
          <span className="weather-desc">
            {weather.description.charAt(0).toUpperCase() +
              weather.description.slice(1)}
          </span>
        </div>
        <div className="weather-footer">
          <span>H: {weather.high}°</span>
          <span>L: {weather.low}°</span>
          <span>Wind: {weather.windKmh} km/h</span>
        </div>
      </>
    )}
  </div>

  {/* SECOND WIDGET */}
  <div className="widget">
    <div className="widget-header">
      <span>Widget Slot</span>
      <span className="widget-tag">Placeholder</span>
    </div>
    <p className="widget-body">
      Add any future widget here (e.g. calendar, notifications, KPIs).
    </p>
  </div>

  {/* THIRD WIDGET */}
  <div className="widget">
    <div className="widget-header">
      <span>Widget Slot</span>
      <span className="widget-tag">Placeholder</span>
    </div>
    <p className="widget-body">
      Another reserved area for future integrations (e.g. email, files).
    </p>
  </div>
</aside>
    </div>
  );
};

// APP ROUTING

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" />
          ) : (
            <Login onLogin={() => setIsAuthenticated(true)} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <Dashboard onLogout={() => setIsAuthenticated(false)} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
    </Routes>
  );
};

export default App;