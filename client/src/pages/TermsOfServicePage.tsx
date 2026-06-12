export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-sm text-slate">
      <h1 className="font-display text-3xl font-bold text-forest mb-2">Terms of Service</h1>
      <p className="text-slate/50 text-sm mb-8">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <p>
        Welcome to SOMA Connect. By creating an account or using our platform you agree to these
        Terms of Service. Please read them carefully. If you do not agree, do not use SOMA Connect.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">1. Who We Are</h2>
      <p>
        SOMA Connect is a digital marketplace that connects buyers and sellers across Rwanda. We
        provide the platform; individual sellers are responsible for their listings and fulfilment.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">2. Eligibility</h2>
      <p>
        You must be at least 18 years old and legally capable of entering into contracts under
        Rwandan law to use SOMA Connect. By registering, you confirm this.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">3. Accounts</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>You must provide accurate information during registration.</li>
        <li>One person may not hold multiple buyer accounts.</li>
        <li>We may suspend or terminate accounts that violate these terms.</li>
      </ul>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">4. Buying</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>
          Prices are shown in Rwandan Francs (RWF) and include applicable taxes unless stated
          otherwise.
        </li>
        <li>Placing an order creates a binding contract between you and the seller.</li>
        <li>
          For mobile money orders, payment must be sent within 24 hours or the order may be
          cancelled.
        </li>
        <li>SOMA Connect is not liable for seller disputes, but we will mediate in good faith.</li>
      </ul>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">5. Selling</h2>
      <ul className="space-y-1 list-disc list-inside">
        <li>Sellers must apply and be approved before listing products.</li>
        <li>
          All listings must accurately describe the product. Misleading listings will be removed.
        </li>
        <li>
          Prohibited items include: counterfeit goods, illegal substances, weapons, and items that
          violate Rwandan law.
        </li>
        <li>
          SOMA Connect charges a commission on completed sales as detailed in the Seller Fee
          Schedule.
        </li>
        <li>Payouts are processed within 7 business days of order delivery confirmation.</li>
      </ul>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">6. Payments</h2>
      <p>
        SOMA Connect currently supports Cash on Delivery, MTN MoMo (manual transfer), and Airtel
        Money (manual transfer). All payments are processed in RWF. We are not a payment service
        provider; we facilitate transactions between buyers and sellers.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">7. Returns & Refunds</h2>
      <p>
        Buyers may request a return within 7 days of delivery if the item is significantly different
        from the listing. Contact support at{" "}
        <a href="mailto:support@soma.rw" className="text-forest hover:underline">
          support@soma.rw
        </a>{" "}
        to open a dispute. Refunds are processed within 14 business days of a resolved dispute.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">
        8. Prohibited Conduct
      </h2>
      <p>You may not:</p>
      <ul className="space-y-1 list-disc list-inside">
        <li>Use SOMA Connect for any unlawful purpose.</li>
        <li>Post false reviews or manipulate ratings.</li>
        <li>Attempt to circumvent the platform to transact directly and avoid fees.</li>
        <li>Scrape, reverse-engineer, or attack the platform.</li>
        <li>Harass other users or SOMA Connect staff.</li>
      </ul>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">
        9. Intellectual Property
      </h2>
      <p>
        SOMA Connect's branding, design, and code are our property. Seller product images remain the
        seller's property; by uploading them, sellers grant us a non-exclusive licence to display
        them on the platform.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">
        10. Limitation of Liability
      </h2>
      <p>
        To the maximum extent permitted by Rwandan law, SOMA Connect is not liable for indirect,
        incidental, or consequential damages arising from use of the platform. Our liability is
        capped at the value of the relevant transaction.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">11. Governing Law</h2>
      <p>
        These terms are governed by the laws of the Republic of Rwanda. Disputes shall be resolved
        in the courts of Kigali, Rwanda.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">12. Changes</h2>
      <p>
        We may update these terms. Continued use of the platform after changes take effect
        constitutes acceptance of the new terms. Material changes will be communicated 14 days in
        advance.
      </p>

      <h2 className="font-display text-xl font-bold text-forest mt-8 mb-3">13. Contact</h2>
      <p>
        Questions about these terms?{" "}
        <a href="mailto:legal@soma.rw" className="text-forest hover:underline">
          legal@soma.rw
        </a>
      </p>
    </div>
  );
}
