export type LegalDoc = { title: string; updated: string; intro: string; sections: [string, string][] }

export const LEGAL: Record<'terms' | 'privacy' | 'cookies', LegalDoc> = {
  terms: {
    title: 'Terms of Service',
    updated: 'June 2026',
    intro: 'Welcome to RevaampAPA. These Terms of Service (“Terms”) govern your access to and use of the RevaampAPA platform, including our website, applications, and related services (collectively, the “Platform”). By accessing or using the Platform, you agree to be bound by these Terms.',
    sections: [
      ['Acceptance of Terms', 'By creating an account, listing a property, subscribing to a service, or otherwise using the Platform, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy. If you do not agree, you must not use the Platform.'],
      ['Eligibility', 'You must be at least 18 years old and capable of forming a legally binding contract to use the Platform. Where you act on behalf of an organisation, you represent that you are authorised to bind that organisation to these Terms.'],
      ['Accounts and Roles', 'The Platform supports multiple roles, including property owners, promoters, agents, business partners, solicitors, architects and project management subscribers. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Certain roles require approval and/or verification before access is granted.'],
      ['Listings, Projects and Verification', 'Users who list properties or propose projects are responsible for the accuracy, legality and completeness of the information they submit. RevaampAPA may, but is not obliged to, verify listings, documents, bank guarantees and professional credentials. Verification does not constitute a warranty by RevaampAPA as to the condition, title, value or suitability of any property or project.'],
      ['Fees and Payments', 'Some services attract fees, including listing verification fees, subscription fees and service fees. Applicable fees are presented before you commit to a transaction. Payments are processed through third-party providers, and you agree to their terms in addition to ours. Except where required by law, fees are non-refundable.'],
      ['Professional Services', 'Solicitors and architects onboarded to the Platform provide independent professional services. RevaampAPA facilitates introductions and workflow but is not a party to, and accepts no liability for, the professional advice, legal opinions or structural assessments provided by such professionals.'],
      ['Acceptable Use', 'You agree not to misuse the Platform, including by submitting false information, infringing intellectual property, attempting to gain unauthorised access, or using the Platform for any unlawful purpose.'],
      ['Limitation of Liability', 'To the maximum extent permitted by law, RevaampAPA shall not be liable for any indirect, incidental or consequential losses arising from your use of the Platform. The Platform is provided on an “as is” and “as available” basis.'],
      ['Changes to These Terms', 'We may update these Terms from time to time. Material changes will be notified through the Platform. Continued use after changes take effect constitutes acceptance of the revised Terms.'],
      ['Contact', 'Questions about these Terms may be directed to info@revaampapa.com.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'June 2026',
    intro: 'RevaampAPA (“we”, “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose and safeguard your personal information when you use our Platform.',
    sections: [
      ['Information We Collect', 'We collect information you provide directly, such as your name, email address, phone number, country of residence, identification or registration numbers, professional credentials, property and project details, and documents you upload. We also collect technical data such as your IP address, device and usage information.'],
      ['How We Use Your Information', 'We use your information to create and manage your account, verify listings and professional credentials, facilitate transactions and introductions, process payments, communicate with you, provide support, and improve the Platform.'],
      ['Legal Basis', 'We process personal data where necessary to perform a contract with you, to comply with legal obligations, with your consent, or where it is in our legitimate interests to operate and improve the Platform.'],
      ['Sharing of Information', 'We may share your information with other users where necessary to facilitate a transaction (for example, sharing a project plan with an assigned solicitor or architect), with payment and verification providers, and with service providers acting on our behalf. We do not sell your personal information.'],
      ['Document and Data Security', 'We apply reasonable technical and organisational measures to protect your information. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.'],
      ['Data Retention', 'We retain personal information for as long as your account is active and as needed to provide services, comply with legal obligations, resolve disputes and enforce our agreements.'],
      ['Your Rights', 'Subject to applicable law, you may request access to, correction of, or deletion of your personal information, and you may object to or restrict certain processing. To exercise these rights, contact us using the details below.'],
      ['Cookies', 'We use cookies and similar technologies as described in our Cookie Policy.'],
      ['Changes to This Policy', 'We may update this Policy from time to time. Material changes will be notified through the Platform.'],
      ['Contact', 'For privacy enquiries, contact info@revaampapa.com.'],
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    updated: 'June 2026',
    intro: 'This Cookie Policy explains how RevaampAPA uses cookies and similar technologies when you visit our Platform.',
    sections: [
      ['What Are Cookies?', 'Cookies are small text files stored on your device when you visit a website. They help the site function, remember your preferences, and understand how the site is used.'],
      ['Types of Cookies We Use', 'Essential cookies are necessary for the Platform to function, including keeping you signed in and maintaining your session security. Preference cookies remember your settings. Analytics cookies help us understand how visitors interact with the Platform so we can improve it.'],
      ['Session and Authentication', 'We use a session cookie to keep you logged in securely as you move between pages. Disabling essential cookies will prevent you from signing in or using core features.'],
      ['Managing Cookies', 'Most browsers let you control cookies through their settings, including blocking or deleting them. Note that blocking essential cookies may affect the functionality of the Platform.'],
      ['Third-Party Cookies', 'Some features rely on third-party services (such as payment processors and analytics providers) that may set their own cookies. Their use of cookies is governed by their respective policies.'],
      ['Changes to This Policy', 'We may update this Cookie Policy from time to time. Material changes will be notified through the Platform.'],
      ['Contact', 'Questions about our use of cookies can be sent to info@revaampapa.com. See also our Privacy Policy and Terms of Service.'],
    ],
  },
}
