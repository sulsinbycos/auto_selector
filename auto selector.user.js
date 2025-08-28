// ==UserScript==
// @name         Auto-selection feedback (Workflow/Intent Verifier - Optimized Search Highlight)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Compact floating toolbox with pastel green theme, HVA selector, Workflow/Intent verification, and optimized "search" highlighter (no slowdown)
// @author       Mohammed Bin Sultan Bahyal @mbahyal
// @match        https://gamma.console.harmony.a2z.com/bc-rag-simulator/*
// @match        https://beta.console.harmony.a2z.com/bc-rag-simulator/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    let toolboxMounted = false;
    let defaultHVA = "PBI";

    const HVA_CHOICES = [
        "3WM (3-way match)", "ATEP (Amazon Tax Exemption Program)", "Account authority",
        "Add User", "Business Lists", "Business Order Information", "Business Prime",
        "Custom Quotes", "Guided Buying", "PBI", "Quantity Discount", "Recurring Delivery",
        "SSO", "Shared Settings", "None of the above", "Custom"
    ];

    // ✅ Updated Verify Workflow/Intent function for new structure
    function checkLabel(labelPrefix, expected) {
        // Look for divs that directly contain ONLY the label text and span
        const matches = Array.from(document.querySelectorAll("div:not(.V6_4-system-content)"))
            .filter(div => {
                const text = div.textContent.trim();
                const hasSpan = div.querySelector("span.V6_4-field-value");
                // Check if this div's direct text content starts with the label
                const directTextOnly = Array.from(div.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .join('');

                return directTextOnly.startsWith(labelPrefix.replace(':', '')) && hasSpan &&
                       !div.classList.contains('V6_4-system-content') &&
                       div.children.length <= 2; // Should only have the span and maybe one other element
            });

        if (matches.length === 0) return;

        matches.forEach(div => {
            // Find the span with class V6_4-field-value within this div
            const valueSpan = div.querySelector("span.V6_4-field-value");
            if (!valueSpan) return;

            const actual = valueSpan.textContent.trim();
            if (actual === expected) {
                // Highlight only the individual div (Workflow or Intent div)
                div.style.background = "#d8f3dc"; // pastel green
                div.style.border = "1px solid #2d6a4f";
                div.style.padding = "2px 4px";
                div.style.borderRadius = "4px";
            } else {
                // Highlight with red for mismatch
                div.style.background = "#f8d7da"; // red for mismatch
                div.style.border = "1px solid #721c24";
                div.style.padding = "2px 4px";
                div.style.borderRadius = "4px";
            }
        });
    }

    // ✅ Highlight "search" word only once per message (optimized)
    function highlightSearchWord(p) {
        if (!p || p.dataset.searchHighlighted) return; // prevent re-highlighting
        if (/search/i.test(p.textContent)) {
            p.innerHTML = p.innerHTML.replace(/(search)/gi, '<span style="color: red; font-weight: bold;">$1</span>');
            p.dataset.searchHighlighted = "true"; // mark as done
        }
    }

    // Watch only new <p> inside bot messages
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.matches("p")) {
                    const parent = node.closest("div.V6_4-message.V6_4-bot-message");
                    if (parent) highlightSearchWord(node);
                }
            });
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Run initially for existing messages
    document.querySelectorAll("div.V6_4-message.V6_4-bot-message p")
        .forEach(highlightSearchWord);

    // ---- Core Helpers ----
    function setDropdown(value) {
        const dropdown = document.querySelector("select.V6_4-hva-select");
        if (!dropdown) return;
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
        setter.call(dropdown, value);
        dropdown.dispatchEvent(new Event("input", { bubbles: true }));
        dropdown.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function setAllRadios(value) {
        document.querySelectorAll(`input[type='radio'][value='${value}']`).forEach(r => {
            r.click();
            r.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    function clickRadio(labelText, value) {
        const labels = Array.from(document.querySelectorAll("label"));
        const lbl = labels.find(l => l.textContent.includes(labelText));
        if (!lbl) return;
        const container = lbl.closest("div");
        if (!container) return;
        const radio = container.querySelector(`input[type='radio'][value='${value}']`);
        if (radio) {
            radio.click();
            radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function setTextareas(value) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        document.querySelectorAll("textarea").forEach(t => {
            setter.call(t, value);
            t.dispatchEvent(new Event("input", { bubbles: true }));
            t.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    function setTextareaByLabel(labelText, value) {
        const lbl = Array.from(document.querySelectorAll("label")).find(l => l.textContent.includes(labelText));
        if (!lbl) return;
        const container = lbl.closest("div");
        if (!container) return;
        const textarea = container.querySelector("textarea");
        if (!textarea) return;
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        setter.call(textarea, value);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // ---- Floating Toolbox ----
    function mountToolbox() {
        if (toolboxMounted) return;
        toolboxMounted = true;

        const box = document.createElement("div");
        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.width = "160px";
        box.style.background = "#e6f4ea"; // pastel green
        box.style.border = "1px solid #2d6a4f";
        box.style.borderRadius = "8px";
        box.style.padding = "6px";
        box.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
        box.style.zIndex = "99999";
        box.style.cursor = "move";
        box.style.fontFamily = "sans-serif";
        box.style.fontSize = "12px";

        const title = document.createElement("div");
        title.textContent = "RAG Toolbox";
        title.style.fontWeight = "bold";
        title.style.marginBottom = "6px";
        title.style.textAlign = "center";
        title.style.color = "#1b4332";
        box.appendChild(title);

        const select = document.createElement("select");
        select.style.width = "100%";
        select.style.marginBottom = "8px";
        HVA_CHOICES.forEach(hva => {
            const opt = document.createElement("option");
            opt.value = hva;
            opt.textContent = hva;
            if (hva === defaultHVA) opt.selected = true;
            select.appendChild(opt);
        });
        select.addEventListener("change", e => defaultHVA = e.target.value);
        box.appendChild(select);

        const buttons = [
            {
                text: "Accurate Using KB",
                action: () => {
                    setDropdown(defaultHVA);
                    setAllRadios("Yes");
                    setTextareas("Response is accurate");
                    // Only highlight Workflow and Intent verification
                    checkLabel("Workflow:", "abfeature_concise_response_using_knowledge_base");
                    checkLabel("Intent:", "ab_features_static_help");
                }
            },
            {
                text: "Accurate Static",
                action: () => {
                    setDropdown(defaultHVA);
                    setAllRadios("Yes");
                    clickRadio("Tonality Accurate?", "N/A");
                    clickRadio("Retrieval Relevant?", "N/A");
                    setTextareas("Response is accurate");
                }
            },
            {
                text: "Static RQ wrong",
                action: () => {
                    setDropdown(defaultHVA);
                    clickRadio("Intent Accurate?", "Yes");
                    clickRadio("Workflow Accurate?", "Yes");
                    clickRadio("Response content Accurate?", "Yes");
                    clickRadio("Bypass Ground Truth", "Yes");
                    clickRadio("Tonality Accurate?", "N/A");
                    clickRadio("Retrieval Relevant?", "N/A");
                    clickRadio("Reformulated query Accurate?", "No");
                    setTextareaByLabel("Reviewer Comments:", "Response is accurate , but reformulated query is incorrect");
                    setTextareaByLabel("Exception Justification:", "Response is accurate");
                }
            }
        ];

        buttons.forEach(b => {
            const btn = document.createElement("button");
            btn.textContent = b.text;
            btn.style.width = "100%";
            btn.style.marginBottom = "4px";
            btn.style.padding = "4px";
            btn.style.background = "#74c69d";
            btn.style.color = "white";
            btn.style.border = "none";
            btn.style.borderRadius = "4px";
            btn.style.cursor = "pointer";
            btn.style.fontSize = "11px";
            btn.onclick = b.action;
            box.appendChild(btn);
        });

        document.body.appendChild(box);

        // Drag functionality
        let drag = false, x = 0, y = 0;
        box.addEventListener("mousedown", e => {
            drag = true;
            x = e.clientX - box.offsetLeft;
            y = e.clientY - box.offsetTop;
            box.style.opacity = "0.85";
        });
        document.addEventListener("mousemove", e => {
            if (!drag) return;
            box.style.left = e.clientX - x + "px";
            box.style.top = e.clientY - y + "px";
            box.style.right = "auto"; // prevent snapping back
        });
        document.addEventListener("mouseup", () => {
            drag = false;
            box.style.opacity = "1";
        });
    }

    // Initialize
    if (document.readyState === "complete") mountToolbox();
    else window.addEventListener("load", mountToolbox);

})();
