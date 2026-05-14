"use strict";



document.body.classList.add("fade-in-fwd")


function createElementFromHTML(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.childNodes[0];
}



const newFooter = `
    <div class="custom-footer">
        <div class="custom-footer-content">
            <img class="logo-footer" src="/images/uploaded/K_BLANC.png" />
            <a href="/contactus">NOUS CONTACTER</a>
            <div class="social-network-link">
              <a href="https://www.instagram.com/kalibeenne/" class="footer-insta" >
                 <img src="/Themes/Minimal/Content/img/instagram-icon.png" />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61564943751347/" class="footer-insta" >
                 <img src="/Themes/Minimal/Content/img/facebook-icon.png" />
              </a>
              <a href="" class="footer-insta" >
                 <img src="/Themes/Minimal/Content/img/tiktok-icon.png" />
              </a>
            </div>

        </div>
        <div class="custom-footer-content">
            <h2>Plan du site</h2>
            <a href="/">Accueil</a>
            <a href="compose-ta-creme-capillaire-2">Compose ta Kali Creme</a>
            <a href="boutique">Nos coffrets</a>
            <a href="">La marque</a>
            <a href="blog">Blog</a>
            <a href="">Contact</a>
        </div>
        <div class="custom-footer-content">
            <h2>En savoir plus</h2>
            <a href="">Mentions Legales</a>
            <a href="">CGV</a>
            <a href="">Politique de cookie</a>
            <a href="">F.A.Q</a>
            <div class="social-network-link">
              <a href="https://www.europe-guadeloupe.fr/" >
              <img src="/Themes/Minimal/Content/img/Logos_Region-Guadeloupe-Blanc2.png" class="logo-region" />
              </a>
             <a href="https://www.europe-guadeloupe.fr/"  >
              <img src="/Themes/Minimal/Content/img/Logos_Europe-Blanc3-2.png"  class="logo-region" />
              </a>
            </div>
        </div
        </div>

`


document.addEventListener('DOMContentLoaded', async () => {
  // const footer = document.getElementsByClassName('footer-middle')[0];
  // footer?.replaceWith(createElementFromHTML(newFooter));

  window.themeSettings.themeBreakpoint = 4000;
}
);


