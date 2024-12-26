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
            <a href="">NOUS CONTACTER</a>
            <div class="social-network-link">

            </div>
        </div>
        <div class="custom-footer-content">
            <h2>Plan du site</h2>
            <a href="">Accueil</a>
            <a href="">Compose ta Kali Creme</a>
            <a href="">Nos coffrets</a>
            <a href="">La marque</a>
            <a href="">Blog</a>
            <a href="">Contact</a>
        </div>
        <div class="custom-footer-content">
            <h2>En savoir plus</h2>
            <a href="">Mentions Legales</a>
            <a href="">CGV</a>
            <a href="">Politique de cookie</a>
            <a href="">F.A.Q</a>
        </div>
        </div>

`


const submitForm = async () => {
  const form = document.getElementById('questions');
  const formData = new FormData(form);

  const results = {};

  formData.forEach((value, key) => {
    results[key] = value
  });

  document.getElementById("diag-message").innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`question_required_${i}`).innerHTML = "";
    if (!results[i]) {
      document.getElementById("diag-message").innerHTML = "<p> Désolé nous avons besoin d'une info supplémentaire &#x1F623; </p>"
      document.getElementById(`question_required_${i}`).innerHTML = "	&#x1F6A9;"
      return;
    }
  }

  let reponseReseult = { ...results };
  let email = reponseReseult["email"] ?? '';
  delete reponseReseult["email"];
  let responses = Object.values(reponseReseult).join('')


  let responseData = await fetch(`https://${location.host}/api/diagnosticcapillaire/response?questionResp=${responses}&email=${email}`);
  const valueResponse = await responseData.json();


  const outputBox = document.getElementById("resultValue");
  outputBox.innerHTML = valueResponse.Data;
  const dialog = document.getElementById("resultDialog");
  dialog.showModal();


  const closeButton = document.querySelector("dialog button");
  closeButton.addEventListener("click", () => {
    outputBox.innerHTML = "";
    dialog.close();
  });

}



const initQuestion = async () => {
  let questions = await fetch(`https://${location.host}/api/diagnosticcapillaire/questions`);
  const questionData = await questions.json();

  questionData.Data?.map((questionDetails) => {
    document.getElementsByClassName('questions')[0].appendChild(createElementFromHTML(`

              <div class="question">
                <h2 class="diag-subtitle">*  ${questionDetails.question} </h2>
                <div id="question_required_${questionDetails.id}"></div>
                <section class="diag-choice" id="${questionDetails.id}">
                  ${questionDetails.responses.map((response) => `
                          <input id="${questionDetails.id}_${response.id}"
                          type="radio" class="diag-button-input" name="${questionDetails.id}"
                          value="${response.id}"
                          >
                          <label for="${questionDetails.id}_${response.id}">
                            <p>${response.value}</p>

                          </label>
                      `).join('')}
                </section>
              </div>
            `))
  })

  document.getElementsByClassName('questions')[0].appendChild(createElementFromHTML(`
            <div class="question">
                <h2 class="diag-subtitle">Email</h2>
                <section class="diag-choice">
                    <input type="text" class="diag-text-input" name="email" placeholder="(ex:johndoe@kalibeenne.fr)"></textarea>
                </section>
            </div>
            `))
}



document.addEventListener('DOMContentLoaded', async () => {
  const footer = document.getElementsByClassName('footer-middle')[0];
  footer?.replaceWith(createElementFromHTML(newFooter));
  if (location.pathname === '/kalidiag') {
    document.getElementById('ph-title').style.display = 'none';
    await initQuestion()
    document.querySelector('#diag-button').addEventListener('click', () => submitForm())
  }


  window.themeSettings.themeBreakpoint = 4000;
}
);


