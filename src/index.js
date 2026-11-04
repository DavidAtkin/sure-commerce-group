export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request); // everything else: serve the website as normal
  },
};
async function handleContact(request, env) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  const reply = (ok, status = ok ? 200 : 400) => wantsJson
    ? Response.json({ ok }, { status })
    : Response.redirect(new URL(ok ? "/?sent=1#contact" : "/?sent=0#contact", request.url), 303);
  const d = await request.formData();
  if (d.get("company")) return reply(true);
  const name = String(d.get("name") || "").trim().slice(0, 200);
  const email = String(d.get("email") || "").trim().slice(0, 200);
  const topic = String(d.get("topic") || "Not given").trim().slice(0, 100);
  const message = String(d.get("message") || "").trim().slice(0, 5000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(false);
  const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  try {
    await env.CONTACT_EMAIL.send({
      to: "info@commerce-group.co.uk",
      from: { email: "website@commerce-group.co.uk", name: "CPG website" },
      replyTo: { email, name },
      subject: `Website enquiry: ${topic} from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
      html: `<p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Topic:</b> ${esc(topic)}</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`,
    });
    return reply(true);
  } catch (e) {
    console.error("Contact send failed", e.code, e.message);
    return reply(false, 500);
  }
}
