# saven — Portfolio de Clément Rapin-Vazquez

Site portfolio personnel, statique (HTML/CSS/JS vanilla, sans framework ni build).

- **Menu en bulles** : au survol du logo « saven », 5 bulles rondes apparaissent (Accueil, Projets, Compétences, À propos, Contact). Clic sur le logo = accueil, clic sur une bulle = section.
- **Thème clair/sombre** : fond blanc par défaut, mode sombre inversé (logo noir → blanc). Toggle + détection système + persistance.
- **Bilingue FR/EN** : toggle de langue, contenu doublé.
- **Vues projet plein écran** : chaque projet a son espace dédié (galerie photos, fichiers STL, liens).

## Structure
- `index.html` — page unique (sections + overlays projet)
- `styles.css` — styles (thèmes, menu en bulles, responsive)
- `main.js` — interactions (thème, langue, menu, overlays)
- `assets/` — logo, photos, fichiers STL
- `dua/` — fiche technique DUA (sous-page)
- `ad3m/` — aperçu du site AD3M (sous-page)

## Déploiement
GitHub Pages, branche `main`, racine. URL : https://camu-tw.github.io/
