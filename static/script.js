"use strict";

const form        = document.getElementById("churnForm");
const predictBtn  = document.getElementById("predictBtn");
const btnText     = predictBtn.querySelector(".btn-text");
const btnLoader   = predictBtn.querySelector(".btn-loader");

const emptyState  = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");
const resetBtn    = document.getElementById("resetBtn");

const riskBadge   = document.getElementById("riskBadge");
const riskIcon    = document.getElementById("riskIcon");
const riskLabel   = document.getElementById("riskLabel");
const riskSub     = document.getElementById("riskSub");
const gaugeFill   = document.getElementById("gaugeFill");
const gaugePct    = document.getElementById("gaugePct");
const stayPath    = document.getElementById("stayPath");
const churnPath   = document.getElementById("churnPath");
const stayPct     = document.getElementById("stayPct");
const churnPct    = document.getElementById("churnPct");
const recCard     = document.getElementById("recCard");
const recDot      = document.getElementById("recDot");
const recTitle    = document.getElementById("recTitle");
const recMessage  = document.getElementById("recMessage");
const recActions  = document.getElementById("recActions");

const tenureInput  = document.getElementById("tenure");
const monthlyInput = document.getElementById("MonthlyCharges");
const totalInput   = document.getElementById("TotalCharges");


function setLoading(isLoading) {
  if (isLoading) {
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");
    predictBtn.disabled = true;
  } else {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
    predictBtn.disabled = false;
  }
}

function animateNumber(el, end, suffix = "%", duration = 1200) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * ease;
    el.textContent = current.toFixed(1) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function circleProgress(pct) {
  const circumference = 100;
  const filled = (pct / 100) * circumference;
  return `${filled} ${circumference - filled}`;
}

function riskColor(pct) {
  if (pct < 35) return "green";
  if (pct < 60) return "orange";
  return "red";
}


function updateTotalCharges() {
  const t = parseFloat(tenureInput.value) || 0;
  const m = parseFloat(monthlyInput.value) || 0;
  if (t > 0 && m > 0) {
    totalInput.value = (t * m).toFixed(2);
  }
}

tenureInput.addEventListener("input", updateTotalCharges);
monthlyInput.addEventListener("input", updateTotalCharges);


function renderResult(data) {
  const churnProb = data.churn_probability;
  const stayProb  = data.stay_probability;
  const rec       = data.recommendation;
  const color     = riskColor(churnProb);

  riskBadge.className = `risk-badge risk--${color}`;
  riskIcon.textContent  = color === "green" ? "✅" : color === "orange" ? "⚠️" : "🚨";
  riskLabel.textContent = `${color.toUpperCase()} RISK`;
  riskSub.textContent   = data.churn_label === "Churn"
    ? "Customer is likely to churn"
    : "Customer is likely to stay";

  gaugeFill.className = `gauge-fill gauge-fill--${color}`;
  gaugePct.className  = `gauge-pct color--${color}`;

  setTimeout(() => {
    gaugeFill.style.width = `${churnProb}%`;
  }, 80);
  animateNumber(gaugePct, churnProb, "%", 1200);

  setTimeout(() => {
    stayPath.setAttribute("stroke-dasharray",  circleProgress(stayProb));
    churnPath.setAttribute("stroke-dasharray", circleProgress(churnProb));
  }, 150);
  animateNumber(stayPct,  stayProb,  "%", 1200);
  animateNumber(churnPct, churnProb, "%", 1200);

  recDot.className   = `rec-dot rec-dot--${color}`;
  recTitle.textContent = rec.title;
  recMessage.textContent = rec.message;

  recActions.innerHTML = rec.actions
    .map(action => `<li>${action}</li>`)
    .join("");

  emptyState.classList.add("hidden");
  resultContent.classList.remove("hidden");

  if (window.innerWidth <= 1024) {
    resultContent.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}


function resetToEmpty() {
  resultContent.classList.add("hidden");
  emptyState.classList.remove("hidden");

  gaugeFill.style.width = "0%";
  gaugePct.textContent  = "0%";

  stayPath.setAttribute("stroke-dasharray",  "0 100");
  churnPath.setAttribute("stroke-dasharray", "0 100");
  stayPct.textContent  = "0%";
  churnPct.textContent = "0%";
}

resetBtn.addEventListener("click", resetToEmpty);


form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData(form);

    const response = await fetch("/predict", {
      method: "POST",
      body:   formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Prediction failed. Please try again.");
    }

    renderResult(data);

  } catch (err) {
    console.error("Prediction error:", err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
});


document.querySelectorAll(".form-input, .form-select").forEach(el => {
  el.addEventListener("focus", () => el.parentElement.classList.add("focused"));
  el.addEventListener("blur",  () => el.parentElement.classList.remove("focused"));
});
