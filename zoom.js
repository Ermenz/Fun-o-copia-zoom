// --- Filtra o Zoom do número do Fluig pelo usuário logado e adiciona busca inteligente ---
function setZoomNumFluigFilter() {
    const userLogado = parent.WCMAPI.user; 
    const zoomObj = window["zoomNumFluig"];
    if (!zoomObj || !zoomObj.dataset) return;

    // Pegar grupos do usuário logado
    const c1 = DatasetFactory.createConstraint("colleagueName", userLogado, userLogado, ConstraintType.MUST);
    const dataset = DatasetFactory.getDataset("ds_Amara_Copia", null, [c1], null);

    let gruposUsuario = [];
    if (dataset && dataset.values && dataset.values.length > 0) {
        dataset.values.forEach(row => {
            if (row.groupId) gruposUsuario.push(row.groupId.trim());
        });
    }

    // Ignorar grupos que não dão acesso
    const gruposIgnorar = ["DefaultGroup-1"];
    const gruposUsuarioValidos = gruposUsuario.filter(g => !gruposIgnorar.includes(g));

    console.log("Grupos válidos do usuário logado:", gruposUsuarioValidos.join(", "));

    // Se o usuário não tiver nenhum grupo válido, não mostra nada
    if (gruposUsuarioValidos.length === 0) {
        zoomObj.clear(); // limpa o zoom
        return;
    }

    // Filtrar itens do Zoom
    const allItems = zoomObj.dataset;
    const itensFiltrados = allItems.filter(item => {
        if (!item.txtGruposSolicitante) return false;

        const gruposSolicitante = item.txtGruposSolicitante.split(",").map(g => g.trim());

        // Mostra apenas se houver pelo menos 1 grupo válido em comum
        return gruposSolicitante.some(g => gruposUsuarioValidos.includes(g));
    });

    // Limpa o Zoom e adiciona apenas os itens filtrados
    zoomObj.clear();
    itensFiltrados.forEach(item => zoomObj.addItem(item));

    // Busca inteligente
    const $zoomInput = $("input#zoomNumFluig");
    if ($zoomInput.length) {
        $zoomInput.off("keyup.customFilter").on("keyup.customFilter", function () {
            const termo = $(this).val().toLowerCase();
            const itensFiltradosPorBusca = itensFiltrados.filter(item => {
                return (
                    (item.txtNumFluig && item.txtNumFluig.toString().toLowerCase().includes(termo)) ||
                    (item.zoomFornecedor && item.zoomFornecedor.toLowerCase().includes(termo)) ||
                    (item.zoomResponsavel && item.zoomResponsavel.toLowerCase().includes(termo)) ||
                    (item.codFornecedor && item.codFornecedor.toString().toLowerCase().includes(termo))
                );
            });

            zoomObj.clear();
            itensFiltradosPorBusca.forEach(item => zoomObj.addItem(item));
        });
    }

    // Preenche automaticamente o primeiro item (opcional)
    if (itensFiltrados.length > 0) {
        setSelectedZoomItem({ inputId: 'zoomNumFluig', ...itensFiltrados[0] });
    }
}


// --- Ao carregar a página ---
$(document).ready(() => {
    setTimeout(setZoomNumFluigFilter, 1500);
});





























