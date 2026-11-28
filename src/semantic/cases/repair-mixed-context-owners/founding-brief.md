# Lantern Field Shop and Journal

Lantern Field sells small-batch outdoor supplies and publishes a quarterly journal. The store and the journal use one site because product readers frequently arrive through the same edition links as subscribers. Care teams answer order questions, editors approve published articles, and the web team owns delivery of the public site. Their queues are separate, even when the same person covers several of them in a small launch.

The first launch supports domestic shipping, returns against the original order, and a scheduled publication window. The editorial team owns what is published. Merchandising owns the accuracy of product listings. The web team owns which edition is delivered and how visitors can identify sponsored articles. A cross-functional issue belongs to the team that can resolve it. An editorial approval does not authorize a refund, and a change to a refund workflow does not change publication rules.

## Refund eligibility

Customers can request a refund within 14 days of purchase. [Refund eligibility](../../src/refunds/eligibility.js) implements the 14-day deadline. Support uses the [refund desk guide](/docs/refund-desk.md) for its intake checklist, examples and escalation contacts.

The customer may have received the parcel several days after purchase. The intake team records both dates so people can investigate complaints with a complete record. The purchase timestamp supplies the eligibility calculation. In the first release, the shop cannot replace timestamp evidence with a promise made in a message. Escalation is the route for staff to discuss a disputed timestamp or a transaction that could not be located.

Orders sometimes contain gifts and sometimes include several products packed together. Staff collect an order identifier before proposing a disposition. A bundle may produce separate questions about individual products. The eligibility service answers the date question for the underlying purchase. Customer support handles the bookkeeping and the communication about separate line items.

The refund desk monitors its backlog at the start and end of the day. Staff use the private queue to organize work and an individual order record to explain the decision. Neither queue names nor staffing schedules change the deadline. The team may move the queue to a different tool without changing the eligibility module or the customer-facing eligibility rule.

During a busy issue launch, replies may take longer than usual. An acknowledgement tells the customer that the team received the request and will inspect the order. It does not promise approval. The team distinguishes customers waiting for a reply from customers waiting for additional information. A request may need more time even when its purchase date is easy to establish.

The team reviews patterns in questions at the end of each issue. The review covers missing receipts, hard-to-find order references, and requests submitted close to the deadline. Staff use the findings to improve instructions and reminders. Policy changes need an explicit business decision that can be understood on the next release.

## Editorial approval

Only an editor can approve an article. An article can be published only after that approval. The [approval gate](../../src/publishing/review-gate.js) checks the reviewer role and [publication](../../src/publishing/publish.js) checks whether an editor has approved the article. The [editorial review guide](/docs/editorial-review.md) explains the review queue. The publishing procedure describes how editors hand a finished edition to production.

Files in `content/editions`, such as [the spring edition](/content/editions/spring.md), are the authoritative source of the articles and article order for each issue. Editorial approval governs those drafts. The public site renders a copy from the source. Edits to the rendering do not authorize edits to a draft, and the rendered output is not an editorial source.

Staff put an article through editorial review after the main draft is complete. The person making copy changes may leave questions for the editor, especially when a correction changes a direct quote or removes a necessary attribution. The editor looks for the current draft, reads the questions beside it, and records whether the article is ready. A copy editor's comments can support that decision.

The journal covers a mixture of equipment notes, interviews, and local projects. Different stories need different supporting material. A product article benefits from a record of how equipment was tested. An interview may instead need confirmation of names and quotations. The review queue keeps those supporting materials discoverable. The publishing module uses the [review notes prompt](/prompts/review-notes.md) to summarize open questions for a human editor, who alone can approve the draft. The publication gate consumes the approval result, not the supporting material itself.

Each issue has a proposed lineup before any individual article is ready. The lineup helps the editor coordinate artwork and response deadlines. It is ordinary planning evidence. An article can move later in the lineup while draft review continues. The production team reads the final edition source to learn what an approved build should contain.

A partner may supply photos or sponsor a story. Editorial approval governs the story and its use of those materials. The website delivery team has an independent obligation to make the sponsorship visible on the rendered page. Editorial staff put the sponsor name in the draft metadata, and web staff investigate delivery problems if the name is absent from the delivered article.

Corrections may arrive after a publication window has closed. Editors ask whether a correction is needed in the source, whether it affects the rest of the edition, and which inputs need to be reviewed again before release. The original article order and publication timing are useful for investigating the correction. They do not substitute for the review decision.

