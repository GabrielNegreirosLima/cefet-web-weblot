import inicializaGaleria from './galeria.js';
import html from './templating.js';
import MusicPlayer from './player.js';
import { currifica } from './programacao-funcional.js';

const galleryEl = document.querySelector('main');
const progressoEl = document.querySelector('#progresso-carregamento');
const progresso = {
  imagensBaixadas: 0,
  totalImagens: null,
  get valor() {
    return Math.ceil(this.imagensBaixadas / this.totalImagens * 100);
  }
};

function notificaImagemBaixada() {
  progresso.imagensBaixadas++;
  progressoEl.value = progresso.valor;
  progressoEl.style.setProperty('--value', progresso.valor + '%');
}

function preparaImagens(resultado) {
  const imagens = resultado.apis.map(api => api.screenshot);
  progresso.totalImagens = imagens.length;
  const promessas = imagens.map(imagem => new Promise((resolver, rejeitar) => {
    const imagemForaDaTelaEl = document.createElement('img');
    imagemForaDaTelaEl.onload = () => {
      // determina qual é a "cor média" da imagem de exemplo da API
      const corMedia = ps.color.getImageAverageColor(imagemForaDaTelaEl).toStringRgb();
      // dada a cor média que foi encontrada, verifica se deve aplicar um "tema"
      // escuro, caso a cor média seja mais clara (para dar contraste)
      // para tanto, levamos a cor média do espaço RGB para HSI, e olhamos
      // para I (intensidade) pra ver se está mais para claro (>0.5) ou escuro
      // (<0.5)
      const usarTemaEscuro = toHSI(corMedia.split(','))[2] > 0.5;

      // atualiza o progresso porque esta imagem foi baixada (promessa cumprida)
      notificaImagemBaixada();

      resolver({
        urlImagem: imagem,
        elementoImagem: imagemForaDaTelaEl,
        corMedia,
        usarTemaEscuro
      });
    };
    imagemForaDaTelaEl.src = imagem;
  }));

  const promessaComImagensPreparadas = Promise.all(promessas)
    .then(imagensComCores => {
      resultado.apis = resultado.apis.map(api => {
        const estaImagemNoArrayComputado = imagensComCores.find(imgComCor => imgComCor.urlImagem === api.screenshot);
        api.corMedia = estaImagemNoArrayComputado.corMedia;
        api.usarTemaEscuro = estaImagemNoArrayComputado.usarTemaEscuro;
        api.slug = api.nome.toLowerCase().replace(/\s+/g, '-');
        api.elementoImagem = estaImagemNoArrayComputado.elementoImagem;
        return api;
      });

      return Promise.resolve(resultado);
    });

  return promessaComImagensPreparadas;
}

function adicionaItemGaleria(yearSemester, apiInfo, i) {
  const par = i % 2 === 0;
  const tema = apiInfo.usarTemaEscuro ? 'dark' : '';
  const novoElemento = html`
    <section class="section">
      <div class="middle" style="background-color: rgb(${apiInfo.corMedia})">
        <a href="${apiInfo.paginaInicial}" target="_blank" id="${apiInfo.slug}">
          <img>
        </a>
      </div>
      <div class="${par ? 'right' : 'left'} title ${tema}" style="background-color: rgba(${apiInfo.corMedia}, 0.75)">
        <div class="content">
          <h2>${apiInfo.nome}</h2>
          <p>${apiInfo.breveDescricao}</p>
          <nav>
            <i class="fa fa-file-text"></i> <a href="${apiInfo.paginaInicial}" target="_blank">Demonstração</a>
            <i class="fa fa-code"></i> <a href="https://github.com/fegemo/cefet-web-weblot/tree/${yearSemester}/${apiInfo.paginaInicial}" target="_blank">Código</a>
          </nav>
          <div class="authors">
            <h3>Autores:</h3>
            <ul>
              ${apiInfo.desenvolvedores.map(dev => html`
                <li>
                  <i class="fa fa-github-alt" aria-hidden="true"></i>
                  <a href="https://github.com/$${dev.usuarioGithub}">$${dev.usuarioGithub}</a>
                  <span class="author-name">$${dev.nome}</span>
                </li>
              `)}
            </ul>
          </div>
        </div>
      </div>

      <div class="${par ? 'left' : 'right'} tiles"  style="background-color: rgba(${apiInfo.corMedia}, 0.75)">
        <picture data-browser-name="Chrome" data-supported="${apiInfo.suporteDeNavegadores.chrome ? '👍' : '👎'}" class="browser ${apiInfo.suporteDeNavegadores.chrome ? 'supported' : ''}">
          <img src="assets/icons/chrome.png">
        </picture>
        <picture data-browser-name="Firefox" data-supported="${apiInfo.suporteDeNavegadores.firefox ? '👍' : '👎'}" class="browser ${apiInfo.suporteDeNavegadores.firefox ? 'supported' : ''}">
          <img src="assets/icons/firefox.png">
        </picture>
        <picture data-browser-name="Edge" data-supported="${apiInfo.suporteDeNavegadores.edge ? '👍' : '👎'}" class="browser ${apiInfo.suporteDeNavegadores.edge ? 'supported' : ''}">
          <img src="assets/icons/edge.png">
        </picture>
        <picture data-browser-name="Safari" data-supported="${apiInfo.suporteDeNavegadores.safari ? '👍' : '👎'}" class="browser ${apiInfo.suporteDeNavegadores.safari ? 'supported' : ''}">
          <img src="assets/icons/safari.png">
        </picture>
        <picture data-browser-name="Opera" data-supported="${apiInfo.suporteDeNavegadores.opera ? '👍' : '👎'}" class="browser ${apiInfo.suporteDeNavegadores.opera ? 'supported' : ''}">
          <img src="assets/icons/opera.png">
        </picture>
      </div>
    </section>`;

  galleryEl.innerHTML += novoElemento;
  galleryEl.querySelector(`#${apiInfo.slug}`)
    .replaceChild(apiInfo.elementoImagem, galleryEl.querySelector(`#${apiInfo.slug} img`));
}

function preparaHTML(arquivoApis) {
  const listaDeApis = arquivoApis.apis;

  galleryEl.innerHTML = '';
  listaDeApis.forEach(currifica(adicionaItemGaleria, arquivoApis.semestre));
}

function mostraErro(erro) {
  galleryEl.classList.add('errored');
  galleryEl.innerHTML = `Deu erro!! Descrição: <pre>${erro}</pre>`;
  console.error(erro);
}

fetch('apis.json')
  .then((resultado) => resultado.json())
  .then(preparaImagens)
  .then(preparaHTML)
  .then(inicializaGaleria)
  .catch(mostraErro);

const audioPlayerEl = document.querySelector('#audio .player');
new MusicPlayer(audioPlayerEl, 'assets/tema.mp3', 'A Lenda do Herói', 'Castro Brothers');
