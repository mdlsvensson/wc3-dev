# Message to Hive Workshop staff

`docs/hive-integration.md` requires contacting Hive staff before wc3.dev builds
any automated access to Hive. This is the message for that first contact. Send
it where Hive staff prefer to hear about site integrations: a staff contact
form, a private message to an administrator, or the relevant site-feedback
forum. The choice is the owner's. Send it once the contact link on
`/resources/` is public: the message points staff to it, and it is
`HIVE_CONTACT_URL` in `src/lib/hive.ts` (see the README). Replace `[Your name]`
before sending, and record the reply (or the lack of one) in the Status
section of `docs/hive-integration.md`.

---

**Subject:** wc3.dev and Hive Workshop: is there a feed for new resources?

Hi,

I maintain wc3.dev, an independent Warcraft III developer portal with
documentation, a beginner tutorial track and a small catalog of modding
resources. It is meant as a companion to Hive, and it sends people to Hive
rather than replacing it.

What wc3.dev shows, or is about to show:

- A curated selection of resources for browsing and previewing only, each
  shown with their author's permission or under a licence that allows it.
  Each one credits its author and links to where it was published; for Hive
  resources, the Hive page is the main action. wc3.dev never offers
  downloads.
- A "New on Hive" list: the titles, authors, categories and dates of recent
  Hive resources, each linking to its page on Hive. I refresh it by hand, from
  feeds or pages I save in my browser. Nothing on wc3.dev requests anything
  from Hive automatically.

My question: does Hive have an official feed or API for new resources that I
could use, or could one be agreed? If so, which endpoints may I use, and how
often?

If you are happy for wc3.dev to read one automatically, it would keep to these
limits:

- A descriptive User-Agent that links to wc3.dev.
- Requests well below anything that could affect Hive, backing off on errors.
- Full respect for robots.txt and Hive's terms.
- Metadata only: titles, authors, categories, dates and links. No files and no
  page content.
- An opt-out authors can use without contacting me, and prompt removal of
  anything you or an author ask me to take down.

If you would prefer something different, such as a shorter list, other wording
or no list at all, let me know and I will change it. You can reply here or
use the contact link in the "Authors on Hive" note at
https://wc3.dev/resources/.

Thank you for everything Hive does for the Warcraft III community.

Best regards,
[Your name]
Maintainer, wc3.dev (https://wc3.dev)