The editorial archive keeps records of past decisions, which can explain an earlier publication without deciding the next one. People working on a new draft consult current editorial ownership for the rules that apply today. Issue-specific production notes remain useful for scheduling, staffing and copying a stable workflow.

## Website delivery

Published sponsored articles show the sponsor name immediately above the article body. The [article layout](../../website/src/layouts/article.astro) is the only point that renders the disclosure to readers. The site does not ask readers to infer sponsorship from a logo, a style variation, or the article's position in the navigation.

The site's canonical edition URLs end with a slash. [The Astro configuration](../../website/astro.config.mjs) is the only place that defines that convention for the production build. Editors can copy a link from the final build. The delivery team checks that links found in outgoing newsletters share the canonical URL convention.

Production edition builds start only on a manual release dispatch. The [edition workflow](../../.github/workflows/edition.yml) is the only production build entry point. Local previews remain available for copy and accessibility work. Editors use preview links to review work-in-progress; publication approval and a manual production dispatch are separate steps.

Visitors may land on the same edition from a newsletter, a support reply, or a search result. The release team checks that the final build can serve the publication without a session cookie. Purchase and order-status pages are owned by the store. They rely on their own route and account rules and are not part of the public edition build.

Images in the delivered edition use AVIF. The hosted renderer supplies the production encoder. Local editorial previews can use a different toolchain and may render additional formats. The procedure for confirming the hosted encoder comes from the deployment environment. The local website has its own [dependency lock](/website/package-lock.json) for preview and development tools, alongside jobs and settings outside this repository.

The article sheet controls grid, line length and a narrow page gutter. Web staff review it on mobile during regular production. The visual treatment may change during an issue update as long as the delivery rules continue to hold. The archive reader and latest-issue view share typography but arrive at their content by different routes.

Some subscribers save edition links for later reading. The website team tests deep links to approved articles and verifies the issue index after release. Support can help a visitor locate a renamed issue. Operations staff collect the exact failing URL, device and time when they need to investigate a delivery problem.

Production generally happens after editorial triage so the person running the release has the approved lineup. The delivery team is free to change its checklist and handoff schedule. The manual trigger remains the release entry point. The team uses the release notes to record observed deployment issues without changing editorial approval or return eligibility.

## First edition operating checklist

### Before drafts open

The leads confirm the launch date and the owners of the order backlog, editorial queue and production window. They keep questions about refund eligibility out of editorial comments, and keep source draft changes out of deployment issue notes. When the same teammate handles two queues, the assignment still shows which responsibility they are handling.

The shop publishes its product list and the editorial desk prepares the issue template. Product photography may be reused with permission. Draft placeholder images have no publication status. Authors ask the editorial desk before making a photo decision that changes attribution, caption or the subject of a story. The preview remains disposable until source approval.

### During draft review

The editor reads each article in the issue source, with links to supporting materials and the contributor's open questions. The editorial team tracks blocked articles separately from copy that has not started review. The latter may still be scheduled. A blocked piece needs a clear follow-up owner before the review group closes its meeting.

Support collects the highest-frequency questions from the current order queue. A repeated missing-receipt question is useful input for a clearer intake guide. Individual approval decisions stay in the customer order record. Staff can reference the findings alongside edition metrics without merging the workflows or assuming that a popular issue changed purchase eligibility.

### Before production

The build operator compares the approved lineup with the preview and checks articles with sponsorship metadata. The release handoff records the proposed dispatch window as scheduling information. A broken preview link goes to the web team. A missing approval goes back to the editor. Operators record actionable evidence and avoid giving another team's approval by implication.

The editorial calendar has room for a delayed interview or late illustration. When one article moves, the editor checks the article order in the source edition before production starts. The production operator describes the resulting build and its expected availability. If the build starts late, the operator communicates its status without rewriting the source publication order.

### After signing off the edition

The team records the delivered URLs, checks the public issue index, and notes any sponsor disclosures requiring extra review. Support is told when the edition link is live so replies point readers to an available page. Product links within the issue are welcome, but support decisions remain grounded in the order record.

The team reviews operational notes after the publication launch. It separates questions about story selection, production reliability and returns so each owner can decide what to improve. Useful procedures and approved rule changes are recorded for the people who will run the next edition. Notes about one incident stay available as evidence for that incident.

The [repository index](/README.md) gives new contributors the project overview and the location of these operating guides.
