document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  // redirect if not logged in
  if (!user) {
    window.location.href = "contact.html";
    return;
  }

  /* ================= USER INFO ================= */
  const nameEl = document.getElementById("name");
  const usernameEl = document.getElementById("username");

  if (nameEl) nameEl.innerText = user.name || "";
  if (usernameEl) usernameEl.innerText = user.username || "";

  /* ================= AVATAR ================= */
  const avatar = document.getElementById("avatar");
  const uploadPhoto = document.getElementById("uploadPhoto");
  const frame = document.querySelector(".avatar-frame");

  const savedAvatar = localStorage.getItem("userAvatar");
  if (avatar && savedAvatar) avatar.src = savedAvatar;

  if (frame && uploadPhoto) {
    frame.onclick = () => uploadPhoto.click();
  }

  if (uploadPhoto && avatar) {
    uploadPhoto.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        avatar.src = e.target.result;
        localStorage.setItem("userAvatar", e.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  /* ================= HISTORY LOAD ================= */
  loadHistory();
});

/* ================= TOGGLE SECTIONS ================= */
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const isHidden =
    section.style.display === "none" || section.style.display === "";

  document.querySelectorAll(".orders").forEach(sec => {
    sec.style.display = "none";
  });

  if (isHidden) {
    section.style.display = "block";

    if (sectionId === "history-section") {
      loadHistory();
    }
  }
}

/* ================= HISTORY ================= */
function loadHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;

  let history = JSON.parse(localStorage.getItem("orders")) || [];

  list.innerHTML = "";

  if (!history.length) {
    list.innerHTML = "<li>No orders yet</li>";
    return;
  }

  history.reverse().forEach(order => {
    const itemsText = (order.items || [])
      .map(i => `${i.name} x${i.quantity}`)
      .join(", ");

    list.innerHTML += `
      <li style="
        background:#fff;
        margin:10px 0;
        padding:12px;
        border-radius:10px;
        box-shadow:0 2px 8px rgba(0,0,0,0.1);
      ">
        <div><b>🕒 ${new Date(order.created_at).toLocaleString()}</b></div>
        <div>📍 ${order.address || "No address"}</div>
        <div>💰 <b>$${Number(order.total || 0).toFixed(2)}</b></div>
        <div>🛒 ${itemsText || "No items"}</div>
      </li>
    `;
  });
}

/* ================= LOGOUT ================= */
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("userAvatar");
  localStorage.removeItem("addresses");
  window.location.href = "contact.html";
}