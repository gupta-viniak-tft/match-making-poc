import { Routes, Route } from "react-router-dom";
import GlobalLoader from "./components/GlobalLoader";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import MatchesPage from "./pages/MatchesPage";
import AiMatchesPage from "./pages/AiMatchesPage.jsx";

export default function App() {
  return (
    <>
      <GlobalLoader />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/matches/:profileId" element={<MatchesPage />} />
        <Route path="/matches/ai/:profileId" element={<AiMatchesPage />} />
      </Routes>
    </>
  );
}
