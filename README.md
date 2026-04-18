# Desk Advisor

This repository now includes the first maintainable foundation for evolving Desk Advisor beyond a static quiz and into a polished public website experience.

## What changed

- added a `Next.js` app scaffold
- extracted assessment questions into structured data
- created typed assessment and diagnosis models
- added a reusable diagnosis engine in `src/core/diagnose.ts`
- added a server-style assessment endpoint in `src/app/api/assess/route.ts`
- added a customer-facing homepage with an interactive assessment and structured results experience

## Why this matters

The old prototype proved the concept, but its logic lived inside one large HTML file.
This new structure is a better base for:

- a real website experience on `desklab.uk`
- AI-generated summaries
- conversational follow-up guidance
- photo-based workspace analysis
- saved assessments
- smarter product matching

## Core files

- `src/data/questions.ts`: assessment flow config
- `src/data/product-catalog.ts`: product metadata and fit signals
- `src/core/diagnose.ts`: structured diagnosis engine
- `src/app/api/assess/route.ts`: assessment endpoint shape
- `src/app/page.tsx`: app shell demonstrating the new model

## Next recommended build steps

1. Turn the sample page into a real interactive assessment experience.
2. Move from demo data to real form state and API calls.
3. Add AI-generated explanation on top of the structured diagnosis result.
4. Add photo upload once the assessment and diagnosis model are stable.
