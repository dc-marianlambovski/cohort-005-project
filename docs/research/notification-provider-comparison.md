# Hosted in-app notification providers for Cadence

**Checked:** 2026-11-16. **Research:** [issue #8](https://github.com/dc-marianlambovski/cohort-005-project/issues/8); **feature context:** [map #6](https://github.com/dc-marianlambovski/cohort-005-project/issues/6).

## Summary and shortlist

Shortlist **Knock, Novu Cloud, and Courier** for a later prototype and human decision; **MagicBell** is another viable candidate if its retention and compatibility questions can be answered. All four document a hosted in-app service and ready-made React inbox; none eliminates Cadence's need to trigger notifications and securely identify the current user. This is not a provider selection.

The strongest differentiators are Knock's published unlimited configurable feed retention, Novu's explicit React 19 support and React Router example, Courier's documented inbox persistence and token-scoped access, and MagicBell's smaller free allowance. Prices use different units and cannot be compared directly without event and recipient-volume estimates. The feature map leaves lifecycle, retention, access boundaries, and recipient behavior open.

## Cadence integration context

Cadence uses React 19 and React Router 8 with server-side rendering enabled ([dependencies](https://github.com/dc-marianlambovski/cohort-005-project/blob/feac4ef/package.json), [SSR configuration](https://github.com/dc-marianlambovski/cohort-005-project/blob/feac4ef/react-router.config.ts)). React support alone does **not** establish compatibility with its precise React Router 8 SSR/hydration setup; prototype it. Use the existing authenticated server session to determine the recipient and issue a provider credential; never expose the provider's secret or trust an arbitrary browser-supplied recipient. Cadence's DevUI supports switching users, useful for testing inbox isolation ([README](https://github.com/dc-marianlambovski/cohort-005-project/blob/feac4ef/README.md)).

Pricing below is USD, as published on the checked date, and may change. The reviewed documentation describes integration patterns, not a tested Cadence implementation.

## Knock

- **React and hosted delivery:** [`@knocklabs/react`](https://docs.knock.app/getting-started/quick-start/react) provides `NotificationFeed`, a bell and feed provider; a server-triggered workflow delivers to Knock's in-app channel. The quickstart uses client-side React APIs; React 19 and React Router 8 SSR compatibility were not established by the reviewed docs. [Feed documentation](https://docs.knock.app/in-app-ui/react/feed).
- **Storage:** [Pricing](https://knock.app/pricing) lists unlimited, configurable feed retention on all plans. Message logs are separate: 30 days on Free and Starter, 90 on Enterprise. Confirm whether the eventual product retention policy requires different deletion behavior.
- **Price:** Free includes up to 10,000 messages/month; Starter is $250/month including 50,000, then $0.005 each. A message is a delivery to one user on one channel. Free is not hard-capped, but the page does not specify a free-plan overage rate ([pricing and FAQ](https://knock.app/pricing)).
- **Local testing:** Use an isolated development environment and dashboard workflow test runner; sandbox mode previews messages without delivering them, so use a non-sandbox test to exercise the actual inbox. The test runner bypasses trigger-frequency rules, so verify those through the API ([testing](https://docs.knock.app/send-notifications/testing-workflows), [environments](https://docs.knock.app/version-control/environments)).
- **Security:** Enable enhanced security mode and sign a user token on the server before production; otherwise a public key can act as any user ([security](https://docs.knock.app/in-app-ui/security-and-authentication)).

## Novu Cloud

- **React and hosted delivery:** [`@novu/react` Inbox](https://docs.novu.co/platform/inbox) supplies a bell, feed, read state and real-time synchronization with Novu's backend. Its docs explicitly support React 19; the [React quickstart](https://docs.novu.co/platform/quickstart/react) shows React Router navigation. Adapt its `react-router-dom` example to Cadence's installed router and test SSR.
- **Storage:** The [pricing page](https://www.novu.co/pricing/) lists **activity feed** retention of 24 hours on Free, seven days on Pro, and 90 days on Team. It separately lists **inbox feed retention**; do not assume the activity-log duration is the recipient-inbox duration. Confirm the plan-specific inbox retention directly with Novu before making a retention-dependent decision; the extracted comparison table does not unambiguously associate that row's values with the plans.
- **Price:** Free includes 10,000 workflow runs/month, five workflows, and development plus production environments. Pro starts at $30/month for 30,000 runs, with $1.20 per additional 1,000; Team starts at $250/month for 250,000. A workflow run is not interchangeable with another vendor's delivery or send ([pricing](https://www.novu.co/pricing/)).
- **Local testing:** Run Cadence locally against the hosted development environment, create an in-app workflow in the dashboard and use its test trigger. Free includes separate Dev and Prod environments ([quickstart](https://docs.novu.co/platform/quickstart/react), [pricing](https://www.novu.co/pricing/)).
- **Security:** Enable HMAC subscriber verification and generate the subscriber hash server-side. The vendor warns that without it a guessed subscriber ID can expose another subscriber's notifications ([production setup](https://docs.novu.co/platform/inbox/prepare-for-production)).

## Courier

- **React and hosted delivery:** [`@trycourier/courier-react`](https://www.courier.com/docs/guides/add-an-inbox-to-react) offers `CourierInbox` and a popup menu. Courier hosts the feed; new messages appear without refresh, and read/archive state syncs across devices. The guide uses React and Vite and notes a separate React 17 package; it does not establish React Router 8 SSR behavior.
- **Storage:** Messages stay in the feed until archived or expired; without an `expiresAt`, they persist. Archived/expired feed visibility should not be conflated with a guaranteed backend data-deletion policy ([runtime behavior](https://www.courier.com/docs/in-app/how-the-inbox-behaves)).
- **Price:** Developer is free for 10,000 sends/month. Business costs $0.005 for **every** send, including the first 10,000 after upgrading. A send is one template to one recipient even when multiple channels deliver it; Test and custom-environment sends count too ([pricing](https://www.courier.com/pricing), [billing](https://www.courier.com/docs/workspaces/billing)).
- **Local testing:** The [React guide](https://www.courier.com/docs/guides/add-an-inbox-to-react) runs a local Vite app and send script against Courier; use a Test environment key and account for test sends in usage. A backend route issues the user token.
- **Security:** Mint a short-lived JWT scoped to the session user and inbox permissions on the server; refresh it before expiry. Never put the API key in the browser ([authentication](https://www.courier.com/docs/in-app/authenticate-users), [guide](https://www.courier.com/docs/guides/add-an-inbox-to-react)).

## MagicBell

- **React and hosted delivery:** [`@magicbell/react`](https://www.magicbell.com/docs/libraries/magicbell-react) offers `Inbox` and `FloatingInbox` with read/unread state. A broadcast creates per-user notifications and delivers them through configured channels ([notification lifecycle](https://www.magicbell.com/docs/primitive/notification)). React 19 and React Router SSR support were not established in the reviewed docs.
- **Storage:** The reviewed [notification lifecycle](https://www.magicbell.com/docs/primitive/notification) documents read, seen, archived and timestamps, but not a retention period. Confirm retention and deletion with MagicBell.
- **Price:** Builder is free for 1,000 deliveries/month and one project. Startup is $249/month for 50,000 deliveries, then $0.0025 per additional delivery. A delivery is counted per recipient and channel; the pricing page says overages are charged but does not state the Builder overage rate ([pricing](https://www.magicbell.com/pricing)).
- **Local testing:** Render the React component locally against a MagicBell project and use the dashboard's [broadcast composer](https://www.magicbell.com/docs/dashboard/broadcast) to send a test notification. The reviewed sources did not establish a local emulator or separate free test environment; Builder includes one project.
- **Security:** Generate a user JWT on Cadence's server with the project secret; provide the token, not the secret, to the React client ([user authentication](https://www.magicbell.com/docs/api/authentication/user)).

## Decision inputs and prototype checks

1. Define notification events, recipients and fan-out, read/archive behavior, retention and deletion, failure handling, and access boundaries before evaluating cost or selecting a provider ([feature map](https://github.com/dc-marianlambovski/cohort-005-project/issues/6)).
2. Estimate production **and test** volume using each provider's billing unit; confirm free-plan overages, retention, rate limits, and branding constraints against current terms.
3. Exercise React Router SSR/hydration, local development and real-time delivery. Switch DevUI users and verify no cross-user leakage, including old tabs and expired credentials. Verify links, state synchronization, retries, and actual retention against the eventual spec.
4. Keep secrets server-side and use the authenticated Cadence session as the source of provider identity. Validate user and course/team authorization independently of the inbox UI.