// --- Função principal de seleção do Zoom ---
function setSelectedZoomItem(selectedItem) {
    const inputId = selectedItem.inputId;

    if (inputId === "zoomNumFluig") {
        console.log("Item selecionado:", selectedItem);

        $("#codNumFluig").val(selectedItem.txtNumFluig || "");
        $("#codFilial").val(selectedItem.codFilial || "");
        $("#codCondicaoPagto").val(selectedItem.codCondicaoPagto || "");
        $("#codFornecedor").val(selectedItem.codFornecedor || "");
        $("#txtLojaFornecedor").val(selectedItem.txtLojaFornecedor || "");
        $("#txtCPFCNPJ").val(selectedItem.txtCPFCNPJ || "");

        $("#cod_aprov").val(selectedItem.cod_aprov || selectedItem.USUARIO || selectedItem.txtCodAprovador || "");
        $("#hid_codUsuario").val(selectedItem.cod_aprov || selectedItem.USUARIO || selectedItem.txtCodAprovador || "");
        $("#limiteAprovador").val(selectedItem.LIMITE || "");

        validarLimiteAprovador();

        setZoomData("zoomFilial", selectedItem.zoomFilial);
        setZoomData("zoomCondicaoPagto", selectedItem.zoomCondicaopagto);
        setZoomData("zoomFornecedor", selectedItem.zoomFornecedor);
        setZoomData("zoomResponsavel", selectedItem.zoomResponsavel);

        if (selectedItem.jsonItens) {
            let itens = JSON.parse(selectedItem.jsonItens);
            $("#tb_produtos tbody tr").not(':first').remove();

            let totalPedido = 0;
            itens.forEach((item, i) => {
                const linha = wdkAddChild('tb_produtos');
                setTimeout(() => {
                    const idx = linha;

                    $("#codProduto___" + idx).val(item.codProduto);
                    $("#zoomProduto___" + idx).val(item.descricao[0] || "").trigger("change");
                    setZoomData("zoomProduto___" + idx, item.descricao[0] || "");

                    $("#unidadeMedida___" + idx).val(item.unidade).attr("title", item.unidade);
                    $("#txtQuantidade___" + idx).val(item.quantidade);
                    $("#txtValorUnitario___" + idx).val(item.valorUnitario);

                    let totalItem = item.valorTotal || (parseFloat(item.quantidade || 0) * parseFloat(item.valorUnitario || 0));
                    if (typeof totalItem === 'number') totalItem = totalItem.toFixed(2).replace('.', ',');
                    $("#txtValorTotal___" + idx).val(totalItem);

                    totalPedido += parseFloat(totalItem.replace(',', '.'));

                    // --- Apenas o campo de zoom do armazém é preenchido ---
                    $("#codArmazem___" + idx).val(item.armazem); // continua preenchendo o campo hidden
                    $("#zoomArmazem___" + idx).val(item.armazem).trigger("change"); // exibe só o código do armazém no zoom
                    setZoomData("zoomArmazem___" + idx, item.armazem); // define o valor do zoom corretamente

                    $("#codCentroCusto___" + idx).val(item.centroCusto);
                    $("#zoomCentroCusto___" + idx).val(item.centroCusto).trigger("change");
                    setZoomData("zoomCentroCusto___" + idx, item.centroCusto);

                    $("#dtEntrega___" + idx).val(item.dtEntrega);

                    reloadZoomFilterValues("zoomArmazem___" + idx, "codUsuario," + parent.WCMAPI.userCode);
                    reloadZoomFilterValues("zoomProduto___" + idx, "armazemPadrao," + item.armazem);

                    atualizarCampoHidden();

                    if (i === itens.length - 1) {
                        $("#txtTotalPedido").val(totalPedido.toFixed(2).replace('.', ','));
                        validarLimiteAprovador();
                    }
                }, 400);
            });
        }
    }

    // --- Responsável ---
    else if (inputId === "zoomResponsavel") {
        $("#cod_aprov").val(selectedItem["USUARIO"]);
        $("#hid_codUsuario").val(selectedItem["USUARIO"]);
        $("#limiteAprovador").val(selectedItem["LIMITE"]);
        validarLimiteAprovador();
    }

    // --- Filial ---
    else if (inputId === "zoomFilial") {
        $("#codFilial").val(selectedItem["CODIGO"]);
        aplicarFiltroFilialResponsavel();
    }

    // --- Fornecedor ---
    else if (inputId.includes('zoomFornecedor')) {
        $("#codFornecedor").val(selectedItem["codigoFornecedor"]);
        $("#txtCPFCNPJ").val(selectedItem["nomeFornecedor"].split('-')[1]);
        $("#txtLojaFornecedor").val(selectedItem["lojaFornecedor"]);
    }

    // --- Condição de Pagamento ---
    else if (inputId.includes('zoomCondicaoPagto')) {
        $("#codCondicaoPagto").val(selectedItem["codCondicaoPgto"]);
    }

    // --- Produto ---
    else if (inputId.includes('zoomProduto')) {
        var index = selectedItem.inputId.split('___')[1];
        $("#codProduto___" + index).val(selectedItem["codProduto"]);
        $("#unidadeMedida___" + index).val(selectedItem["unidadeMedida"]);
        $("#unidadeMedida___" + index).attr("title", selectedItem["descUnidadeMedida"]);
    }

    // --- Armazém ---
    else if (inputId.includes('zoomArmazem')) {
        var index = selectedItem.inputId.split('___')[1];
        $("#codArmazem___" + index).val(selectedItem["codArmazem"]);
        reloadZoomFilterValues("zoomProduto___" + index, "armazemPadrao," + selectedItem["codArmazem"]);
    }
}

// --- Demais funções auxiliares (mantidas iguais ao seu código atual) ---


















