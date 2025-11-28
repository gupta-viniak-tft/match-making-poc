import { Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import MatchesPage from "./pages/MatchesPage";

export default function App() {
  return (

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/matches/:profileId" element={<MatchesPage />} />
      </Routes>
  );
}
