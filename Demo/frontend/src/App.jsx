import React from 'react'
import FormsTemplateUpload from './components/FormsTemplateUpload'
import FormsBrowser from './components/FormsBrowser'
import SttTest from './components/SttTest'
import ProcessFormPipelineTest from './components/ProcessFormPipelineTest'

export function App() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, display: "grid", gap: 24 }}>
      <h1>CENITH AIGENT Demo</h1>
      <p>AI paperwork assistant for paramedics.</p>
      <FormsTemplateUpload />
      <FormsBrowser />
      <SttTest />
      <ProcessFormPipelineTest />
    </div>
  )
}