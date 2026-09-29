# Common passwords

`common.txt` is `Passwords/Common-Credentials/100k-most-used-passwords-NCSC.txt` from
[SecLists](https://github.com/danielmiessler/SecLists) (the file as of commit `1a7bb91`, fetched
2026-09-29), unmodified — 99,839 passwords, the UK NCSC's list of the most used passwords seen in
breaches. (Lead ruling: chosen over `10k-most-common.txt`, which left only 5 entries that the
other rules do not already refuse.)

SecLists is released under the MIT License:

> MIT License
>
> Copyright (c) 2018 Daniel Miessler
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software
> and associated documentation files (the "Software"), to deal in the Software without
> restriction, including without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
> Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or
> substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
> BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

`common.generated.ts` is derived from it by `node src/lib/passwords/generate.mjs`: only the
entries that could pass every other rule (10+ characters with a letter and a digit — 5,794 of
them) are kept, because every other entry is refused anyway. `password.test.ts` proves the
filtered set refuses exactly what the full list would (padded and invisible-character variants
included) and fails if the module drifts from the script. Regenerate after replacing
`common.txt`.

**Who may import it (docs/BACKEND.md A12, amended):** only `server.ts` (the server-side check
every password-setting action calls) and the sign-up and reset forms (`PasswordFields.tsx`).
Never anything under `src/lib/validation/**`, which almost every client bundle reaches — a test
enforces that.
