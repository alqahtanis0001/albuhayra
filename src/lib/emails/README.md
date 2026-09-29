# Disposable email domains

`disposable.txt` is a selection of 336 entries from `disposable_email_blocklist.conf` in
[disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains)
(commit `51fafcd`): the best-known throwaway services (mailinator, guerrillamail, yopmail,
10minutemail, temp-mail, …) plus a sample of the list's other mail/temp/trash/spam domains.

That project is dedicated to the public domain under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). No attribution is
required; it is given here anyway.

One domain per line, lower-case. A sign-up address is refused when its domain **or any parent
domain** is listed (`x.mailinator.com` matches `mailinator.com`). Read once, server-only, by
`disposable.ts`.
