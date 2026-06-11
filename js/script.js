const STORAGE_KEY = "defi4_carbon_state";

const CARBON_FACTORS = {
    transportKgPerKm: {
        walk: 0,
        bike: 0,
        metro: 0.00444,
        bus: 0.122,
        tgv: 0.00293,
        "electric-car": 0.103,
        "thermal-car": 0.218,
        carpool: 0.109
    },
    mealKgPerUnit: {
        vegan: 0.39,
        vegetarian: 0.51,
        chicken: 1.58,
        fish: 1.98,
        beef: 7.26
    },
    digitalKgPerUnit: {
        streamingHour: 0.0316,
        visioHour: 0.016,
        email: 0.000104
    }
};

const TRANSPORT_LABELS = {
    walk: "À pied",
    bike: "Vélo",
    metro: "Métro",
    bus: "Bus thermique",
    tgv: "TGV / train",
    "electric-car": "Voiture électrique",
    "thermal-car": "Voiture thermique",
    carpool: "Covoiturage"
};

const ADVICE_BY_CATEGORY = {
    transport: "Le transport domine cette semaine : privilégier le métro, le vélo, la marche ou limiter certains trajets réduira le plus l'impact.",
    meals: "Les repas dominent cette semaine : diminuer les repas avec boeuf ou les remplacer plus souvent par des repas végétariens fera vite baisser le total.",
    digital: "Le numérique domine cette semaine : limiter le streaming non indispensable et regrouper les visioconférences peut réduire ce poste."
};

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatKg(value) {
    return `${value.toFixed(2).replace(".", ",")} kg CO2e`;
}

function getDefaultState() {
    return {
        inputs: {
            transportMode: "metro",
            distanceKm: 8,
            daysPerWeek: 5,
            roundTrip: true,
            mealVegan: 2,
            mealVegetarian: 3,
            mealChicken: 2,
            mealFish: 1,
            mealBeef: 1,
            streamingHours: 4,
            visioHours: 3,
            emailsSent: 35
        },
        results: {
            transport: 0,
            meals: 0,
            digital: 0,
            total: 0,
            dominantCategory: "transport"
        }
    };
}

function computeResults(inputs) {
    const transportFactor = CARBON_FACTORS.transportKgPerKm[inputs.transportMode] ?? 0;
    const roundTripFactor = inputs.roundTrip ? 2 : 1;
    const transport = transportFactor * inputs.distanceKm * inputs.daysPerWeek * roundTripFactor;

    const meals =
        inputs.mealVegan * CARBON_FACTORS.mealKgPerUnit.vegan +
        inputs.mealVegetarian * CARBON_FACTORS.mealKgPerUnit.vegetarian +
        inputs.mealChicken * CARBON_FACTORS.mealKgPerUnit.chicken +
        inputs.mealFish * CARBON_FACTORS.mealKgPerUnit.fish +
        inputs.mealBeef * CARBON_FACTORS.mealKgPerUnit.beef;

    const digital =
        inputs.streamingHours * CARBON_FACTORS.digitalKgPerUnit.streamingHour +
        inputs.visioHours * CARBON_FACTORS.digitalKgPerUnit.visioHour +
        inputs.emailsSent * CARBON_FACTORS.digitalKgPerUnit.email;

    const total = transport + meals + digital;

    const dominantCategory = [
        ["transport", transport],
        ["meals", meals],
        ["digital", digital]
    ].sort((a, b) => b[1] - a[1])[0][0];

    return { transport, meals, digital, total, dominantCategory };
}

