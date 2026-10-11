/** One command to the running driver: node do.mjs <cmd> '<json>' [--port N]. Prints the result; exits 1 on an error. */
const [cmd, json = "{}", ...rest] = process.argv.slice(2);
const port = rest.includes("--port") ? Number(rest[rest.indexOf("--port") + 1]) : 4321;
const res = await fetch(`http://127.0.0.1:${port}/`, { method: "POST", body: JSON.stringify({ cmd, args: JSON.parse(json) }) });
const out = await res.json();
console.log(`${out.ok ? "" : "ERROR: "}${out.result} [taps=${out.taps}]`);
process.exit(out.ok ? 0 : 1);
