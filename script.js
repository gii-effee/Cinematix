// ===== CONFIGURAZIONE TMDb =====
const TMDB_PROXY_BASE = "https://cinematix.greta-c2b.workers.dev";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
const APP_NAME = "Cinematix";

// ===== FUNZIONI TMDb =====
async function searchTitlesTMDb(query) {
  const url = `${TMDB_PROXY_BASE}/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Errore ricerca TMDb");
  const data = await res.json();
  return data.results
    .filter(item => item.media_type === "movie" || item.media_type === "tv")
    .slice(0, 8);
}

async function getTitleDetailsTMDb(id, mediaType) {
  const url = `${TMDB_PROXY_BASE}/${mediaType}/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Errore dettagli TMDb");
  return await res.json();
}

function showTmdbResults(items) {
  const container = document.getElementById("tmdb-results");
  if (!container) return;

  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = '<div style="padding: 12px; color: #666;">Nessun risultato trovato</div>';
    container.style.display = "block";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.style.cssText = "display:flex; gap:12px; padding:12px; border:1px solid #444; border-radius:8px; margin-bottom:8px; cursor:pointer; background:#2a2a2a;";

    const title = item.title || item.name || "Titolo sconosciuto";
    const date = item.release_date || item.first_air_date || "";
    const year = date ? date.slice(0, 4) : "?";
    const typeLabel = item.media_type === "tv" ? "Serie TV" : "Film";

    const overview = item.overview
      ? item.overview.slice(0, 120) + (item.overview.length > 120 ? "..." : "")
      : "Nessuna descrizione disponibile";

    const posterHtml = item.poster_path
      ? `<img src="${TMDB_IMAGE_BASE}${item.poster_path}" style="width:60px; height:90px; object-fit:cover; border-radius:4px;">`
      : `<div style="width:60px; height:90px; background:#333; display:flex; align-items:center; justify-content:center; color:#666; font-size:12px;">No Poster</div>`;

    div.innerHTML = `
      ${posterHtml}
      <div style="flex:1;">
        <strong style="color:white; display:block;">${title} (${year})</strong>
        <div style="color:#888; font-size:12px; margin:2px 0 6px;">${typeLabel}</div>
        <div style="color:#aaa; font-size:14px;">${overview}</div>
      </div>
      <button type="button" style="background:#b02a37; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">Seleziona</button>
    `;

    const type = item.media_type === "tv" ? "tv" : "movie";
    div.addEventListener("click", () => selectTmdbTitle(item.id, type));

    const button = div.querySelector("button");
    if (button) {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        selectTmdbTitle(item.id, type);
      });
    }

    container.appendChild(div);
  });

  container.style.display = "block";
}

async function selectTmdbTitle(id, mediaType) {
  try {
    const item = await getTitleDetailsTMDb(id, mediaType);

    const titoloInput = document.getElementById("editTitolo");
    const annoInput = document.getElementById("editAnno");
    const risultatiBox = document.getElementById("tmdb-results");

    tempTmdbId = item.id;
    tempTmdbType = mediaType;
    tempTmdbPoster = item.poster_path ? TMDB_IMAGE_BASE + item.poster_path : null;
    tempTmdbOverview = item.overview || "";
    tempTmdbTagline = item.tagline || "";

    const titolo = item.title || item.name || "";
    const data = item.release_date || item.first_air_date || "";
    const anno = data ? data.slice(0, 4) : "";

    if (titoloInput) titoloInput.value = titolo;
    if (annoInput) annoInput.value = anno;

    const regista = mediaType === "movie"
      ? (item.credits && item.credits.crew
          ? item.credits.crew.find(person => person.job === "Director")
          : null)
      : null;

    const creatori = mediaType === "tv" && item.created_by
      ? item.created_by.map(person => person.name)
      : [];

    editRegistaTags = regista
      ? [regista.name]
      : creatori.length > 0
        ? creatori
        : [];

    renderRegistaTags();

    editAttoriTags = item.credits && item.credits.cast
      ? item.credits.cast.slice(0, 5).map(person => person.name)
      : [];
    renderAttoriTags();

    generiSelezionatiEdit = item.genres ? item.genres.map(g => g.name) : [];
    editGenereValue.textContent = generiSelezionatiEdit.length > 0
      ? generiSelezionatiEdit.join(", ")
      : "Nessuno";

    resetEditGenere.classList.toggle("hidden", generiSelezionatiEdit.length === 0);
    editGenereBlock.classList.toggle("active", generiSelezionatiEdit.length > 0);

    editTipoButtons.forEach(b => b.classList.remove("active"));
    const tipoDaImpostare = mediaType === "tv" ? "serie" : "film";
    tempTipo = tipoDaImpostare;

    editTipoButtons.forEach(btn => {
      if (btn.dataset.tipo === tipoDaImpostare) {
        btn.classList.add("active");
      }
    });

    if (risultatiBox) risultatiBox.style.display = "none";
  } catch (err) {
    console.error(err);
    alert("Errore caricamento dettagli");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tmdbSearchBtn = document.getElementById("tmdb-search-btn");

  if (!tmdbSearchBtn) return;

  tmdbSearchBtn.addEventListener("click", async () => {
    const titoloInput = document.getElementById("editTitolo");
    const query = titoloInput ? titoloInput.value.trim() : "";

    if (!query) {
      alert("Inserisci un titolo da cercare");
      return;
    }

    try {
      const results = await searchTitlesTMDb(query);
      showTmdbResults(results);
    } catch (err) {
      console.error(err);
      alert("Errore nella ricerca TMDb");
    }
  });
});

// --- DATI DEI FILM ---
var films = [];

function loadFromLocalStorage() {
    var saved = localStorage.getItem("myCinemaDB");
    if (!saved) {
        films = [];
        return;
    }

    try {
        films = JSON.parse(saved);

        if (!Array.isArray(films)) {
            films = [];
        }

        films.forEach(f => {
            if (!Array.isArray(f.genere)) f.genere = [];
            if (!Array.isArray(f.regista)) f.regista = [];
            if (!Array.isArray(f.attori)) f.attori = [];
            if (!Array.isArray(f.categoria_personale)) f.categoria_personale = [];
            if (!f.tipo) f.tipo = "film";
            if (!("tmdbId" in f)) f.tmdbId = null;
            if (!("tmdbType" in f)) f.tmdbType = null;
            if (!("poster" in f)) f.poster = null;
            if (!("overview" in f)) f.overview = "";
            if (!("tagline" in f)) f.tagline = "";
            if (!("commento" in f)) f.commento = "";
            if (!("preferito" in f)) f.preferito = false;
            if (!("valutazione" in f)) f.valutazione = null;
            if (!("addedAt" in f)) f.addedAt = Date.now();
        });

    } catch (err) {
        console.error("Errore lettura localStorage:", err);
        films = [];
    }
}

