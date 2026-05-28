fetch("/api/auth/verify", { credentials: "include" }).then((res) => {
  if (res.ok) window.location.replace("/panel");
});

const form = document.querySelector("form")!;
const errorEl = form.querySelector<HTMLParagraphElement>(".error")!;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const input = form.querySelector<HTMLInputElement>("input[name='password']")!;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: input.value }),
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/panel";
    } else {
      errorEl.textContent = data.error || "Błąd logowania";
      input.value = "";
      input.focus();
    }
  } catch {
    errorEl.textContent = "Błąd połączenia z serwerem";
  }
});
