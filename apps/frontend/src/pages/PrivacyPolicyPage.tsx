import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "../components/ui/button";

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Plinth Privacy Policy</h1>
              <p className="text-xs text-slate-400 mt-0.5">Last updated: June 2026</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 text-sm leading-relaxed text-slate-600">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Introduction</h2>
            <p>
              Welcome to Plinth. We value your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and process your information when you use our marketing automation services, connect your Google (Gmail & Calendar) services, or integrate your social accounts (LinkedIn, Instagram, Twitter).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Information We Collect</h2>
            <p>
              When you use Plinth, we collect the necessary credentials, tokens, and profile information to execute automated marketing campaigns on your behalf:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Info:</strong> Your name, email address, company details, and preferences.</li>
              <li><strong>Third-party Integrations:</strong> Access tokens for Gmail (to display/sync messages and send draft replies), Google Calendar (to schedule events), and social media platforms (LinkedIn, Instagram, Twitter) to post updates.</li>
              <li><strong>Usage Data:</strong> Performance analytics, generated content drafts, and user interactions.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. How We Use Google Data</h2>
            <p>
              Plinth's use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We request Gmail readonly and send scopes to fetch recent messages and let you compose replies directly from Plinth Dashboard.</li>
              <li>We request Google Calendar readonly access to build your local marketing publishing calendar.</li>
              <li>We do not share, sell, or use this Google data for serving advertisements.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. Data Security & Storage</h2>
            <p>
              We implement industry-standard encryption protocols (SSL/TLS) to secure all data transmissions. Access credentials and refresh tokens are securely encrypted and stored in our database. You can revoke access to any connected service at any time through your Google Security Settings or directly within Plinth Settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">5. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your data, feel free to email our team at <a href="mailto:support@plinth.ai" className="text-blue-600 hover:underline font-medium">support@plinth.ai</a>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; 2026 Plinth Inc. All rights reserved.</span>
          <a href="https://plinth.ai" target="_blank" rel="noreferrer" className="hover:text-slate-600 underline">plinth.ai</a>
        </div>
      </div>
    </div>
  );
}