var filters = {
    stato: "",
    preferiti: false,
    generi: [],
    categorie: [],
    registi: [],
    attori: [],
    sort: "",
    query: ""
};

var generiDisponibili = [
    "Azione",
    "Avventura",
    "Animazione",
    "Biografico",
    "Commedia",
    "Documentario",
    "Drammatico",
    "Erotico",
    "Fantascienza",
    "Fantasy",
    "Giallo",
    "Guerra",
    "Horror",
    "Musicale",
    "Noir",
    "Sentimentale",
    "Storico",
    "Thriller",
    "Western",
    "Antologico",
    "Apocalittico",
    "Caper / Heist (Rapine)",
    "Coming-of-Age (Crescita)",
    "Cyberpunk",
    "Distopico",
    "Gangster",
    "Grottesco",
    "Pulp",
    "Slasher",
    "Spionaggio",
    "Splatter",
    "Sportivo",
    "Supereroi",
    "Teen Movie",
];

var editingIndex = -1;
var currentSection = "home";

function activateNav(section) {
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));

    const btn = document.querySelector(`.nav-link[data-section="${section}"]`);
    if (btn) btn.classList.add('active');
}

function goHome() {
    currentSection = "home";
    activateNav("home");

    resetFilters.click();
    applyAllFilters();
}

function goPreferiti() {
    currentSection = "preferiti";
    activateNav("preferiti");

    resetFilters.click();
    applyAllFilters();
}

function goFilm() {
  currentSection = "film";
  activateNav("film");
  resetFilters.click();
  applyAllFilters();
}

function goSerie() {
  currentSection = "serie";
  activateNav("serie");
  resetFilters.click();
  applyAllFilters();
}

document.querySelector('[data-section="home"]').onclick = goHome;
document.getElementById('nav-home').onclick = goHome;
document.querySelector('[data-section="preferiti"]').onclick = goPreferiti;
document.querySelector('[data-section="film"]').onclick = goFilm;
document.querySelector('[data-section="serie"]').onclick = goSerie;

// --- FUNZIONE PER I BOTTONI STATO ---
function setupStateButtons(buttons, film) {
    // sincronizza SEMPRE lo stato visivo all'apertura del modal
    buttons.forEach(btn => {
        btn.classList.remove("active");

        if (btn.dataset.value === film.stato) {
            btn.classList.add("active");
        }

        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove("active"));

            btn.classList.add("active");
            film.stato = btn.dataset.value;

            saveToLocalStorage();
            applyAllFilters();
        };
    });
}

// --- RIFERIMENTI DOM ---
var filmList = document.getElementById("filmList");
var searchInput = document.getElementById("searchInput");
var modal = document.getElementById("modal");
var modalContent = document.getElementById("modalContent");
var sortFilter = document.getElementById("sortFilter");
var resetFilters = document.getElementById("resetFilters");
var tempTmdbId = null;
var tempTmdbType = null;
var tempTmdbPoster = null;
var tempTmdbOverview = "";
var tempTmdbTagline = "";

