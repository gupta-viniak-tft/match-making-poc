import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 font-sans">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-6">
        <h1 className="text-2xl font-bold text-blue-700">AI Match-Maker</h1>

      </nav>

      {/* HERO SECTION */}
      <section className="flex flex-col items-center text-center px-6 mt-10">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight max-w-3xl">
          Find Real Compatibility —
          <span className="text-blue-600"> Not Just Matches</span>
        </h2>

        <p className="text-lg text-gray-600 mt-4 max-w-2xl">
          Upload your biodata. Tell us who you are & what you want.
          Our AI understands personalities, family values, and expectations to find the right partner.
        </p>

        <Link
          to="/upload"
          className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-full text-lg shadow-lg hover:bg-blue-700 transition"
        >
          Get Started — Upload Profile
        </Link>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-20 px-6 text-center">
        <h3 className="text-3xl font-bold text-gray-900">How It Works</h3>

        <div className="grid md:grid-cols-3 gap-10 mt-10 max-w-5xl mx-auto">
          <div className="bg-white shadow-md p-6 rounded-xl">
            <h4 className="text-xl font-semibold text-blue-600">1. Upload Biodata</h4>
            <p className="text-gray-600 mt-2">
              PDF or DOC — any format. We extract key details automatically.
            </p>
          </div>

          <div className="bg-white shadow-md p-6 rounded-xl">
            <h4 className="text-xl font-semibold text-blue-600">2. Describe Yourself</h4>
            <p className="text-gray-600 mt-2">
              Answer: “Who am I?” and “What am I looking for?”
            </p>
          </div>

          <div className="bg-white shadow-md p-6 rounded-xl">
            <h4 className="text-xl font-semibold text-blue-600">3. Get Matches</h4>
            <p className="text-gray-600 mt-2">
              AI ranks compatible profiles based on deep semantic understanding.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-20 py-10 text-center text-gray-500">
        © {new Date().getFullYear()} AI Match-Maker — Built for Real Compatibility
      </footer>
    </div>
  );
}