function readFormState() {
    return {
        inputs: {
            transportMode: document.getElementById("transport-mode").value,
            distanceKm: toNumber(document.getElementById("distance-km").value),
            daysPerWeek: toNumber(document.getElementById("days-per-week").value),
            roundTrip: document.getElementById("round-trip").checked,
            mealVegan: toNumber(document.getElementById("meal-vegan").value),
            mealVegetarian: toNumber(document.getElementById("meal-vegetarian").value),
            mealChicken: toNumber(document.getElementById("meal-chicken").value),
            mealFish: toNumber(document.getElementById("meal-fish").value),
            mealBeef: toNumber(document.getElementById("meal-beef").value),
            streamingHours: toNumber(document.getElementById("streaming-hours").value),
            visioHours: toNumber(document.getElementById("visio-hours").value),
            emailsSent: toNumber(document.getElementById("emails-sent").value)
        },
        results: null
    };
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

function populateForm(state) {
    const { inputs } = state;
    document.getElementById("transport-mode").value = inputs.transportMode;
    document.getElementById("distance-km").value = inputs.distanceKm;
    document.getElementById("days-per-week").value = inputs.daysPerWeek;
    document.getElementById("round-trip").checked = inputs.roundTrip;
    document.getElementById("meal-vegan").value = inputs.mealVegan;
    document.getElementById("meal-vegetarian").value = inputs.mealVegetarian;
    document.getElementById("meal-chicken").value = inputs.mealChicken;
    document.getElementById("meal-fish").value = inputs.mealFish;
    document.getElementById("meal-beef").value = inputs.mealBeef;
    document.getElementById("streaming-hours").value = inputs.streamingHours;
    document.getElementById("visio-hours").value = inputs.visioHours;
    document.getElementById("emails-sent").value = inputs.emailsSent;
}

function renderChart(state) {
    const chart = document.getElementById("result-chart");
    if (!chart) {
        return;
    }

    const items = [
        { label: "Transport", value: state.results.transport, className: "bar-transport" },
        { label: "Repas", value: state.results.meals, className: "bar-meals" },
        { label: "Numérique", value: state.results.digital, className: "bar-digital" }
    ];
    const maxValue = Math.max(...items.map((item) => item.value), 1);

    chart.innerHTML = "";
    items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "bar-row";

        const label = document.createElement("div");
        label.className = "bar-label";
        label.textContent = item.label;

        const track = document.createElement("div");
        track.className = "bar-track";

        const fill = document.createElement("div");
        fill.className = `bar-fill ${item.className}`;
        fill.style.width = `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 4 : 0)}%`;

        const value = document.createElement("div");
        value.className = "bar-value";
        value.textContent = formatKg(item.value);

        track.appendChild(fill);
        row.append(label, track, value);
        chart.appendChild(row);
    });
}

function fillRecapList(listId, entries) {
    const list = document.getElementById(listId);
    if (!list) {
        return;
    }

    list.innerHTML = "";
    entries.forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = entry;
        list.appendChild(li);
    });
}

function renderResultsPage(state) {
    const emptyState = document.getElementById("empty-state");
    const resultsContent = document.getElementById("results-content");

    if (!state || !state.results) {
        if (emptyState) {
            emptyState.classList.remove("hidden-state");
        }
        if (resultsContent) {
            resultsContent.classList.add("hidden-state");
        }
        return;
    }

    emptyState.classList.add("hidden-state");
    resultsContent.classList.remove("hidden-state");

    document.getElementById("transport-value").textContent = formatKg(state.results.transport);
    document.getElementById("meals-value").textContent = formatKg(state.results.meals);
    document.getElementById("digital-value").textContent = formatKg(state.results.digital);
    document.getElementById("total-value").textContent = formatKg(state.results.total);
    document.getElementById("main-advice").textContent = ADVICE_BY_CATEGORY[state.results.dominantCategory];

    fillRecapList("transport-recap", [
        `Mode : ${TRANSPORT_LABELS[state.inputs.transportMode]}`,
        `Distance aller simple : ${state.inputs.distanceKm} km`,
        `Jours de présence : ${state.inputs.daysPerWeek}`,
        `Aller-retour : ${state.inputs.roundTrip ? "oui" : "non"}`
    ]);

    fillRecapList("meals-recap", [
        `Repas végétaliens : ${state.inputs.mealVegan}`,
        `Repas végétariens : ${state.inputs.mealVegetarian}`,
        `Repas avec poulet : ${state.inputs.mealChicken}`,
        `Repas avec poisson : ${state.inputs.mealFish}`,
        `Repas avec boeuf : ${state.inputs.mealBeef}`
    ]);

    fillRecapList("digital-recap", [
        `Streaming : ${state.inputs.streamingHours} h`,
        `Visioconférence : ${state.inputs.visioHours} h`,
        `Emails envoyés : ${state.inputs.emailsSent}`
    ]);

    renderChart(state);
}

function initCalculatorPage() {
    const form = document.getElementById("carbon-form");
    if (!form) {
        return;
    }

    const previousState = loadState();
    if (previousState) {
        populateForm(previousState);
    } else {
        populateForm(getDefaultState());
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const state = readFormState();
        state.results = computeResults(state.inputs);
        saveState(state);
        window.location.href = "resultats.html";
    });

}

function initResultsPage() {
    if (!document.getElementById("results-content")) {
        return;
    }

    const state = loadState();
    renderResultsPage(state);
}

document.addEventListener("DOMContentLoaded", () => {
    initCalculatorPage();
    initResultsPage();
});