window.addEventListener("scroll", () => {
    const header = document.getElementById("main-header");

    if (window.scrollY > 10) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

// --- RENDER LISTA FILM ---
function renderFilms(list) {
  filmList.innerHTML = "";

  if (!list || list.length === 0) {
    let emptyTitle = "Nessun titolo trovato";
    let emptyText = "Prova a cambiare i filtri oppure aggiungi un nuovo film o serie TV.";

    if (currentSection === "preferiti") {
      emptyTitle = "Nessun preferito";
      emptyText = "Non hai ancora contrassegnato nessun titolo come preferito.";
    } else if (currentSection === "film") {
      emptyTitle = "Nessun film trovato";
      emptyText = "Non ci sono film che corrispondono ai filtri attuali.";
    } else if (currentSection === "serie") {
      emptyTitle = "Nessuna serie trovata";
      emptyText = "Non ci sono serie TV che corrispondono ai filtri attuali.";
    }

    filmList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎬</div>
        <h3>${emptyTitle}</h3>
        <p>${emptyText}</p>
      </div>
    `;
    return;
  }

  list.forEach(function (film) {
    var card = document.createElement("div");
    card.className = "film-card film-card-enhanced";

    var posterHtml = film.poster
      ? `<img class="film-card-poster" src="${film.poster}" alt="${film.titolo}">`
      : `<div class="film-card-poster no-poster">No Poster</div>`;

    var regista = (film.regista && film.regista.length > 0)
      ? film.regista.join(", ")
      : "Regista non indicato";

    var tipoLabel = film.tipo === "serie" ? "Serie TV" : "Film";

    var statoLabel = film.stato && film.stato.trim() !== ""
      ? film.stato
      : "Da definire";

    var ratingHtml = film.valutazione !== null && film.valutazione !== undefined
      ? `<span class="film-rating">★ ${film.valutazione}/10</span>`
      : "";

    var categories = Array.isArray(film.categoria_personale)
      ? film.categoria_personale
          .map(c => c.trim())
          .filter(c => c !== "")
          .slice(0, 3)
      : [];

    var categoriesHtml = categories.length > 0
      ? categories.map(c => `<span class="tag">${c}</span>`).join("")
      : `<span class="tag tag-muted">Senza categoria</span>`;

    card.innerHTML = `
      <div class="film-card-media">
        ${posterHtml}
        <button type="button" class="favorite-toggle favorite-toggle-card" aria-label="Preferito">
          ${film.preferito ? "⭐" : "☆"}
        </button>
      </div>

      <div class="film-card-body">
        <div class="film-card-top">
          <div class="film-card-heading">
            <h3>${film.titolo}</h3>
            <div class="film-card-meta-line">
              <span class="film-year">${film.anno || "—"}</span>
              <span class="film-type-badge">${tipoLabel}</span>
              ${ratingHtml}
            </div>
          </div>
        </div>

        <p class="film-card-director">di ${regista}</p>

        <div class="film-card-tags">
          ${categoriesHtml}
        </div>

        <div class="film-card-footer">
          <span class="film-status-badge">${statoLabel}</span>
        </div>
      </div>
    `;

    card.onclick = function () {
      var realIndex = films.indexOf(film);
      openModal(film, realIndex);
    };

    card.querySelector(".favorite-toggle").onclick = function (e) {
      e.stopPropagation();
      film.preferito = !film.preferito;
      this.textContent = film.preferito ? "⭐" : "☆";
      saveToLocalStorage();
      applyAllFilters();
    };

    filmList.appendChild(card);
  });
}

function openModal(film, index) {
    editingIndex = index;

    document.getElementById('modalTitoloFilm').textContent = film.titolo + ' (' + film.anno + ')';
    document.getElementById('modalRegista').textContent = (film.regista || []).join(', ') || '-';
    document.getElementById('modalAttori').textContent = (film.attori || []).join(', ') || '-';
    document.getElementById('modalGenere').textContent = (film.genere || []).join(', ') || 'Nessuno';
    document.getElementById('modalCategorie').textContent = (film.categoria_personale || []).join(', ') || '-';
    document.getElementById('modalTipo').textContent = film.tipo === "serie" ? "Serie TV" : "Film";
    document.getElementById('modalCommentInput').value = film.commento || '';

    var modalRatingBtns = document.getElementById("modalRatingBtns");
modalRatingBtns.innerHTML = "";

for (let i = 1; i <= 10; i++) {
    const btn = document.createElement("button");
    btn.className = "rating-btn";
    btn.textContent = i;

    if (film.valutazione === i) {
        btn.classList.add("active");
    }

    btn.onclick = function () {
        setRating(index, i, btn);
    };

    modalRatingBtns.appendChild(btn);
}
    
    setupStateButtons(
    document.querySelectorAll('#modalStatoBtns .stato-btn'),
    films[editingIndex]
);
   
    document.querySelector('.favorite-toggle-modal').onclick = () => {
        film.preferito = !film.preferito;
        document.querySelector('.favorite-toggle-modal').textContent = film.preferito ? '⭐' : '☆';
        saveToLocalStorage();
        applyAllFilters();
    };
    
    document.getElementById('openEditModalBtn').onclick = openEditModalForEditing;
    document.getElementById('btnDeleteFilm').onclick = () => openDeleteModal(editingIndex);
    
    document.getElementById('modalCommentInput').oninput = () => {
        films[editingIndex].commento = document.getElementById('modalCommentInput').value;
        saveToLocalStorage();
    };
    
    modal.classList.remove('hidden');
}

function openEditModalForEditing() {
    var film = films[editingIndex];

    tempTmdbId = film.tmdbId || null;
    tempTmdbType = film.tmdbType || null;
    tempTmdbPoster = film.poster || null;
    tempTmdbOverview = film.overview || "";
    tempTmdbTagline = film.tagline || "";

    editModalTitle.textContent = "Modifica film";

    editTitolo.value = film.titolo;
    editAnno.value = film.anno;
    editRegistaTags = film.regista.slice();
    renderRegistaTags();
    editAttoriTags = film.attori.slice();
    renderAttoriTags();
    generiSelezionatiEdit = film.genere ? film.genere.slice() : [];

    editGenereValue.textContent =
        generiSelezionatiEdit.length > 0 ? generiSelezionatiEdit.join(", ") : "Nessuno";

    if (generiSelezionatiEdit.length > 0) {
        editGenereBlock.classList.add("active");
        resetEditGenere.classList.remove("hidden");
    } else {
        editGenereBlock.classList.remove("active");
        resetEditGenere.classList.add("hidden");
    }

    // categorie
    var cleaned = [];
    if (!film.categoria_personale || film.categoria_personale.length === 0) {
        cleaned = ["Senza categoria"];
    } else {
        cleaned = film.categoria_personale
            .map(c => c.trim())
            .filter(c => c !== "");
        if (cleaned.length === 0) cleaned = ["Senza categoria"];
    }
    editCategorieTags = cleaned.slice();
    renderCategorieTags();

    // 🔥 STATO — reset + applicazione corretta
    editStatoButtons.forEach(b => b.classList.remove("active"));
    editStatoButtons.forEach(btn => {
        if (btn.dataset.value === film.stato) {
            btn.classList.add("active");
        }
    });

    // 🔥 fondamentale: inizializziamo tempStato
    tempStato = film.stato;

    editTipoButtons.forEach(b => b.classList.remove("active"));
editTipoButtons.forEach(btn => {
    if (btn.dataset.tipo === film.tipo) {
        btn.classList.add("active");
    }
});
tempTipo = film.tipo;

    modal.classList.add("hidden");
    editModal.classList.remove("hidden");
    
    setTimeout(() => editTitolo.focus(), 0);
}

function closeModal() {
    modal.classList.add("hidden");
}

// --- AGGIORNAMENTO STATO / VALUTAZIONE / COMMENTO ---
function updateState(index, nuovoStato) {
    films[index].stato = nuovoStato;
    saveToLocalStorage();
    applyAllFilters();
    openModal(films[index], index); // ricarica il modal aggiornato
}

function setRating(index, value, btn) {
    const ratingButtons = document.querySelectorAll('#modalRatingBtns .rating-btn');
    const isSameRating = films[index].valutazione === value;

    if (isSameRating) {
        films[index].valutazione = null;
    } else {
        films[index].valutazione = value;
    }

    saveToLocalStorage();

    ratingButtons.forEach(b => b.classList.remove('active'));

    if (!isSameRating && btn) {
        btn.classList.add('active');
    }

    applyAllFilters();
}

var modalDelete = document.getElementById("modalDelete");
var annullaDelete = document.getElementById("annullaDelete");
var confermaDelete = document.getElementById("confermaDelete");

var deleteIndex = null;

function openDeleteModal(index) {
    deleteIndex = index;

    modalDelete.classList.remove("hidden");

    setTimeout(() => {
        modalDelete.classList.add("fade-in");
        modalDelete.focus();
    }, 10);
}

annullaDelete.onclick = function () {
    modalDelete.classList.remove("fade-in");
    setTimeout(() => {
        modalDelete.classList.add("hidden");
        modal.classList.remove("hidden");
    }, 200);
};

modalDelete.addEventListener("click", function (e) {
    if (e.target === modalDelete) {
        modalDelete.classList.remove("fade-in");
        setTimeout(() => {
            modalDelete.classList.add("hidden");
            closeModal(); // chiude anche il modal dettagli
        }, 200);
    }
});

confermaDelete.onclick = function () {

    const box = document.getElementById("modalDeleteContent");

    // 1. Shake
    box.classList.add("shake");

    // 2. Aspetta che l'animazione finisca (250ms)
    setTimeout(() => {
        box.classList.remove("shake");

        // 3. Ora elimina davvero
        films.splice(deleteIndex, 1);
        saveToLocalStorage();
        applyAllFilters();

        // 4. Chiudi il modal eliminazione
        modalDelete.classList.remove("fade-in");
        setTimeout(() => modalDelete.classList.add("hidden"), 200);

        // 5. Chiudi anche il modal dettagli
        closeModal();

    }, 260);
};

modalDelete.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        e.preventDefault();
        annullaDelete.onclick();
    }
});

modalDelete.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        confermaDelete.click();
    }
});

// --- LOCAL STORAGE ---
function saveToLocalStorage() {
    localStorage.setItem("myCinemaDB", JSON.stringify(films));
}

// --- CATEGORIE PERSONALI ---
function getAllPersonalCategories() {
    var set = {};
    films.forEach(function (film) {
        film.categoria_personale.forEach(function (cat) {
            if (cat.trim() !== "") {   // evita categorie vuote
                set[cat] = true;
            }
        });
    });
    return Object.keys(set);
}

// --- FILTRO STATO (3 BOTTONI) ---
var filtroStato = "";

document.querySelectorAll("#filters .stato-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        // reset visivo
        document.querySelectorAll("#filters .stato-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // aggiorna il filtro
        filtroStato = btn.dataset.value;

        applyAllFilters();
    });
});

// reset filtro stato
resetFilters.onclick = function () {
   applyAllFilters();
};

// --- FILTRO GENERE (MODAL) ---
var modalFiltroGenere = document.getElementById("modalFiltroGenere");
var filtroGenereBlock = document.getElementById("filtroGenereBlock");
var filtroGenereValue = document.getElementById("filtroGenereValue");
var resetFiltroGenere = document.getElementById("resetFiltroGenere");
var annullaFiltroGenere = document.getElementById("annullaFiltroGenere");
var applicaFiltroGenere = document.getElementById("applicaFiltroGenere");
var genereOptions = document.getElementById("genereOptions");
var generiSelezionati = [];
var tempGeneriFiltro = [];

// APRI MODAL
filtroGenereBlock.onclick = function () {
    // copia lo stato attuale
    tempGeneriFiltro = generiSelezionati.slice();
    setTimeout(() => genereSearchInput.focus(), 50);

    // sincronizza i pulsanti
    document.querySelectorAll("#genereOptions .filter-option-btn").forEach(btn => {
        if (tempGeneriFiltro.includes(btn.textContent)) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    modalFiltroGenere.classList.remove("hidden");
    setTimeout(() => modalFiltroGenere.classList.add("fade-in"), 10);
};

// CHIUDI MODAL
function chiudiModalGenere() {
    modalFiltroGenere.classList.remove("fade-in");
    setTimeout(() => modalFiltroGenere.classList.add("hidden"), 200);
}

modalFiltroGenere.addEventListener("click", function (e) {
    if (e.target === modalFiltroGenere) chiudiModalGenere();
});

modalFiltroGenere.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        applicaFiltroGenere.click();
    }
});

annullaFiltroGenere.onclick = function () {
    chiudiModalGenere();
    genereSearchInput.value = "";
};

applicaFiltroGenere.onclick = function () {
    generiSelezionati = tempGeneriFiltro.slice();

    if (generiSelezionati.length === 0) {
        filtroGenereValue.textContent = "Nessuno";
        resetFiltroGenere.classList.add("hidden");
        filtroGenereBlock.classList.remove("active");
        applyAllFilters();
    } else {
        filtroGenereValue.textContent = generiSelezionati.join(", ");
        resetFiltroGenere.classList.remove("hidden");
        filtroGenereBlock.classList.add("active");

        applyAllFilters();
    }

    chiudiModalGenere();
};

// GENERA I PULSANTI
generiDisponibili.forEach(gen => {
    var btn = document.createElement("button");
    btn.className = "filter-option-btn";
    btn.textContent = gen;

    btn.onclick = function () {
        if (tempGeneriFiltro.includes(gen)) {
            tempGeneriFiltro = tempGeneriFiltro.filter(g => g !== gen);
            btn.classList.remove("active");
        } else {
            tempGeneriFiltro.push(gen);
            btn.classList.add("active");
        }
    };

    genereOptions.appendChild(btn);
});

var genereSearchInput = document.getElementById("genereSearchInput");

genereSearchInput.addEventListener("input", function () {
    var query = genereSearchInput.value.toLowerCase();

    document.querySelectorAll("#genereOptions .filter-option-btn").forEach(btn => {
        btn.style.display = btn.textContent.toLowerCase().includes(query)
            ? "block"
            : "none";
    });
});

// RESET
resetFiltroGenere.onclick = function (e) {
    e.stopPropagation();
    generiSelezionati = [];
    filtroGenereValue.textContent = "Nessuno";
    resetFiltroGenere.classList.add("hidden");
    filtroGenereBlock.classList.remove("active");

    document.querySelectorAll("#genereOptions .filter-option-btn")
        .forEach(b => b.classList.remove("active"));

    applyAllFilters();
};

// --- FILTRO CATEGORIA (MODAL) ---
var modalFiltroCategoria = document.getElementById("modalFiltroCategoria");
var filtroCategoriaBlock = document.getElementById("filtroCategoriaBlock");
var filtroCategoriaValue = document.getElementById("filtroCategoriaValue");
var resetFiltroCategoria = document.getElementById("resetFiltroCategoria");
var categoriaOptions = document.getElementById("categoriaOptions");
var categoriaSearchInput = document.getElementById("categoriaSearchInput");
var annullaFiltroCategoria = document.getElementById("annullaFiltroCategoria");
var applicaFiltroCategoria = document.getElementById("applicaFiltroCategoria");

var categorieSelezionate = [];
var tempCategorieFiltro = [];

// APRI MODAL
filtroCategoriaBlock.onclick = function () {
    tempCategorieFiltro = categorieSelezionate.slice();
    renderCategoriaOptions();
    modalFiltroCategoria.classList.remove("hidden");
    setTimeout(() => modalFiltroCategoria.classList.add("fade-in"), 10);
    setTimeout(() => categoriaSearchInput.focus(), 50);
};

// CHIUDI MODAL
function chiudiModalCategoria() {
    modalFiltroCategoria.classList.remove("fade-in");
    setTimeout(() => modalFiltroCategoria.classList.add("hidden"), 200);
    categoriaSearchInput.value = "";
}

modalFiltroCategoria.addEventListener("click", function (e) {
    if (e.target === modalFiltroCategoria) chiudiModalCategoria();
});

modalFiltroCategoria.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        applicaFiltroCategoria.click();
    }
});

annullaFiltroCategoria.onclick = function () {
    chiudiModalCategoria();
    categoriaSearchInput.value = "";
};

// APPLICA
applicaFiltroCategoria.onclick = function () {
    categorieSelezionate = tempCategorieFiltro.slice();

    if (categorieSelezionate.length === 0) {
        filtroCategoriaValue.textContent = "Nessuno";
        resetFiltroCategoria.classList.add("hidden");
        filtroCategoriaBlock.classList.remove("active");
        applyAllFilters();
    } else {
        filtroCategoriaValue.textContent = categorieSelezionate.join(", ");
        resetFiltroCategoria.classList.remove("hidden");
        filtroCategoriaBlock.classList.add("active");
    }
    applyAllFilters();
    chiudiModalCategoria();
};

// RESET
resetFiltroCategoria.onclick = function (e) {
    e.stopPropagation();
    categorieSelezionate = [];
    filtroCategoriaValue.textContent = "Nessuno";
    resetFiltroCategoria.classList.add("hidden");
    filtroCategoriaBlock.classList.remove("active");

    applyAllFilters();
};

// --- BLOCCO REGISTA ---
var filtroRegistaBlock = document.getElementById("filtroRegistaBlock");
var filtroRegistaValue = document.getElementById("filtroRegistaValue");
var resetFiltroRegista = document.getElementById("resetFiltroRegista");

filtroRegistaBlock.onclick = function () {
    modalFiltroRegista.classList.remove("hidden");
    setTimeout(() => modalFiltroRegista.classList.add("fade-in"), 10);
};

resetFiltroRegista.onclick = function (e) {
    e.stopPropagation();

    registiSelezionati = [];
    tempRegistiFiltro = [];

    filtroRegistaValue.textContent = "Nessuno";
    resetFiltroRegista.classList.add("hidden");
    filtroRegistaBlock.classList.remove("active");

    applyAllFilters();
};

// --- BLOCCO ATTORE ---
var filtroAttoreBlock = document.getElementById("filtroAttoreBlock");
var filtroAttoreValue = document.getElementById("filtroAttoreValue");
var resetFiltroAttore = document.getElementById("resetFiltroAttore");

filtroAttoreBlock.onclick = function () {
    modalFiltroAttore.classList.remove("hidden");
    setTimeout(() => modalFiltroAttore.classList.add("fade-in"), 10);
};

resetFiltroAttore.onclick = function (e) {
    e.stopPropagation();

    attoriSelezionati = [];
    tempAttoriFiltro = [];

    filtroAttoreValue.textContent = "Nessuno";
    resetFiltroAttore.classList.add("hidden");
    filtroAttoreBlock.classList.remove("active");

    applyAllFilters();
};

// RENDER CATEGORIE
function renderCategoriaOptions() {
    categoriaOptions.innerHTML = "";
    var tutte = getAllPersonalCategories();

    tutte.forEach(cat => {
        var btn = document.createElement("button");
        btn.className = "filter-option-btn";
        btn.textContent = cat;

        if (tempCategorieFiltro.includes(cat)) btn.classList.add("active");

        btn.onclick = function () {
            if (tempCategorieFiltro.includes(cat)) {
                tempCategorieFiltro = tempCategorieFiltro.filter(c => c !== cat);
                btn.classList.remove("active");
            } else {
                tempCategorieFiltro.push(cat);
                btn.classList.add("active");
            }
        };

        categoriaOptions.appendChild(btn);
    });
}

// RICERCA
categoriaSearchInput.addEventListener("input", function () {
    var query = categoriaSearchInput.value.toLowerCase();

    document.querySelectorAll("#categoriaOptions .filter-option-btn").forEach(btn => {
        btn.style.display = btn.textContent.toLowerCase().includes(query)
            ? "block"
            : "none";
    });
});

/* --- FILTRO REGISTA (MODAL) --- */
var modalFiltroRegista = document.getElementById("modalFiltroRegista");
var filtroRegistaBlock = document.getElementById("filtroRegistaBlock");
var filtroRegistaValue = document.getElementById("filtroRegistaValue");
var resetFiltroRegista = document.getElementById("resetFiltroRegista");
var registaOptions = document.getElementById("registaOptions");
var registaSearchInput = document.getElementById("registaSearchInput");
var annullaFiltroRegista = document.getElementById("annullaFiltroRegista");
var applicaFiltroRegista = document.getElementById("applicaFiltroRegista");

var registiSelezionati = [];
var tempRegistiFiltro = [];

// APRI MODAL
filtroRegistaBlock.onclick = function () {
    tempRegistiFiltro = registiSelezionati.slice();
    renderRegistaOptions();
    modalFiltroRegista.classList.remove("hidden");
    setTimeout(() => modalFiltroRegista.classList.add("fade-in"), 10);
    setTimeout(() => registaSearchInput.focus(), 50);
};

// CHIUDI MODAL
function chiudiModalRegista() {
    modalFiltroRegista.classList.remove("fade-in");
    setTimeout(() => modalFiltroRegista.classList.add("hidden"), 200);
    registaSearchInput.value = "";
}

modalFiltroRegista.addEventListener("click", function (e) {
    if (e.target === modalFiltroRegista) chiudiModalRegista();
});

modalFiltroRegista.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        applicaFiltroRegista.click();
    }
    if (e.key === "Escape") {
        chiudiModalRegista();
    }
});

annullaFiltroRegista.onclick = function () {
    chiudiModalRegista();
};

// APPLICA
applicaFiltroRegista.onclick = function () {
    registiSelezionati = tempRegistiFiltro.slice();

    filtroRegistaValue.textContent =
        registiSelezionati.length > 0 ? registiSelezionati[0] : "Nessuno";

    resetFiltroRegista.classList.toggle("hidden", registiSelezionati.length === 0);
    filtroRegistaBlock.classList.toggle("active", registiSelezionati.length > 0);

    applyAllFilters();
    chiudiModalRegista();
};

// GENERA I PULSANTI
function renderRegistaOptions() {
    registaOptions.innerHTML = "";

    var tutti = [...new Set(films.flatMap(f => f.regista))];

    tutti.forEach(reg => {
        var btn = document.createElement("button");
        btn.className = "filter-option-btn";
        btn.textContent = reg;

        if (tempRegistiFiltro.includes(reg)) btn.classList.add("active");

        btn.onclick = function () {

    var index = tempRegistiFiltro.indexOf(reg);

    if (index === -1) {
        tempRegistiFiltro.push(reg);
        btn.classList.add("active");
    } else {
        tempRegistiFiltro.splice(index, 1);
        btn.classList.remove("active");
    }

};

        registaOptions.appendChild(btn);
    });
}

// RICERCA
registaSearchInput.addEventListener("input", function () {
    var query = registaSearchInput.value.toLowerCase();

    document.querySelectorAll("#registaOptions .filter-option-btn").forEach(btn => {
        btn.style.display = btn.textContent.toLowerCase().includes(query)
            ? "block"
            : "none";
    });
});

/* --- FILTRO ATTORE (MODAL) --- */
var modalFiltroAttore = document.getElementById("modalFiltroAttore");
var filtroAttoreBlock = document.getElementById("filtroAttoreBlock");
var filtroAttoreValue = document.getElementById("filtroAttoreValue");
var resetFiltroAttore = document.getElementById("resetFiltroAttore");
var attoreOptions = document.getElementById("attoreOptions");
var attoreSearchInput = document.getElementById("attoreSearchInput");
var annullaFiltroAttore = document.getElementById("annullaFiltroAttore");
var applicaFiltroAttore = document.getElementById("applicaFiltroAttore");

var attoriSelezionati = [];
var tempAttoriFiltro = [];

// APRI MODAL
filtroAttoreBlock.onclick = function () {
    tempAttoriFiltro = attoriSelezionati.slice();
    renderAttoreOptions();
    modalFiltroAttore.classList.remove("hidden");
    setTimeout(() => modalFiltroAttore.classList.add("fade-in"), 10);
    setTimeout(() => attoreSearchInput.focus(), 50);
};

// CHIUDI MODAL
function chiudiModalAttore() {
    modalFiltroAttore.classList.remove("fade-in");
    setTimeout(() => modalFiltroAttore.classList.add("hidden"), 200);
    attoreSearchInput.value = "";
}

modalFiltroAttore.addEventListener("click", function (e) {
    if (e.target === modalFiltroAttore) chiudiModalAttore();
});

modalFiltroAttore.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        applicaFiltroAttore.click();
    }
    if (e.key === "Escape") {
        chiudiModalAttore();
    }
});

annullaFiltroAttore.onclick = function () {
    chiudiModalAttore();
};

// APPLICA
applicaFiltroAttore.onclick = function () {
    attoriSelezionati = tempAttoriFiltro.slice();

    filtroAttoreValue.textContent =
        attoriSelezionati.length > 0 ? attoriSelezionati[0] : "Nessuno";

    resetFiltroAttore.classList.toggle("hidden", attoriSelezionati.length === 0);
    filtroAttoreBlock.classList.toggle("active", attoriSelezionati.length > 0);

    applyAllFilters();
    chiudiModalAttore();
};

// GENERA I PULSANTI
function renderAttoreOptions() {
    attoreOptions.innerHTML = "";

    var tutti = [...new Set(films.flatMap(f => f.attori))];

    tutti.forEach(att => {
        var btn = document.createElement("button");
        btn.className = "filter-option-btn";
        btn.textContent = att;

        if (tempAttoriFiltro.includes(att)) btn.classList.add("active");

        btn.onclick = function () {

    var index = tempAttoriFiltro.indexOf(att);

    if (index === -1) {
        tempAttoriFiltro.push(att);
        btn.classList.add("active");
    } else {
        tempAttoriFiltro.splice(index, 1);
        btn.classList.remove("active");
    }

};

        attoreOptions.appendChild(btn);
    });
}

// RICERCA
attoreSearchInput.addEventListener("input", function () {
    var query = attoreSearchInput.value.toLowerCase();

    document.querySelectorAll("#attoreOptions .filter-option-btn").forEach(btn => {
        btn.style.display = btn.textContent.toLowerCase().includes(query)
            ? "block"
            : "none";
    });
});

// --- FILTRI AVANZATI ---
function populateAdvancedFilters() {
    var registi = {};
    var attori = {};

    films.forEach(function (f) {
        f.regista.forEach(function (r) { registi[r] = true; });
        f.attori.forEach(function (a) { attori[a] = true; });
    });
}

function applyAllFilters() {
    let base = films;

    // sezione Preferiti → la base diventa solo i preferiti
    if (currentSection === "preferiti") {
        base = base.filter(f => f.preferito === true);
    }
    
    if (currentSection === "film") {
        base = base.filter(f => f.tipo === "film");
    } else if (currentSection === "serie") {
        base = base.filter(f => f.tipo === "serie");
  }

    let result = base.slice();

    // 1. STATO
    if (filtroStato) {
        result = result.filter(f => f.stato === filtroStato);
    }

    // 2. GENERE (OR interno)
    if (generiSelezionati.length > 0) {
        result = result.filter(f =>
            f.genere.some(g => generiSelezionati.includes(g))
        );
    }

    // 3. CATEGORIA (OR interno)
    if (categorieSelezionate.length > 0) {
        result = result.filter(f =>
            f.categoria_personale.some(c => categorieSelezionate.includes(c))
        );
    }

    // 4. FILTRI AVANZATI
    var sort = sortFilter.value;
    if (!sort) sort = "addedAt-desc";  // default se vuoto
    var query = searchInput.value.toLowerCase();

    // 4a. REGISTA
    if (registiSelezionati.length > 0) {
        result = result.filter(f =>
            f.regista.some(r => registiSelezionati.includes(r))
        );
    }

    // 4b. ATTORI
    if (attoriSelezionati.length > 0) {
        result = result.filter(f =>
            f.attori.some(a => attoriSelezionati.includes(a))
        );
    }

    if (query) {
        result = result.filter(f =>
            f.titolo.toLowerCase().includes(query) ||
            (f.regista || []).join(" ").toLowerCase().includes(query) ||
            (f.attori || []).join(" ").toLowerCase().includes(query)
        );
    }

    // 5. ORDINAMENTO
    if (sort === "addedAt-desc") {
    result.sort(function (a, b) {
        return (b.addedAt || 0) - (a.addedAt || 0);
    });
} else if (sort === "addedAt-asc") {
    result.sort(function (a, b) {
        return (a.addedAt || 0) - (b.addedAt || 0);
    });
} else if (sort === "titolo-asc") {
    result.sort(function (a, b) {
        return a.titolo.localeCompare(b.titolo);
    });
} else if (sort === "titolo-desc") {
    result.sort(function (a, b) {
        return b.titolo.localeCompare(a.titolo);
    });
} else if (sort === "anno-desc") {
    result.sort(function (a, b) {
        return b.anno - a.anno;
    });
} else if (sort === "anno-asc") {
    result.sort(function (a, b) {
        return a.anno - b.anno;
    });
} else if (sort === "valutazione-desc") {
    result.sort(function (a, b) {
        var va = (a.valutazione === null || a.valutazione === undefined) ? -1 : a.valutazione;
        var vb = (b.valutazione === null || b.valutazione === undefined) ? -1 : b.valutazione;
        return vb - va;
    });
} else if (sort === "valutazione-asc") {
    result.sort(function (a, b) {
        var va = (a.valutazione === null || a.valutazione === undefined) ? 999 : a.valutazione;
        var vb = (b.valutazione === null || b.valutazione === undefined) ? 999 : b.valutazione;
        return va - vb;
    });
}
    
    renderFilms(result);
}

// --- EVENTI ---
searchInput.addEventListener("input", function () {
    applyAllFilters();
});

sortFilter.addEventListener("change", function () {
    applyAllFilters();
});

resetFilters.addEventListener("click", function () {

    document.querySelectorAll('.filter-btn.active-filter')
        .forEach(b => b.classList.remove('active-filter'));

    sortFilter.value = "addedAt-desc";
    sortFilter.dispatchEvent(new Event('change'));
    searchInput.value = "";
    
    // reset stato → rimuovi active da tutti
document.querySelectorAll("#statoButtons .stato-btn")
    .forEach(b => b.classList.remove("active"));

// simula click su "Tutti"
const btnTutti = document.querySelector('#statoButtons .stato-btn[data-value=""]');
if (btnTutti) btnTutti.click();   
    
    // reset UI del blocco Genere
    filtroGenereValue.textContent = "Nessuno";
    resetFiltroGenere.classList.add("hidden");
    filtroGenereBlock.classList.remove("active");

    generiSelezionati = [];
    tempGeneriFiltro = [];
    document.querySelectorAll("#genereOptions .filter-option-btn")
        .forEach(b => b.classList.remove("active"));

    // reset Categoria
    filtroCategoriaValue.textContent = "Nessuno";
    resetFiltroCategoria.classList.add("hidden"); 
    filtroCategoriaBlock.classList.remove("active");

    categorieSelezionate = [];
    tempCategorieFiltro = [];
    document.querySelectorAll("#categoriaOptions .filter-option-btn")
        .forEach(b => b.classList.remove("active"));
    
    // reset regista
    filtroRegistaValue.textContent = "Nessuno";
    resetFiltroRegista.classList.add("hidden");
    filtroRegistaBlock.classList.remove("active");
    registiSelezionati = [];

    // reset attore 
    filtroAttoreValue.textContent = "Nessuno";
    resetFiltroAttore.classList.add("hidden");
    filtroAttoreBlock.classList.remove("active");
    attoriSelezionati = [];

    applyAllFilters();
});

// --- MODAL AGGIUNTA FILM ---
var editModal = document.getElementById("editModal");
var addFilmBtn = document.getElementById("addFilmBtn");

addFilmBtn.onclick = function () {
    editingIndex = -1;
    editModalTitle.textContent = "Aggiungi film";

    // reset campi
    editTitolo.value = "";
    editAnno.value = "";
    editRegistaTags = [];
    renderRegistaTags();
    editAttoriTags = [];
    renderAttoriTags();
    editCategorieTags = [];
    renderCategorieTags();
    generiSelezionatiEdit = [];
    editGenereValue.textContent = "Nessuno";
    editGenereBlock.classList.remove("active");
    resetEditGenere.classList.add("hidden");

    // reset stato PRIMA di aprire il modal
    editStatoButtons.forEach(b => b.classList.remove("active"));
    tempStato = null;

    // reset tipo PRIMA di aprire il modal
    editTipoButtons.forEach(b => b.classList.remove("active"));
    tempTipo = null;

    tempTmdbId = null;
    tempTmdbType = null;
    tempTmdbPoster = null;
    tempTmdbOverview = "";
    tempTmdbTagline = "";

    editModal.classList.remove("hidden");

    setTimeout(() => editTitolo.focus(), 0);
};

var editModalTitle = document.getElementById("editModalTitle");

function reopenDetailsModal() {
    if (editingIndex !== -1) {
        openModal(films[editingIndex], editingIndex);
    }
}

document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;

    // 🔒 BLOCCA ESC se è aperto il modal di eliminazione
    if (!modalDelete.classList.contains("hidden")) return;

    // 1. Se è aperto il modal editor → chiudi SOLO quello
    if (!editModal.classList.contains("hidden")) {
        editModal.classList.add("hidden");
reopenDetailsModal();
return;
    }

    // 2. Se è aperto il modal genere (editor)
    if (!modalEditGenere.classList.contains("hidden")) {
        chiudiModalEditGenere();
        return;
    }

    // 3. Se è aperto il filtro stato
    if (!modalFiltroStato.classList.contains("hidden")) {
        chiudiModalStato();
        return;
    }

    // 4. Se è aperto il filtro genere
    if (!modalFiltroGenere.classList.contains("hidden")) {
        chiudiModalGenere();
        return;
    }

    // 5. Se è aperto il filtro categoria
    if (!modalFiltroCategoria.classList.contains("hidden")) {
        chiudiModalCategoria();
        return;
    }

    // 6. Se è aperto il modal dettagli
    if (!modal.classList.contains("hidden")) {
        closeModal();
        return;
    }
});

var editTitolo = document.getElementById("editTitolo");
var editAnno = document.getElementById("editAnno");
var editStatoButtons = document.querySelectorAll("#editStatoButtons .stato-btn");
var editTipoButtons = document.querySelectorAll("#editTipoButtons .tipo-btn");
var tempTipo = null;

editStatoButtons.forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
});

editTipoButtons.forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
});

editStatoButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        editStatoButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        tempStato = btn.dataset.value;
    });
});

editTipoButtons.forEach(btn =>
    btn.addEventListener("click", () => {
        editTipoButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        tempTipo = btn.dataset.tipo;
    })
);

var editRegistaTagsContainer = document.getElementById("editRegistaTags");
var editRegistaInput = document.getElementById("editRegistaInput");
var editRegistaTags = [];

var editAttoriTagsContainer = document.getElementById("editAttoriTags");
var editAttoriInput = document.getElementById("editAttoriInput");
var editAttoriTags = [];

var editCategorieTagsContainer = document.getElementById("editCategorieTags");
var editCategorieInput = document.getElementById("editCategorieInput");
var editCategorieTags = [];

var saveFilmBtn = document.getElementById("saveFilmBtn");
saveFilmBtn.onclick = function () {

    // --- STATO OBBLIGATORIO ---
    var statoSelezionato = null;
    editStatoButtons.forEach(btn => {
        if (btn.classList.contains("active")) {
            statoSelezionato = btn.dataset.value;
        }
    });

    if (!statoSelezionato) {
        alert("Seleziona uno stato (Visto, Da vedere o Rivedere).");
        return;
    }

    // --- TIPO OBBLIGATORIO ---
    if (!tempTipo) {
        alert('Seleziona se è "Film" o "Serie TV".');
        return;
    }    

    // --- MODALITÀ AGGIUNTA ---
    if (editingIndex === -1) {
        var nuovoFilm = {
            titolo: editTitolo.value.trim(),
            anno: Number(editAnno.value),
            regista: editRegistaTags.slice(),
            attori: editAttoriTags.slice(),
            categoria_personale: editCategorieTags.slice(),
            genere: generiSelezionatiEdit.slice(),
            stato: statoSelezionato,
            tipo: tempTipo, 
            tmdbId: tempTmdbId,
            tmdbType: tempTmdbType,
            poster: tempTmdbPoster,
            overview: tempTmdbOverview,
            tagline: tempTmdbTagline,
            valutazione: null,
            commento: "",
            addedAt: Date.now()
        };

        films.push(nuovoFilm);
        saveToLocalStorage();
        applyAllFilters();
        editModal.classList.add("hidden");
        return;
    }

    // --- MODALITÀ MODIFICA ---
    var film = films[editingIndex];

    film.titolo = editTitolo.value.trim();
    film.anno = Number(editAnno.value);
    film.regista = editRegistaTags.slice();
    film.attori = editAttoriTags.slice();
    film.categoria_personale = editCategorieTags.slice();
    film.genere = generiSelezionatiEdit.slice();
    film.stato = statoSelezionato;
    film.tipo = tempTipo;
    film.tmdbId = tempTmdbId;
    film.tmdbType = tempTmdbType;
    film.poster = tempTmdbPoster;
    film.overview = tempTmdbOverview;
    film.tagline = tempTmdbTagline;

    saveToLocalStorage();
    applyAllFilters();
    editModal.classList.add("hidden");
};

var cancelEditBtn = document.getElementById("cancelEditBtn");

var editGenereBlock = document.getElementById("editGenereBlock");
var editGenereValue = document.getElementById("editGenereValue");
var resetEditGenere = document.getElementById("resetEditGenere");

var modalEditGenere = document.getElementById("modalEditGenere");
var editGenereOptions = document.getElementById("editGenereOptions");
var annullaEditGenere = document.getElementById("annullaEditGenere");
var applicaEditGenere = document.getElementById("applicaEditGenere");

var generiSelezionatiEdit = [];

// copia temporanea usata dentro il modal
var tempGeneriEdit = [];

// APRI MODAL GENERE (EDITOR)
editGenereBlock.onclick = function () {
    // inizializza la copia temporanea con lo stato attuale
    tempGeneriEdit = generiSelezionatiEdit.slice();

    // sincronizza i pulsanti con tempGeneriEdit
    document.querySelectorAll("#editGenereOptions .filter-option-btn").forEach(btn => {
        if (tempGeneriEdit.includes(btn.textContent)) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    modalEditGenere.classList.remove("hidden");
    modalEditGenere.focus();
    setTimeout(() => modalEditGenere.classList.add("fade-in"), 10);
};

function chiudiModalEditGenere() {
    modalEditGenere.classList.remove("fade-in");
    setTimeout(() => modalEditGenere.classList.add("hidden"), 200);
    genereSearchInput.value = "";
}

// click fuori → chiudi
modalEditGenere.addEventListener("click", function (e) {
    if (e.target === modalEditGenere) chiudiModalEditGenere();
});
modalEditGenere.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        applicaEditGenere.click();
    }
});

// ESC → chiudi SOLO il modal GENERE (editor)
modalEditGenere.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        e.stopPropagation();   // blocca la chiusura del modal principale
        chiudiModalEditGenere();
    }
});

// ANNULLA → scarta tempGeneriEdit
annullaEditGenere.onclick = function () {
    chiudiModalEditGenere();
};

// APPLICA → salva tempGeneriEdit in generiSelezionatiEdit
applicaEditGenere.onclick = function () {
    generiSelezionatiEdit = tempGeneriEdit.slice();

    if (generiSelezionatiEdit.length === 0) {
        editGenereValue.textContent = "Nessuno";
        resetEditGenere.classList.add("hidden");
        editGenereBlock.classList.remove("active");
    } else {
        editGenereValue.textContent = generiSelezionatiEdit.join(", ");
        resetEditGenere.classList.remove("hidden");
        editGenereBlock.classList.add("active");
    }

    chiudiModalEditGenere();
};

generiDisponibili.forEach(gen => {
    var btn = document.createElement("button");
    btn.className = "filter-option-btn";
    btn.textContent = gen;

    btn.onclick = function () {
        if (tempGeneriEdit.includes(gen)) {
            tempGeneriEdit = tempGeneriEdit.filter(g => g !== gen);
            btn.classList.remove("active");
        } else {
            tempGeneriEdit.push(gen);
            btn.classList.add("active");
        }
    };

    editGenereOptions.appendChild(btn);
});

resetEditGenere.onclick = function (e) {
    e.stopPropagation();
    generiSelezionatiEdit = [];
    editGenereValue.textContent = "Nessuno";
    resetEditGenere.classList.add("hidden");
    editGenereBlock.classList.remove("active");

    document.querySelectorAll("#editGenereOptions .filter-option-btn")
        .forEach(b => b.classList.remove("active"));
};

cancelEditBtn.onclick = function () { 
    editModal.classList.add("hidden");
    reopenDetailsModal();
};

function renderCategorieTags() {
    // pulisce tutto tranne l'input
    editCategorieTagsContainer.innerHTML = "";
    
    editCategorieTags.forEach(function (cat, index) {
        var pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = cat;

        var btn = document.createElement("button");
        btn.textContent = "×";
        btn.onclick = function (e) {
            e.stopPropagation();
            editCategorieTags.splice(index, 1);
            renderCategorieTags();
        };

        pill.appendChild(btn);
        editCategorieTagsContainer.appendChild(pill);
    });

    // riaggiunge l'input alla fine
    editCategorieTagsContainer.appendChild(editCategorieInput);
    editCategorieInput.value = "";
}

// quando premi Invio nell'input delle categorie → aggiunge un tag
editCategorieInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        var value = editCategorieInput.value.trim();
        if (!value) return;

        if (editCategorieTags.indexOf(value) === -1) {
            editCategorieTags.push(value);
            renderCategorieTags();
        } else {
            editCategorieInput.value = "";
        }
    }
});

function renderRegistaTags() {
    editRegistaTagsContainer.innerHTML = "";

    editRegistaTags.forEach(function (name, index) {
        var pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = name;

        var btn = document.createElement("button");
        btn.textContent = "×";
        btn.onclick = function (e) {
            e.stopPropagation();
            editRegistaTags.splice(index, 1);
            renderRegistaTags();
        };

        pill.appendChild(btn);
        editRegistaTagsContainer.appendChild(pill);
    });

    editRegistaTagsContainer.appendChild(editRegistaInput);
    editRegistaInput.value = "";
}

editRegistaInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        var value = editRegistaInput.value.trim();
        if (!value) return;

        if (editRegistaTags.indexOf(value) === -1) {
            editRegistaTags.push(value);
            renderRegistaTags();
        } else {
            editRegistaInput.value = "";
        }
    }
});

function renderAttoriTags() {
    editAttoriTagsContainer.innerHTML = "";

    editAttoriTags.forEach(function (name, index) {
        var pill = document.createElement("span");
        pill.className = "tag-pill";
        pill.textContent = name;

        var btn = document.createElement("button");
        btn.textContent = "×";
        btn.onclick = function (e) {
            e.stopPropagation();
            editAttoriTags.splice(index, 1);
            renderAttoriTags();
        };

        pill.appendChild(btn);
        editAttoriTagsContainer.appendChild(pill);
    });

    editAttoriTagsContainer.appendChild(editAttoriInput);
    editAttoriInput.value = "";
}

editAttoriInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        var value = editAttoriInput.value.trim();
        if (!value) return;

        if (editAttoriTags.indexOf(value) === -1) {
            editAttoriTags.push(value);
            renderAttoriTags();
        } else {
            editAttoriInput.value = "";
        }
    }
});

// --- INIZIALIZZAZIONE ---
loadFromLocalStorage();
populateAdvancedFilters();
applyAllFilters();

// --- UX MIGLIORATA: chiusura cliccando fuori dal modal ---
modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
});

editModal.addEventListener("click", function (e) {
    if (e.target === editModal) {
        editModal.classList.add("hidden");
        reopenDetailsModal();
    }
});

// Espongo funzioni globali usate nel modal
window.updateState = updateState;
window.closeModal = closeModal;
