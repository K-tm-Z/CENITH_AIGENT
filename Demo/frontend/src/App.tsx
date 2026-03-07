import React, { useEffect, useState, useMemo, useRef } from "react";
import { login as loginApi, setToken } from "./lib/auth";
import { apiJson, apiFormData } from "./lib/api";
import {
  Routes,
  Route,
  useNavigate,
  Navigate
} from "react-router-dom";
import "./App.css";
import { me, clearToken } from "./lib/auth"; // add clearToken export

type TabId = "chat" | "tasks" | "checklist";

const TABS: { id: TabId; label: string }[] = [
  { id: "chat", label: "Assistant" },
  { id: "tasks", label: "Forms" },
  { id: "checklist", label: "checklist" }
];

type WeatherState = {
  temp: number;
  description: string;
  high: number;
  low: number;
  windKmh: number;
};

type JsonSchemaField = {
  type: "string" | "number" | "date";
  title: string;
  enum?: string[];
};

type JsonSchema = {
  properties: {
    [key: string]: JsonSchemaField;
  };
};

type ValidationState = {
  errors?: Record<string, string>;
  warnings?: Record<string, string>;
};

type FormDraft = {
  jsonSchema: JsonSchema;
  payload: any;
  validation?: ValidationState;
};

type BackendTemplateSummary = {
  formType: string;
  displayName?: string;
  version: number;
};

type BackendDraft = {
  draftId: string;
  formType: string;
  templateVersion: number;
  payload: any;
  validation?: ValidationState;
  transcript: string;
  status: string;
};

type TemplateField = {
  key: string;
  type: "string" | "number" | "date";
  required?: boolean;
};

function normalizeKey(s: string) {
  return (s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .replace(/^(\d)/, "_$1");
}

function makeSchemaFromFields(fields: TemplateField[]): JsonSchema {
  const properties: Record<string, JsonSchemaField> = {};
  const required: string[] = [];

  for (const f of fields) {
    const key = normalizeKey(f.key);
    if (!key) continue;

    if (f.type === "date") {
      properties[key] = { type: "string", title: f.key, enum: undefined };
    } else {
      properties[key] = { type: f.type as any, title: f.key };
    }

    if (f.required) required.push(key);
  }

  const schema: JsonSchema = { properties };
  if (required.length) {
    (schema as any).required = required;
  }

  return schema;
}
// LOGIN PAGE

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const data = await loginApi(email, password); // JSON body {email,password}
      setToken(data.accessToken);
      onLogin();
      navigate("/dashboard");
    } catch (e: any) {
      alert(e?.message ?? "Login failed");
    }
  };

return (
    <div className="login-page">
      <div className="glass-card login-card">
        <h2>Login</h2>

        <input
          type="text"
          placeholder="Email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button className="login-button" onClick={handleLogin}>
          Sign In
        </button>
      </div>
    </div>
  );
};

