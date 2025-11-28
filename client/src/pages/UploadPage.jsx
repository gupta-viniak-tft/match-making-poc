import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [whoAmI, setWhoAmI] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [gender, setGender] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  const isAllowedFile = (candidate) => {
    if (!candidate) return false;
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const ext = candidate.name?.toLowerCase() || "";
    const allowedExts = [".pdf", ".doc", ".docx"];
    return allowedTypes.includes(candidate.type) || allowedExts.some((e) => ext.endsWith(e));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!isAllowedFile(selected)) {
      setError("Please choose a PDF or Word document.");
      return;
    }
    setFile(selected);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!isAllowedFile(dropped)) {
      setError("Please drop a PDF or Word document.");
      return;
    }
    setFile(dropped);
    setError("");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const triggerFileDialog = () => fileInputRef.current?.click();

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !whoAmI.trim() || !lookingFor.trim() || !gender) {
      setError("Please upload a file, choose gender, and fill both text fields.");
      return;
    }

    setSubmitting(true);
    try {
      setError("");
      setSuccessMessage("");
      const formData = new FormData();
      formData.append("profile_file", file);
      formData.append("who_am_i", whoAmI);
      formData.append("looking_for", lookingFor);
      formData.append("gender", gender);

      const res = await fetch(`${API_BASE}/profile`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create profile");
      }

      const data = await res.json();
      setSuccessMessage("Profile uploaded successfully.");
      // Optionally store profile id for later use (e.g., matches page)
      localStorage.setItem("lastProfileId", data.profile_id);
      navigate(`/matches/${data.profile_id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">
        Upload Your Profile
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File */}
        <div>
          <label className="block text-sm font-semibold mb-1">
            Profile Document (PDF / DOC / DOCX)
          </label>
          <div
            className={`border-2 border-dashed rounded-xl p-5 cursor-pointer transition shadow-sm bg-gradient-to-r from-blue-50 via-white to-blue-50 ${
              dragActive ? "border-blue-400 bg-blue-50" : "border-gray-200"
            }`}
            onClick={triggerFileDialog}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex items-center gap-4">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full border ${dragActive ? "border-blue-300 bg-white text-blue-600" : "border-gray-200 bg-white text-gray-500"}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M12 2a7 7 0 0 0-7 7v2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V9a7 7 0 0 0-7-7Zm5 9v-2a5 5 0 1 0-10 0v2h10Zm-5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  Drag & drop your PDF or Word file here
                </p>
                <p className="text-xs text-gray-500">
                  or <span className="text-blue-600 font-semibold">browse</span> to upload
                </p>
                {file && (
                  <div className="mt-2 text-xs text-gray-600 bg-white/70 rounded-lg px-3 py-2 inline-flex items-center gap-2 border border-gray-100">
                    <span className="font-semibold text-gray-800">{file.name}</span>
                    <span className="text-gray-400">•</span>
                    <span>{formatSize(file.size)}</span>
                  </div>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold mb-1">Gender</label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === "male"}
                onChange={(e) => setGender(e.target.value)}
              />
              Male
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === "female"}
                onChange={(e) => setGender(e.target.value)}
              />
              Female
            </label>
          </div>
        </div>

        {/* Who am I */}
        <div>
          <label className="block text-sm font-semibold mb-1">
            Who am I?
          </label>
          <textarea
            value={whoAmI}
            onChange={(e) => setWhoAmI(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Describe yourself..."
          />
        </div>

        {/* What am I looking for */}
        <div>
          <label className="block text-sm font-semibold mb-1">
            What am I looking for?
          </label>
          <textarea
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Describe the kind of partner you’re looking for..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {submitting ? "Submitting..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
