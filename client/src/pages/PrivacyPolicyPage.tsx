export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-sm text-slate">
      <h1 className="font-display text-3xl font-bold text-forest mb-2">Privacy Policy</h1>
      <p className="text-slate/50 text-sm mb-8">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <p>
        SOMA Connect ("we", "our", "us") operates the SOMA digital marketplace at{" "}
        <strong>soma-connect.vercel.app</strong> and its associated mobile applications. This policy
        explains how we collect, use, and protect your personal data in compliance with Rwanda's{" "}
        <strong>Law N°058/2021 on the Protection of Personal Data and Privacy</strong>.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">1. Data We Collect</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>
          <strong>Account data</strong> — name, email address, phone number, and password hash when
          you register.
        </li>
        <li>
          <strong>Profile data</strong> — profile photo, location (district/sector), and language
          preference.
        </li>
        <li>
          <strong>Transaction data</strong> — orders placed, payment method chosen, and order
          status.
        </li>
        <li>
          <strong>Usage data</strong> — pages visited, search queries, and features used (collected
          via server logs).
        </li>
        <li>
          <strong>Device data</strong> — browser type, IP address, and device identifiers for
          security purposes.
        </li>
      </ul>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">
        2. How We Use Your Data
      </h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>To create and manage your account.</li>
        <li>To process and fulfill your orders.</li>
        <li>To send transactional emails (order confirmations, OTPs, seller approvals).</li>
        <li>To improve platform features and fix technical issues.</li>
        <li>To comply with Rwandan law, including anti-fraud and tax obligations.</li>
      </ul>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">3. Data Sharing</h2>
      <p>
        We do <strong>not</strong> sell your personal data. We share it only with:
      </p>
      <ul className="space-y-1 list-disc list-inside">
        <li>
          <strong>Sellers</strong> — your name and delivery address, to fulfil your orders.
        </li>
        <li>
          <strong>Cloud service providers</strong> — MongoDB Atlas (database), Cloudinary (images),
          Brevo (email), Render (hosting) — all under data processing agreements.
        </li>
        <li>
          <strong>Authorities</strong> — where required by Rwandan law or a valid court order.
        </li>
      </ul>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">4. Data Retention</h2>
      <p>
        We retain account data for as long as your account is active plus 12 months, and transaction
        records for 7 years as required by Rwandan tax law. You may request deletion of your account
        at any time (see Section 6).
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">5. Security</h2>
      <p>
        Passwords are hashed with bcrypt and never stored in plain text. All data is transmitted
        over HTTPS. Access tokens expire after 15 minutes. We regularly review our security
        practices.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">6. Your Rights</h2>
      <p>Under Law N°058/2021 you have the right to:</p>
      <ul className="space-y-1 list-disc list-inside">
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate data.</li>
        <li>Request deletion of your data ("right to be forgotten").</li>
        <li>Object to or restrict certain processing.</li>
        <li>Receive your data in a portable format.</li>
      </ul>
      <p className="mt-2">
        To exercise these rights, email us at{" "}
        <a href="mailto:privacy@soma.rw" className="text-forest hover:underline">
          privacy@soma.rw
        </a>
        . We will respond within 30 days.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">7. Cookies</h2>
      <p>
        We use only strictly necessary cookies: an HTTP-only refresh token cookie for
        authentication. We do not use advertising or tracking cookies.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">
        8. Children's Privacy
      </h2>
      <p>
        SOMA Connect is not directed at children under 16. We do not knowingly collect personal data
        from minors. If you believe a minor has registered, contact us immediately.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">
        9. Changes to This Policy
      </h2>
      <p>
        We may update this policy from time to time. Material changes will be communicated by email
        or an in-app notice at least 14 days before taking effect.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">10. Contact</h2>
      <p>
        Data Controller: SOMA Connect, Kigali, Rwanda.
        <br />
        Email:{" "}
        <a href="mailto:privacy@soma.rw" className="text-forest hover:underline">
          privacy@soma.rw
        </a>
        <br />
        Phone: +250 780 000 000
      </p>
    </div>
  );
}
