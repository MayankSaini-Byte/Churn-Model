"use strict";

/* ═══════════════════════════════════════════════════════════════
   ChurnSight — Client Logic
   Handles: Scroll reveals, pipeline animation, predictor form
   ═══════════════════════════════════════════════════════════════ */

const PAGE = document.body.dataset.page; // "landing" | "predict"


/* ─────────────────────────────────────────────────────────────
   SHARED: Scroll Reveal (IntersectionObserver)
   ───────────────────────────────────────────────────────────── */
function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal-on-scroll");
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  reveals.forEach((el) => observer.observe(el));
}

initScrollReveal();


/* ─────────────────────────────────────────────────────────────
   SHARED: Header Scroll Effect
   ───────────────────────────────────────────────────────────── */
(function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 20) {
          header.style.borderBottomColor = "rgba(99,102,241,0.2)";
        } else {
          header.style.borderBottomColor = "";
        }
        ticking = false;
      });
      ticking = true;
    }
  });
})();


/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE: ML Pipeline Animation
   ═══════════════════════════════════════════════════════════════ */
if (PAGE === "landing") {
  (function initPipeline() {
    const container = document.getElementById("pipelineContainer");
    if (!container) return;

    const nodes = container.querySelectorAll(".pipeline-node");
    const connectors = container.querySelectorAll(".pipeline-connector");
    const TOTAL_STEPS = nodes.length; // 4
    const STEP_DURATION = 1500;       // ms per step
    const PAUSE_DURATION = 2000;      // pause after full cycle
    let currentStep = -1;
    let animationTimer = null;
    let isVisible = false;

    function resetPipeline() {
      nodes.forEach((n) => {
        n.classList.remove("active", "completed");
      });
      connectors.forEach((c) => {
        c.classList.remove("active");
      });
      currentStep = -1;
    }

    function advanceStep() {
      currentStep++;

      if (currentStep >= TOTAL_STEPS) {
        // Full cycle complete — pause, then restart
        animationTimer = setTimeout(() => {
          resetPipeline();
          animationTimer = setTimeout(advanceStep, 400);
        }, PAUSE_DURATION);
        return;
      }

      // Mark previous nodes as completed
      nodes.forEach((n, i) => {
        if (i < currentStep) {
          n.classList.remove("active");
          n.classList.add("completed");
        } else if (i === currentStep) {
          n.classList.add("active");
          n.classList.remove("completed");
        } else {
          n.classList.remove("active", "completed");
        }
      });

      // Activate connector leading TO current step
      connectors.forEach((c) => {
        const afterStep = parseInt(c.dataset.after, 10);
        if (afterStep < currentStep) {
          c.classList.add("active");
        } else {
          c.classList.remove("active");
        }
      });

      animationTimer = setTimeout(advanceStep, STEP_DURATION);
    }

    function startPipeline() {
      if (animationTimer) clearTimeout(animationTimer);
      resetPipeline();
      animationTimer = setTimeout(advanceStep, 600);
    }

    function stopPipeline() {
      if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
      }
    }

    // Only animate when visible
    const pipelineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            isVisible = true;
            startPipeline();
          } else if (!entry.isIntersecting && isVisible) {
            isVisible = false;
            stopPipeline();
            resetPipeline();
          }
        });
      },
      { threshold: 0.3 }
    );

    pipelineObserver.observe(container);
  })();


  /* ─── Smooth Scroll for Anchor Links ─── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (targetId === "#") return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}


/* ═══════════════════════════════════════════════════════════════
   PREDICTOR PAGE: Form + Results
   ═══════════════════════════════════════════════════════════════ */
if (PAGE === "predict") {
  const form        = document.getElementById("churnForm");
  const predictBtn  = document.getElementById("predictBtn");
  const btnText     = predictBtn.querySelector(".btn-text");
  const btnLoader   = predictBtn.querySelector(".btn-loader");

  const emptyState    = document.getElementById("emptyState");
  const resultContent = document.getElementById("resultContent");
  const resetBtn      = document.getElementById("resetBtn");

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
  const recDot      = document.getElementById("recDot");
  const recTitle    = document.getElementById("recTitle");
  const recMessage  = document.getElementById("recMessage");
  const recActions  = document.getElementById("recActions");


  /* ─── Helpers ─── */
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
      // Ease-out cubic
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


  /* ─── Render Result ─── */
  function renderResult(data) {
    const churnProb = data.churn_probability;
    const stayProb  = data.stay_probability;
    const rec       = data.recommendation;
    const color     = riskColor(churnProb);

    // Risk badge
    riskBadge.className = `risk-badge risk--${color}`;
    riskIcon.textContent  = color === "green" ? "✅" : color === "orange" ? "⚠️" : "🚨";
    riskLabel.textContent = `${color.toUpperCase()} RISK`;
    riskSub.textContent   = data.churn_label === "Churn"
      ? "Customer is likely to churn"
      : "Customer is likely to stay";

    // Gauge
    gaugeFill.className = `gauge-fill gauge-fill--${color}`;
    gaugePct.className  = `gauge-pct color--${color}`;

    setTimeout(() => {
      gaugeFill.style.width = `${churnProb}%`;
    }, 80);
    animateNumber(gaugePct, churnProb, "%", 1200);

    // Circles
    setTimeout(() => {
      stayPath.setAttribute("stroke-dasharray",  circleProgress(stayProb));
      churnPath.setAttribute("stroke-dasharray", circleProgress(churnProb));
    }, 150);
    animateNumber(stayPct,  stayProb,  "%", 1200);
    animateNumber(churnPct, churnProb, "%", 1200);

    // Recommendation
    recDot.className   = `rec-dot rec-dot--${color}`;
    recTitle.textContent = rec.title;
    recMessage.textContent = rec.message;

    recActions.innerHTML = rec.actions
      .map((action) => `<li>${action}</li>`)
      .join("");

    // Show
    emptyState.classList.add("hidden");
    resultContent.classList.remove("hidden");

    // Mobile: scroll to result
    if (window.innerWidth <= 1024) {
      resultContent.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }


  /* ─── Reset ─── */
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


  /* ─── Form Submit ─── */
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


  /* ─── Focus Effects ─── */
  document.querySelectorAll(".form-input, .form-select").forEach((el) => {
    el.addEventListener("focus", () => el.parentElement.classList.add("focused"));
    el.addEventListener("blur",  () => el.parentElement.classList.remove("focused"));
  });
}
