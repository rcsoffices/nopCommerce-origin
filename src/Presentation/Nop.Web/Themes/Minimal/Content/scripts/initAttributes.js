"use strict";

const getAttributesElement = document
  .getElementsByClassName("overview")[0]
  .getElementsByClassName("attributes")[0];
async function getComposeAttributes() {
  const response = await fetch(`${location.origin}/api/product/1/attribute`, { mode: "cors", method: "GET" });
  return await response.json();
}
const productAttributePrefix = "product_attribute_";
const buildNewAttributes = (attributes) => {
  const element = `
    <div class="compose-choice">
      <h1>KALI CREME</h1>
      <div class="swiper">
        <div class="swiper-wrapper">
            ${attributes === null || attributes === void 0 ? void 0 : attributes.Data.map((attribute) => {
    const controlId = productAttributePrefix + attribute.Id;
    return `
          <div class="swiper-slide">
                <div class="swiper-style">
                  <h2 class="swiper-subtitle">${attribute.TextPrompt}</h2>
                  <section class="compose-choice">
                    ${attribute.Values.map((value) => `
                          <div>
                            <input id="${controlId + "_" + value.Id}"
                            type="radio" name="${controlId}"
                            value="${value.Id}"
                            checked="${value.IsPreSelected}">
                            <label for="${controlId + "_" + value.Id}">
                              <h2>${value.Name}</h2>
                              <p>Description rapide de la base</p>
                              <a target="_blank">En savoir plus</a>
                            </label>
                          </div>
                        `)}
                  </section>
                </div>
          </div>
              `;
  })}
        </div>
      </div>
      <div class="compose-nav-button">
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
      </div>
    </div>
    `;
  return createElementFromHTML(element);
};
function createElementFromHTML(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  // Change this to div.childNodes to support multiple top-level nodes.
  return div.childNodes[0];
}
async function initAttributes() {
  document.addEventListener('DOMContentLoaded', async () => {
    if (decodeURI(location.pathname).includes('compose-ta')) {
      const requestAttributes = await getComposeAttributes();
      const newAttributesHtml = buildNewAttributes(requestAttributes);
      getAttributesElement.replaceChildren(newAttributesHtml);
      const swiper = new Swiper('.swiper', {
        // Optional parameters
        direction: 'horizontal',

        // If we need pagination
        pagination: {
          el: '.swiper-pagination',
        },

        // Navigation arrows
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      });

    }
  })
};



