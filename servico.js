/* =====================================================================
   VVP - CAMADA DE SERVIÇOS (Fase 1)
   Sessão · Carrinho · Catálogo · Pedidos · Consumação de bandas · UI
   Banco: Google Sheets via Apps Script OU modo demonstração (local).
   ===================================================================== */
const VVP = (() => {
  const LS_SESSAO = "vvp_sessao", LS_CARRINHO = "vvp_carrinho",
        LS_PEDIDOS = "vvp_pedidos", LS_TAXA = "vvp_taxa",
        LS_CODIGO = "vvp_codigo", LS_ULTIMO = "vvp_ultimo_pedido";

  /* ---------- utilidades ---------- */
  const moeda = v => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
  const agora = () => new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit" });
  const gerarCodigo = () =>
    VVP_CONFIG.prefixoCodigo + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();

  /* ---------- sessão (perfil ativo) ---------- */
  const getSessao = () => {
    try { return JSON.parse(localStorage.getItem(LS_SESSAO)) || { perfil: null }; }
    catch (e) { return { perfil: null }; }
  };
  const setSessao = p => localStorage.setItem(LS_SESSAO, JSON.stringify(p));
  const perfil = () => getSessao().perfil;
  const ehBanda = () => perfil() === "banda";

  function entrarCliente(mesa) {
    setSessao({ perfil: "cliente", nome: mesa ? "Mesa " + mesa : "Cliente (balcão)", mesa: mesa || "" });
  }
  function entrarBanda(banda, teto) {
    setSessao({
      perfil: "banda", nome: banda.nomeBanda, idBanda: banda.idBanda,
      teto: Number(teto) || 0, dataShow: banda.dataShow, cache: Number(banda.cache) || 0
    });
  }
  const sair = () => { localStorage.removeItem(LS_SESSAO); localStorage.removeItem(LS_CARRINHO); };

  /* ---------- carrinho (RN-08: preço congelado na adição) ---------- */
  const getCarrinho = () => { try { return JSON.parse(localStorage.getItem(LS_CARRINHO)) || []; }
    catch (e) { return []; } };
  const setCarrinho = c => localStorage.setItem(LS_CARRINHO, JSON.stringify(c));
  const codigoAtual = () => {
    let c = localStorage.getItem(LS_CODIGO);
    if (!c) { c = gerarCodigo(); localStorage.setItem(LS_CODIGO, c); }
    return c;
  };
  function adicionarItem(prod, qtd = 1) {
    const c = getCarrinho();
    const ach = c.find(i => i.idProduto === prod.idProduto);
    if (ach) ach.quantidade += qtd;
    else c.push({ idProduto: prod.idProduto, nome: prod.nome,
      precoUnitario: Number(prod.preco), quantidade: qtd });   // preço congelado
    setCarrinho(c); codigoAtual(); return c;
  }
  function alterarQtd(idProduto, delta) {
    let c = getCarrinho();
    const ach = c.find(i => i.idProduto === idProduto);
    if (!ach) return c;
    ach.quantidade += delta;
    if (ach.quantidade <= 0) c = c.filter(i => i.idProduto !== idProduto);
    setCarrinho(c); return c;
  }
  const removerItem = idProduto => {
    setCarrinho(getCarrinho().filter(i => i.idProduto !== idProduto));
  };
  const qtdCarrinho = () => getCarrinho().reduce((s, i) => s + i.quantidade, 0);
  const subtotalCarrinho = () =>
    getCarrinho().reduce((s, i) => s + i.quantidade * Number(i.precoUnitario), 0);
  function limparAposEnvio() {
    setCarrinho([]);
    localStorage.setItem(LS_CODIGO, gerarCodigo());   // próximo pedido já com código novo
  }

  /* ---------- catálogo (demo local ou Google Sheets) ---------- */
  const CATALOGO_DEMO = {
    categorias: [
      { idCategoria: 1, nome: "Chopes e Cervejas", cor: "bebida", ordem: 1 },
      { idCategoria: 2, nome: "Drinks e Coquetéis", cor: "bebida", ordem: 2 },
      { idCategoria: 3, nome: "Porções", cor: "comida", ordem: 3 },
      { idCategoria: 4, nome: "Lanches e Burgers", cor: "comida", ordem: 4 },
      { idCategoria: 5, nome: "Sobremesas", cor: "base", ordem: 5 }
    ],
    produtos: [
      { idProduto: 101, nome: "Chopp Pilsen 300ml", idCategoria: 1, preco: 8.5, disponibilidade: "Disponível", emoji: "🍺" },
      { idProduto: 102, nome: "Chopp Pilsen 500ml", idCategoria: 1, preco: 12, disponibilidade: "Disponível", emoji: "🍺" },
      { idProduto: 103, nome: "IPA Artesanal 355ml", idCategoria: 1, preco: 16, disponibilidade: "Esgotado", emoji: "🍻" },
      { idProduto: 201, nome: "Caipirinha de Limão", idCategoria: 2, preco: 15, disponibilidade: "Disponível", emoji: "🍹" },
      { idProduto: 202, nome: "Drink Tropical 0% Álcool", idCategoria: 2, preco: 14, disponibilidade: "Esgotado", emoji: "🧉" },
      { idProduto: 301, nome: "Batata Frita c/ Cheddar", idCategoria: 3, preco: 28, disponibilidade: "Disponível", emoji: "🍟" },
      { idProduto: 302, nome: "Calabresa Acebolada", idCategoria: 3, preco: 34, disponibilidade: "Disponível", emoji: "🍖" },
      { idProduto: 303, nome: "Frango a Passarinho", idCategoria: 3, preco: 36, disponibilidade: "Disponível", emoji: "🍗" },
      { idProduto: 401, nome: "X-Burger da Casa", idCategoria: 4, preco: 26, disponibilidade: "Disponível", emoji: "🍔" },
      { idProduto: 402, nome: "X-Bacon Duplo", idCategoria: 4, preco: 29, disponibilidade: "Disponível", emoji: "🍔" },
      { idProduto: 403, nome: "Combo Show (Burger + Fritas)", idCategoria: 4, preco: 39.9, disponibilidade: "Disponível", emoji: "🍱" },
      { idProduto: 501, nome: "Petit Gâteau", idCategoria: 5, preco: 18, disponibilidade: "Disponível", emoji: "🍫" }
    ],
    bandas: [
      { idBanda: 1, nomeBanda: "Banda Forró da Serra", contato: "João", dataShow: "05/09/2026", cache: 1500 },
      { idBanda: 2, nomeBanda: "Samba & Chopp", contato: "Maria", dataShow: "12/09/2026", cache: 1800 }
    ],
    consumacoes: [                       // RF-23: teto por banda/show
      { idConsumacao: 1, idBanda: 1, valorTeto: 300 },
      { idConsumacao: 2, idBanda: 2, valorTeto: 250 }
    ]
  };

  let _cat = null;
  async function pedir(acao, corpo) {
    if (!VVP_CONFIG.appsScriptUrl) throw new Error("SEM_PONTE");
    const r = await fetch(VVP_CONFIG.appsScriptUrl, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ acao: acao }, corpo || {}))
    });
    const t = await r.text();
    try { return JSON.parse(t); } catch (e) { throw new Error("Resposta inválida da planilha."); }
  }
  async function carregarCatalogo() {
    if (_cat) return _cat;
    if (VVP_CONFIG.appsScriptUrl) {
      try { const d = await pedir("catalogo"); if (d && d.ok) { _cat = d.dados; return _cat; } }
      catch (e) { /* cai no demo */ }
    }
    _cat = CATALOGO_DEMO;
    return _cat;
  }
  const tetoDaBanda = (cat, idBanda) => {
    const c = (cat.consumacoes || []).find(x => Number(x.idBanda) === Number(idBanda));
    return c ? Number(c.valorTeto) || 0 : 0;
  };

  /* ---------- taxa de serviço (RF-28) ---------- */
  const obterTaxa = () => {
    const t = localStorage.getItem(LS_TAXA);
    return t == null ? Number(VVP_CONFIG.taxaServicoPadrao) : Number(t);
  };
  const definirTaxa = v => localStorage.setItem(LS_TAXA, String(v));

  /* ---------- pedidos (RN-09: Google Sheets na Fase 1) ---------- */
  const pedidosLocais = () => { try { return JSON.parse(localStorage.getItem(LS_PEDIDOS)) || [];
    } catch (e) { return []; } };
  const salvarPedidosLocais = l => localStorage.setItem(LS_PEDIDOS, JSON.stringify(l));

  async function registrarPedido(cab) {          // cab: perfil/nome/mesa/modalidade/idBanda
    const itens = getCarrinho();
    if (!itens.length) throw new Error("Carrinho vazio (RN-01).");
    const pedido = Object.assign({
      codigo: codigoAtual(), datahora: agora(), status: "Recebido",
      modalidade: "Balcao", mesa: "", idBanda: null, nomeBanda: "",
      taxa: 0, subtotal: 0, valorTaxa: 0, valorTotal: 0, itens
    }, cab);
    pedido.subtotal = +itens.reduce((s, i) => s + i.quantidade * Number(i.precoUnitario), 0).toFixed(2);
    pedido.taxa = pedido.modalidade === "Mesa" ? obterTaxa() : 0;     // RN-02
    pedido.valorTaxa = +(pedido.subtotal * pedido.taxa / 100).toFixed(2);
    pedido.valorTotal = +(pedido.subtotal + pedido.valorTaxa).toFixed(2);

    if (VVP_CONFIG.appsScriptUrl) await pedir("salvar_pedido", { pedido });
    else { const l = pedidosLocais(); l.push(pedido); salvarPedidosLocais(l); }

    localStorage.setItem(LS_ULTIMO, pedido.codigo);
    limparAposEnvio();
    const consumo = pedido.perfil === "banda" ? calcularConsumo(false) : null;
    return { pedido, consumo };
  }

  async function listarPedidos() {
    if (VVP_CONFIG.appsScriptUrl) {
      try { const d = await pedir("pedidos"); if (d && d.ok) return d.dados; } catch (e) {}
    }
    return pedidosLocais().slice().reverse();
  }
  async function atualizarStatus(codigo, status) {
    if (VVP_CONFIG.appsScriptUrl) return pedir("status", { codigo, status });
    const l = pedidosLocais(); const p = l.find(x => x.codigo === codigo);
    if (p) { p.status = status; salvarPedidosLocais(l); }
  }

  /* ---------- consumação da banda (RF-23 a RF-27 / RN-04 e RN-05) ---------- */
  function calcularConsumo(comPrevisao) {
    const s = getSessao();
    if (!s || s.perfil !== "banda" || !s.idBanda) return null;
    const enviados = pedidosLocais().filter(p =>
      p.perfil === "banda" && Number(p.idBanda) === Number(s.idBanda));
    const consumido = +enviados.reduce((sm, p) => sm + Number(p.subtotal || 0), 0).toFixed(2);
    const teto = Number(s.teto) || 0;
    const saldo = +(teto - consumido).toFixed(2);
    const excedente = saldo < 0 ? Math.abs(saldo) : 0;
    const r = { teto, consumido, saldo, excedente };
    if (comPrevisao) {                       // inclui o carrinho atual (pré-envio)
      const prev = +(consumido + subtotalCarrinho()).toFixed(2);
      r.previsao = prev;
      r.excedentePrevisao = prev > teto ? +(prev - teto).toFixed(2) : 0;
    }
    return r;
  }

  /* ---------- UI helpers ---------- */
  function toast(msg, ok = true) {
    const t = document.createElement("div");
    t.className = "toast";
    t.style.borderColor = ok ? "var(--destaque)" : "var(--alerta)";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function bip() {
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const c = new C(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = 880;
      g.gain.setValueAtTime(0.06, c.currentTime); o.start();
      o.stop(c.currentTime + 0.15);
    } catch (e) {}
  }
  const aplicarTema = cor => { document.body.dataset.tema = cor || "base"; };

  return {
    moeda, agora, gerarCodigo, toast, bip, aplicarTema,
    getSessao, setSessao, entrarCliente, entrarBanda, sair, perfil, ehBanda,
    getCarrinho, adicionarItem, alterarQtd, removerItem,
    qtdCarrinho, subtotalCarrinho, codigoAtual, limparAposEnvio,
    carregarCatalogo, tetoDaBanda, obterTaxa, definirTaxa,
    registrarPedido, listarPedidos, atualizarStatus, calcularConsumo
  };
})();