const DynamicFormModal: React.FC<{
  isOpen: boolean;
  draft: FormDraft | null;
  onCancel: () => void;
  onSubmit: (data: any) => void;
}> = ({ isOpen, draft, onCancel, onSubmit }) => {
  const [formState, setFormState] = useState<any>({});

  useEffect(() => {
    if (draft?.payload) setFormState(draft.payload);
  }, [draft]);

  if (!isOpen || !draft) return null;

  const handleChange = (field: string, value: any) => {
    setFormState((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Review Generated Report</h2>

        <div className="modal-form">
          {Object.entries(draft.jsonSchema.properties).map(
            ([field, config]: any) => (
              <div key={field}>
                <label className="modal-label">
                  {config.title}

                  {config.enum ? (
                    <select
                      value={formState[field] ?? ""}
                      onChange={(e) =>
                        handleChange(field, e.target.value)
                      }
                    >
                      {config.enum.map((opt: string) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={config.type === "number" ? "number" : "text"}
                      value={formState[field] ?? ""}
                      onChange={(e) =>
                        handleChange(field, e.target.value)
                      }
                    />
                  )}
                </label>

                {draft.validation?.errors?.[field] && (
                  <div className="error-text">
                    {draft.validation.errors[field]}
                  </div>
                )}

                {draft.validation?.warnings?.[field] && (
                  <div className="warning-text">
                    {draft.validation.warnings[field]}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} className="modal-cancel">
            Cancel
          </button>

          <button
            onClick={() => onSubmit(formState)}
            className="modal-submit"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

const TemplateBuilderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}> = ({ isOpen, onClose, onUploaded }) => {
  const [formType, setFormType] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [version, setVersion] = useState<number | string>(1);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [fields, setFields] = useState<TemplateField[]>([
    { key: "", type: "string", required: true }
  ]);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setImageFiles(files);
  };

  const handleFieldKeyChange = (index: number, value: string) => {
    setFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, key: value } : field))
    );
  };

  const handleFieldTypeChange = (
    index: number,
    value: TemplateField["type"]
  ) => {
    setFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, type: value } : field))
    );
  };

  const handleAddField = () => {
    setFields((prev) => [...prev, { key: "", type: "string", required: false }]);
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const ft = formType.trim();
    const dn = displayName.trim();
    if (!ft || !dn) {
      alert("Please provide both a form type and display name.");
      return;
    }

    if (imageFiles.length === 0) {
      alert("Please upload at least one blank form image.");
      return;
    }

    const cleanedFields = fields
      .map((field) => ({ ...field, key: field.key.trim() }))
      .filter((field) => field.key.length > 0);

    if (cleanedFields.length === 0) {
      alert("Please add at least one field with a label and data type.");
      return;
    }

    const schemaObj = makeSchemaFromFields(cleanedFields);
    const schemaText = JSON.stringify(schemaObj);

    const fd = new FormData();
    fd.append("formType", ft);
    fd.append("displayName", dn);
    fd.append("version", String(parseInt(String(version), 10) || 1));
    fd.append("jsonSchema", schemaText);
    imageFiles.forEach((file) => fd.append("templateImages", file, file.name));

    setBusy(true);

    apiFormData("/api/forms/templates", { formData: fd })
      .then(() => {
        onUploaded();
        onClose();
      })
      .catch((err: any) => {
        alert(err?.message || "Failed to upload template");
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Upload task template</h2>
        <p className="template-builder-description">
          Upload a blank form as an image, then declare each label as a key and
          choose the expected data type for its value.
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-label">
            Form type (unique key)
            <input
              type="text"
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              placeholder="e.g. paramedic_pcr"
            />
          </label>

          <label className="modal-label">
            Display name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Paramedic PCR template"
            />
          </label>

          <label className="modal-label">
            Version
            <input
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </label>

          <label className="modal-label">
            Blank form image
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </label>

          <div className="modal-field-group">
            <div className="modal-section-title">Template fields</div>
            <p className="template-builder-description">
              For each label on the form, enter the label text as the{" "}
              <strong>key</strong> and choose the value&apos;s{" "}
              <strong>data type</strong>.
            </p>

            <div className="template-fields-list">
              {fields.map((field, index) => (
                <div className="template-field-row" key={index}>
                  <input
                    type="text"
                    placeholder="Label on the form (key)"
                    value={field.key}
                    onChange={(e) =>
                      handleFieldKeyChange(index, e.target.value)
                    }
                  />

                  <select
                    value={field.type}
                    onChange={(e) =>
                      handleFieldTypeChange(
                        index,
                        e.target.value as TemplateField["type"]
                      )
                    }
                  >
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>

                  <label className="template-required-toggle">
                    <input
                      type="checkbox"
                      checked={!!field.required}
                      onChange={(e) =>
                        setFields((prev) =>
                          prev.map((f, i) =>
                            i === index ? { ...f, required: e.target.checked } : f
                          )
                        )
                      }
                    />
                    <span>Required</span>
                  </label>

                  <button
                    type="button"
                    className="template-field-remove"
                    onClick={() => handleRemoveField(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="template-add-field"
              onClick={handleAddField}
            >
              + Add field
            </button>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="modal-cancel"
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit">
              {busy ? "Uploading..." : "Save template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FillFormModal: React.FC<{
  isOpen: boolean;
  template: BackendTemplateSummary | null;
  onClose: () => void;
  onDraftCreated: (draft: BackendDraft, schema: JsonSchema) => void;
}> = ({ isOpen, template, onClose, onDraftCreated }) => {
  const [useTranscript, setUseTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [filledImage, setFilledImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setUseTranscript(false);
      setTranscript("");
      setAudioBlob(null);
      setFilledImage(null);
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen || !template) return null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
    } catch (err: any) {
      alert(err?.message || "Unable to start recording");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.stop();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template.formType) return;

    const fd = new FormData();
    fd.append("formType", template.formType);

    if (useTranscript) {
      if (!transcript.trim()) {
        alert("Please enter a transcript or switch to recording.");
        return;
      }
      fd.append("transcript", transcript.trim());
    } else {
      if (!audioBlob) {
        alert("Please record audio or switch to transcript input.");
        return;
      }
      fd.append("audio", audioBlob, "recording.webm");
    }

    if (filledImage) {
      fd.append("filledFormImage", filledImage, filledImage.name);
    }

    setBusy(true);

    try {
      const draftRes = await apiFormData("/api/forms/drafts", {
        formData: fd
      });

      const draft = draftRes as BackendDraft;

      const formDetail = await apiJson(
        `/api/forms/${encodeURIComponent(template.formType)}`
      );

      const schema: JsonSchema = formDetail.jsonSchema || { properties: {} };

      onDraftCreated(draft, schema);
      onClose();
    } catch (err: any) {
      alert(err?.message || "Failed to create draft");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Fill {template.displayName || template.formType}</h2>
        <p className="template-builder-description">
          Upload a filled form image or record your report. I&apos;ll draft the
          form for you so you can review and edit before submitting.
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="template-required-toggle">
            <input
              type="checkbox"
              checked={useTranscript}
              onChange={(e) => setUseTranscript(e.target.checked)}
            />
            <span>Use text transcript instead of recording</span>
          </label>

          {useTranscript ? (
            <label className="modal-label">
              Transcript
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
              />
            </label>
          ) : (
            <div className="recording-controls">
              <button
                type="button"
                className="template-upload-button"
                onClick={startRecording}
                disabled={busy}
              >
                Start recording
              </button>
              <button
                type="button"
                className="template-add-field"
                onClick={stopRecording}
                disabled={busy}
              >
                Stop
              </button>
              <span className="recording-status">
                {audioBlob
                  ? "Audio captured – ready to submit."
                  : "No audio captured yet."}
              </span>
            </div>
          )}

          <label className="modal-label">
            Optional filled form photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFilledImage(e.target.files?.[0] ?? null)
              }
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="modal-cancel"
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit">
              {busy ? "Creating draft..." : "Create draft"}
            </button>
          </div>
        </form>
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
  const [templates, setTemplates] = useState<BackendTemplateSummary[]>([]);

 useEffect(() => {
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
 
  if (!apiKey) {
    setWeatherStatus("error");
    return;
  }
 
  setWeatherStatus("loading");
 
  fetch(
    `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=Toronto`
  )
    .then(res => {
      if (!res.ok) throw new Error("Weather request failed");
      return res.json();
    })
    .then(data => {
      const temp = data.current?.temp_c ?? 0;
      const high = temp;
      const low = temp;
      const windKmh = data.current?.wind_kph ?? 0;
 
      const description =
        data.current?.condition?.text || "Current conditions";
 
      setWeather({
        temp: Math.round(temp),
        high: Math.round(high),
        low: Math.round(low),
        windKmh: Math.round(windKmh),
        description
      });
 
      setWeatherStatus("ready");
    })
    .catch(() => setWeatherStatus("error"));
 
}, []);

  const [showModal, setShowModal] = useState(false);
  const [currentDraft, setCurrentDraft] =
    useState<FormDraft | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<BackendTemplateSummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiJson("/api/forms");
        setTemplates(Array.isArray(data) ? data : []);
      } catch {
        // ignore for now; Task Planner will show empty state
      }
    })();
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
              <button
                className="voice-button"
                onClick={() => {
                  if (currentDraft) {
                    setShowModal(true);
                  }
                }}
              >
                <span className="voice-dot" />
              </button>
            </div>
          </div>
        );

      case "tasks":
        return (
          <div className="tab-section">
            <h2>Form Creation</h2>
            <div className="task-planner-row">
              <div className="task-planner-list">
                {templates.length === 0 ? (
                  <ul className="pill-list">
                    <li>No templates yet. Upload a blank form to create one.</li>
                  </ul>
                ) : (
                  <ul className="pill-list task-template-list">
                    {templates.map((template) => (
                      <li key={`${template.formType}:${template.version}`}>
                        <button
                          type="button"
                          className="template-card-button"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowFillModal(true);
                          }}
                        >
                          <span className="template-card-title">
                            {template.displayName || template.formType}
                          </span>
                          <span className="template-card-subtitle">
                            {template.formType} • v{template.version}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="task-planner-actions">
                <button
                  type="button"
                  className="template-upload-button"
                  onClick={() => setShowTemplateModal(true)}
                >
                  Upload template
                </button>
              </div>
            </div>
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
              <th># of Issues</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>ACR Completion</td>
              <td>Number of ACRs/PCRs that are unfinished</td>
              <td className="status-high">Bad</td>
              <td>3</td>
              <td>Each must be completed within 24 hours of call completion</td>
            </tr>

            <tr>
              <td>Vaccinations</td>
              <td>Required vaccinations up to date</td>
              <td className="status-high">Bad</td>
              <td>2</td>
              <td>Vaccination Status as per guidelines</td>
            </tr>

            <tr>
              <td>Overtime Req.</td>
              <td>Overtime Requests outstanding</td>
              <td className="status-high">Bad</td>
              <td>5</td>
              <td>Overtime claims pending review</td>
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
      <DynamicFormModal
        isOpen={showModal}
        draft={currentDraft}
        onCancel={() => setShowModal(false)}
        onSubmit={async (data) => {
          if (!currentDraftId) {
            setShowModal(false);
            return;
          }

          try {
            const updated = await apiJson(
              `/api/forms/drafts/${encodeURIComponent(currentDraftId)}`,
              {
                method: "PATCH",
                body: JSON.stringify(data)
              }
            );

            setCurrentDraft((prev) =>
              prev
                ? {
                    ...prev,
                    payload: updated.payload,
                    validation: updated.validation
                  }
                : prev
            );

            await apiJson(
              `/api/forms/drafts/${encodeURIComponent(currentDraftId)}/finalize`,
              {
                method: "POST",
                body: JSON.stringify(updated.payload)
              }
            );
          } catch (err: any) {
            alert(err?.message || "Failed to submit draft");
            return;
          }

          setShowModal(false);
        }}
      />
      <TemplateBuilderModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onUploaded={async () => {
          try {
            const data = await apiJson("/api/forms");
            setTemplates(Array.isArray(data) ? data : []);
          } catch {
            // ignore
          }
        }}
      />
      <FillFormModal
        isOpen={showFillModal}
        template={selectedTemplate}
        onClose={() => setShowFillModal(false)}
        onDraftCreated={(draft, schema) => {
          setCurrentDraftId(draft.draftId);
          setCurrentDraft({
            jsonSchema: schema,
            payload: draft.payload,
            validation: draft.validation
          });
          setShowModal(true);
        }}
      />
    </div>
  );
};

// APP ROUTING

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await me(); // GET /api/auth/me with Bearer token
        setIsAuthenticated(true);
      } catch {
        clearToken();
        setIsAuthenticated(false);
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  if (!authReady) return null; // or a small spinner

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
            <Dashboard
              onLogout={() => {
                clearToken();
                setIsAuthenticated(false);
              }}
            />
          ) : (
            <Navigate to="/" />
          )
        }
      />
    </Routes>
  );
};

export default App;