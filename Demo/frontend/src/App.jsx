import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DevicePage } from './pages/DevicePage.jsx'
import { IntakePage } from './pages/IntakePage.jsx'
import { ReviewPage } from './pages/ReviewPage.jsx'
import { RequireAuth } from './components/RequireAuth.jsx'
import { Layout } from './components/Layout.jsx'
import { AudioTestPage } from './pages/AudioTestPage.jsx'

export function App() {
//   return (
//     <Layout>
//       <Routes>
//         <Route path="/" element={<Navigate to="/intake" replace />} />
//         <Route path="/device" element={<DevicePage />} />
//         <Route
//           path="/intake"
//           element={
//             <RequireAuth>
//               <IntakePage />
//             </RequireAuth>
//           }
//         />
//         <Route
//           path="/review/:submissionId"
//           element={
//             <RequireAuth>
//               <ReviewPage />
//             </RequireAuth>
//           }
//         />
//         <Route path="*" element={<Navigate to="/intake" replace />} />
//       </Routes>
//     </Layout>
//   )
// }
    return (
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/audio-test" replace />} />
            <Route path="/audio-test" element={<AudioTestPage />} />
            <Route path="*" element={<Navigate to="/audio-test" replace />} />
          </Routes>
        </Layout>
    )
}