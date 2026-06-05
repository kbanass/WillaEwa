const SUBMITTED_KEY = "review_submitted";

const form = document.querySelector<HTMLFormElement>(".add-review__form")!;
const errorEl = form.querySelector<HTMLParagraphElement>(".error")!;
const submitBtn = form.querySelector<HTMLButtonElement>("button[type='submit']")!;

function hasSubmitted(): boolean {
  if (localStorage.getItem(SUBMITTED_KEY) === "1") return true;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${SUBMITTED_KEY}=1`));
}

function markSubmitted() {
  localStorage.setItem(SUBMITTED_KEY, "1");
  const year = 60 * 60 * 24 * 365;
  document.cookie = `${SUBMITTED_KEY}=1; max-age=${year}; path=/opinie; SameSite=Strict`;
}

function showSentState() {
  form.querySelectorAll<HTMLElement>("input, textarea, button").forEach((el) => {
    (el as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement).disabled = true;
  });
  submitBtn.textContent = "Wysłano";
  form.classList.add("add-review__form--sent");
  const sectionHeader = document.querySelector(".add-review .section-header");
  if (sectionHeader) {
    sectionHeader.innerHTML = `
      <span class="section-label">Dziękujemy</span>
      <h2 class="section-title">Dziękujemy za opinię!</h2>
      <p class="section-lead">Po weryfikacji przez administratora pojawi się na stronie głównej.</p>
    `;
  }
}

if (hasSubmitted()) {
  showSentState();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";

  const author = form.querySelector<HTMLInputElement>("input[name='author']")!.value.trim();
  const content = form.querySelector<HTMLTextAreaElement>("textarea[name='content']")!.value.trim();
  const rating = form.querySelector<HTMLInputElement>("input[name='rating']:checked")?.value;
  const email = form.querySelector<HTMLInputElement>("input[name='email']")!.value.trim();
  const website = form.querySelector<HTMLInputElement>("input[name='website']")!.value;

  if (!rating) {
    errorEl.textContent = "Wybierz ocenę";
    return;
  }

  if (author.length < 2) {
    errorEl.textContent = "Imię i nazwisko musi mieć co najmniej 2 znaki";
    return;
  }

  if (content.length < 2) {
    errorEl.textContent = "Opinia musi mieć co najmniej 2 znaki";
    return;
  }

  submitBtn.disabled = true;

  try {
    const res = await fetch("/api/add-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author,
        content,
        rating: Number(rating),
        email: email || undefined,
        website,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      markSubmitted();
      showSentState();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      errorEl.textContent = data.error || "Wystąpił błąd, spróbuj ponownie";
      submitBtn.disabled = false;
    }
  } catch {
    errorEl.textContent = "Błąd połączenia z serwerem";
    submitBtn.disabled = false;
  }
});