// --- Remove item do Zoom ---
function removedZoomItem(removedItem) {
    const inputId = removedItem.inputId;

    if (inputId === "zoomNumFluig") {
        $("#codNumFluig").val('');
        $("#codFilial").val('');
        $("#codCondicaoPagto").val('');
        $("#codFornecedor").val('');
        $("#txtLojaFornecedor").val('');
        $("#txtCPFCNPJ").val('');
        $("#cod_aprov").val('');
        $("#hid_codUsuario").val('');
        $("#limiteAprovador").val('');
        if (window['zoomResponsavel']) window['zoomResponsavel'].clear();
        $('table[tablename=tb_produtos] tbody tr').not(':first').remove();
    }
    else if (inputId === "zoomResponsavel") {
        $("#cod_aprov").val('');
        $("#hid_codUsuario").val('');
        $("#limiteAprovador").val('');
    }
    else if (inputId.includes('zoomFornecedor')) {
        $("#codFornecedor").val('');
        $("#txtCPFCNPJ").val('');
        $("#txtLojaFornecedor").val('');
    }
    else if (inputId.includes('zoomCondicaoPagto')) {
        $("#codCondicaoPagto").val('');
    }
    else if (inputId.includes('zoomCentroCusto')) {
        var index = inputId.split('___')[1];
        $("#codCentroCusto___" + index).val('');
    }
    else if (inputId.includes('zoomProduto')) {
        var index = inputId.split('___')[1];
        $("#codProduto___" + index).val('');
        $("#unidadeMedida___" + index).val('');
        $("#unidadeMedida___" + index).removeAttr("title");
    }
    else if (inputId.includes('zoomArmazem')) {
        var index = inputId.split('___')[1];
        $("#codArmazem___" + index).val('');
        window['zoomProduto___' + index].clear();
        $("#codProduto___" + index).val('');
        $("#unidadeMedida___" + index).val('');
        $("#unidadeMedida___" + index).removeAttr("title");
        reloadZoomFilterValues("zoomArmazem___" + index, "codUsuario," + parent.WCMAPI.userCode);
        reloadZoomFilterValues("zoomProduto___" + index, "armazemPadrao,");
    }
}

// --- Atualiza jsonItens ---
function atualizarCampoHidden() {
    const itens = [];
    $('#tb_produtos tbody tr').each(function() {
        const linha = $(this);
        const codProduto = linha.find('[id^="codProduto___"]').val();
        if (!codProduto) return;

        const quantidade = linha.find('[id^="txtQuantidade___"]').val() || 0;
        const valorUnitario = linha.find('[id^="txtValorUnitario___"]').val() || 0;
        const valorTotal = linha.find('[id^="txtValorTotal___"]').val() || 0;

        itens.push({
            codProduto: codProduto,
            descricao: [linha.find('[id^="zoomProduto___"]').val()],
            quantidade: quantidade,
            unidade: linha.find('[id^="unidadeMedida___"]').val(),
            valorUnitario: valorUnitario,
            valorTotal: valorTotal,
            armazem: linha.find('[id^="codArmazem___"]').val(),
            centroCusto: linha.find('[id^="codCentroCusto___"]').val(),
            dtEntrega: linha.find('[id^="dtEntrega___"]').val()
        });
    });

    $("#jsonItens").val(JSON.stringify(itens));
}

// --- Adiciona item ---
function addItem() {
    const linha = wdkAddChild('tb_produtos');
    reloadZoomFilterValues("zoomArmazem___" + linha, "codUsuario," + parent.WCMAPI.userCode);
    reloadZoomFilterValues("zoomProduto___" + linha, "armazemPadrao," + linha);
    setTimeout(atualizarCampoHidden, 100);
}

// --- Remove item ---
function removeRow(element) {
    fnWdkRemoveChild(element);
    atualizarCampoHidden();
}

// --- Atualiza automaticamente quando campos mudam ---
$(document).on('change keyup blur', '#tb_produtos input', function() {
    atualizarCampoHidden();
});

// --- Utilitários Zoom ---
function setZoomData(zoomId, value) {
    if (window[zoomId] && value) window[zoomId].setValue(value);
    else if (value) setTimeout(() => setZoomData(zoomId, value), 300);
}

function clearZoom(zoomId) {
    if (window[zoomId]) window[zoomId].clear();
}

// --- Valida limite do aprovador ---
function validarLimiteAprovador() {
    var limiteAprovador = parseFloat($("#limiteAprovador").val()) || 0;
    var valorTotal = parseFloat($("#txtTotalPedido").val()) || 0;

    if (limiteAprovador > 0 && valorTotal > 0 && valorTotal > limiteAprovador) {
        $("#cod_aprov").val('');
        $("#hid_codUsuario").val('');
        $("#limiteAprovador").val('');

        if (window['zoomResponsavel']) window['zoomResponsavel'].clear();

        FLUIGC.toast({
            title: 'Limite Insuficiente',
            message: 'O valor total do pedido (R$ ' + valorTotal.toLocaleString('pt-BR',{minimumFractionDigits: 4,maximumFractionDigits: 4}) + ') excede o limite de aprovação do responsável selecionado (R$ ' + limiteAprovador.toLocaleString('pt-BR',{minimumFractionDigits: 4,maximumFractionDigits: 4}) + '). Selecione outro aprovador.',
            type: 'warning'
        });
    }
}
