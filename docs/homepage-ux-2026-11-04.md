# Public homepage UX

Applied the user-requested ui-ux-pro-max skill, including its design-system and
React searches. Adapted its operations/product-preview direction to the existing
workspace theme rather than adding a separate palette or Latin font family.

Design: IRANYekanWeb, existing base/primary theme tokens, stronger accent text
contrast, a two-column product introduction on desktop and one column on mobile.
Added three task-based starting paths (audit, content, measurement), with concrete
outputs and links to the relevant explanation. Demo data remains explicitly labeled.
SAM wording describes in-site use without requiring customers to configure keys.

Body copy and preview labels are more legible; interactive targets are at least
44px where adjusted. Mobile navigation closes on selection and Escape. No new
dependencies, external assets or animation were introduced.

Verification: TypeScript passed. `node e2e/homepage.smoke.mjs` passed in Chrome at
375/768/1024/1440px in light and dark themes, checking horizontal overflow, preview
selection and mobile navigation. Desktop light and mobile light/dark screenshots
were visually reviewed; dark accent contrast was improved afterward and the
browser checks rerun.

Not checked: production deployment, actual signup/authentication, Safari or a
physical phone. The fixture renders the real homepage without a backend.
