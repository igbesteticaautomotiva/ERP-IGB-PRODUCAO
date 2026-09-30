// ==========================================
// MÓDULO FINANCEIRO
// ==========================================

function abrirModalNovoFinanceiro() {
    document.getElementById('btn-baixar-fin').classList.add('hidden');
    document.getElementById('fin-servicos-container').classList.add('hidden');
    openModal('modal-financeiro');
}

function switchFinTab(tipo) {
    tipoFinanceiroAtual = tipo;
    const tabRec = document.getElementById('tab-receber');
    const tabPag = document.getElementById('tab-pagar');
    const tabBaixas = document.getElementById('tab-baixas');
    const badge = document.getElementById('badge-fin-tipo');
    const btnNovo = document.getElementById('btn-novo-fin');

    tabRec.className = `px-6 py-2 rounded-t-lg text-xs transition-colors ${tipo === 'receber' ? 'tab-active-receber' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;
    tabPag.className = `px-6 py-2 rounded-t-lg text-xs transition-colors ${tipo === 'pagar' ? 'tab-active-pagar' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;
    tabBaixas.className = `px-6 py-2 rounded-t-lg text-xs transition-colors ${tipo === 'baixas' ? 'tab-active-baixas' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`;
    
    if (tipo === 'receber') {
        badge.className = 'text-white text-[10px] px-2 py-1 rounded bg-green-500';
        badge.innerText = 'CONTAS A RECEBER';
        btnNovo.classList.remove('hidden');
    } else if (tipo === 'pagar') {
        badge.className = 'text-white text-[10px] px-2 py-1 rounded bg-red-500';
        badge.innerText = 'CONTAS A PAGAR';
        btnNovo.classList.remove('hidden');
    } else {
        badge.className = 'text-white text-[10px] px-2 py-1 rounded bg-blue-500';
        badge.innerText = 'BAIXAS REALIZADAS';
        btnNovo.classList.add('hidden');
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient) loadFinanceiro(); 
}

function toggleParcelas() {
    const checkbox = document.getElementById('fin-tem-parcelas');
    const inputParcelas = document.getElementById('fin-parcelas');
    const inputIntervalo = document.getElementById('fin-intervalo');
    const selectFormaPagamento = document.getElementById('fin-forma-pagamento');

    if (checkbox.checked) {
        inputParcelas.disabled = false;
        inputParcelas.classList.remove('bg-gray-100', 'text-gray-400');
        inputParcelas.classList.add('bg-white');
        inputParcelas.value = 2; 
        inputParcelas.min = 2;
        
        inputIntervalo.disabled = false;
        inputIntervalo.classList.remove('bg-gray-100', 'text-gray-400');
        inputIntervalo.classList.add('bg-white');

        selectFormaPagamento.value = 'Cartão de Crédito'; 
    } else {
        inputParcelas.disabled = true;
        inputParcelas.classList.add('bg-gray-100', 'text-gray-400');
        inputParcelas.classList.remove('bg-white');
        inputParcelas.value = 1;
        inputParcelas.min = 1;

        inputIntervalo.disabled = true;
        inputIntervalo.classList.add('bg-gray-100', 'text-gray-400');
        inputIntervalo.classList.remove('bg-white');
        inputIntervalo.value = 30;
    }
}

function toggleGrupo(gId) {
    const rows = document.querySelectorAll(`.grupo-child-${gId}`);
    const icon = document.getElementById(`icon-${gId}`);
    let isHidden = false;
    
    rows.forEach(row => {
        if(row.classList.contains('hidden')) {
            row.classList.remove('hidden');
            isHidden = true;
        } else {
            row.classList.add('hidden');
        }
    });
    
    if(isHidden) {
        icon.classList.replace('ph-caret-right', 'ph-caret-down');
    } else {
        icon.classList.replace('ph-caret-down', 'ph-caret-right');
    }
}

async function darBaixa(id, novoStatusBaixa, valorTotalStr) {
    let updateData = { baixado: novoStatusBaixa };
    if (novoStatusBaixa === 'S') {
        updateData.status = 'Pago';
        updateData.valor_pago = parseFloat(valorTotalStr);
    }
    await supabaseClient.from('financeiro').update(updateData).eq('id', id);
    loadFinanceiro();
}

async function darBaixaGrupo(gId, novoStatusBaixa) {
    const { data } = await supabaseClient.from('financeiro').select('id, valor_total').eq('grupo_id', gId).eq('apagado', 'N');
    if (data) {
        for (let p of data) {
            let updateData = { baixado: novoStatusBaixa };
            if (novoStatusBaixa === 'S') {
                updateData.status = 'Pago';
                updateData.valor_pago = p.valor_total;
            }
            await supabaseClient.from('financeiro').update(updateData).eq('id', p.id);
        }
        loadFinanceiro();
    }
}

async function loadFinanceiro() {
    if (!supabaseClient) return;
    const { data: todos, error: errAll } = await supabaseClient.from('financeiro').select('*').eq('apagado', 'N');
    if (!errAll && todos) atualizarResumos(todos);

    let query = supabaseClient.from('financeiro').select('*').eq('apagado', 'N').order('vencimento', { ascending: true });
    
    if (tipoFinanceiroAtual === 'baixas') {
        query = query.eq('baixado', 'S');
    } else {
        query = query.eq('tipo', tipoFinanceiroAtual).eq('baixado', 'N');
    }

    const { data, error } = await query;
    if (error) return console.error('Erro', error);

    const tbody = document.getElementById('tabela-financeiro-body');
    tbody.innerHTML = '';
    document.getElementById('pesquisa-financeiro').value = '';

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-folder-open text-4xl mb-3 text-gray-300"></i>
                        <p>Nenhuma informação cadastrada.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const grupos = {};
    data.forEach(item => {
        const gId = item.grupo_id || item.id;
        if(!grupos[gId]) grupos[gId] = [];
        grupos[gId].push(item);
    });

    Object.keys(grupos).forEach(gId => {
        const itens = grupos[gId];
        itens.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
        
        const numParcelas = itens.length;
        const baseItem = itens[0];

        if (numParcelas === 1) {
            const item = baseItem;
            let displayStatus = item.status;
            let badgeCor = item.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
            let corValor = item.tipo === 'receber' ? 'text-green-600' : 'text-red-600';
            let iconeTipo = item.tipo === 'receber' ? '<i class="ph ph-arrow-circle-up text-green-500 mr-1"></i>' : '<i class="ph ph-arrow-circle-down text-red-500 mr-1"></i>';
            
            if (item.baixado === 'S') {
                displayStatus = 'Baixado';
                badgeCor = 'bg-blue-100 text-blue-700';
            }

            let servicosRow = item.servicos ? `<span class="block text-[10px] text-gray-500 uppercase mt-0.5 truncate max-w-[200px]" title="${item.servicos}">${item.servicos}</span>` : '';

            tbody.innerHTML += `
                <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-4 text-center"></td>
                    <td class="py-3 px-4 text-gray-900">${item.vencimento.split('-').reverse().join('/')}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2 py-1 rounded bg-gray-100 text-[10px] font-bold text-gray-600 border border-gray-200 whitespace-nowrap">
                            ${item.categoria || 'Avulso'}
                        </span>
                    </td>
                    <td class="py-3 px-4">
                        <span class="font-medium text-gray-900 block">${item.descricao}</span>
                        ${servicosRow}
                    </td>
                    <td class="py-3 px-4 text-gray-500">${item.cliente || '-'}</td>
                    <td class="py-3 px-2 text-gray-500 text-center">${item.parcela || '1/1'}</td>
                    <td class="py-3 px-4 font-bold ${corValor} flex items-center">${tipoFinanceiroAtual === 'baixas' ? iconeTipo : ''} R$ ${parseFloat(item.valor_total).toFixed(2).replace('.', ',')}</td>
                    <td class="py-3 px-4 text-gray-500">R$ ${parseFloat(item.valor_pago || 0).toFixed(2).replace('.', ',')}</td>
                    <td class="py-3 px-4"><span class="px-2 py-1 rounded text-[10px] ${badgeCor} font-bold tracking-wide">${displayStatus}</span></td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                        <button onclick="abrirRecibo('${item.id}')" title="Gerar Recibo PDF" class="mx-1 text-gray-400 hover:text-purple-600 transition-colors"><i class="ph ph-receipt text-lg"></i></button>
                        <button onclick="darBaixa('${item.id}', '${item.baixado === 'S' ? 'N' : 'S'}', '${item.valor_total}')" title="${item.baixado === 'S' ? 'Estornar Baixa' : 'Dar Baixa (Receber/Pagar)'}" class="mx-1 ${item.baixado === 'S' ? 'text-blue-500 hover:text-blue-700' : 'text-green-500 hover:text-green-700'} transition-colors"><i class="ph ${item.baixado === 'S' ? 'ph-arrow-u-up-left' : 'ph-check-circle'} text-lg"></i></button>
                        <button onclick="editarFinanceiro('${item.id}')" title="Editar" class="text-gray-400 hover:text-blue-600 mx-1 transition-colors"><i class="ph ph-pencil-simple text-lg"></i></button>
                        <button onclick="deletarFinanceiro('${item.id}')" title="Apagar" class="text-gray-400 hover:text-red-600 mx-1 transition-colors"><i class="ph ph-trash text-lg"></i></button>
                    </td>
                </tr>
            `;
        } else {
            const totalValor = itens.reduce((acc, curr) => acc + parseFloat(curr.valor_total), 0);
            const totalPago = itens.reduce((acc, curr) => acc + parseFloat(curr.valor_pago || 0), 0);
            const isGroupBaixado = itens.every(i => i.baixado === 'S');
            
            let statusGrupo = 'Pendente';
            let badgeMaster = 'bg-yellow-100 text-yellow-700';
            let corValorGrupo = baseItem.tipo === 'receber' ? 'text-green-600' : 'text-red-600';
            let iconeTipoGrupo = baseItem.tipo === 'receber' ? '<i class="ph ph-arrow-circle-up text-green-500 mr-1"></i>' : '<i class="ph ph-arrow-circle-down text-red-500 mr-1"></i>';
            
            if (isGroupBaixado) {
                statusGrupo = 'Baixado';
                badgeMaster = 'bg-blue-100 text-blue-700';
            } else if (totalPago >= totalValor) {
                statusGrupo = 'Pago';
                badgeMaster = 'bg-green-100 text-green-700';
            }

            const descMaster = baseItem.descricao.replace(/ \(Parc\. \d+\/\d+\)$/, '');
            let proxVenc = itens.find(i => i.status !== 'Pago' && i.baixado !== 'S') || itens[itens.length - 1];

            let servicosMasterRow = baseItem.servicos ? `<span class="block text-[10px] text-gray-500 uppercase mt-0.5 truncate max-w-[200px]" title="${baseItem.servicos}">${baseItem.servicos}</span>` : '';

            tbody.innerHTML += `
                <tr class="border-b border-gray-100 bg-gray-100/60 hover:bg-gray-100 transition-colors cursor-pointer" onclick="toggleGrupo('${gId}')">
                    <td class="py-3 px-4 text-center"><i id="icon-${gId}" class="ph ph-caret-right text-gray-500 text-lg transition-transform"></i></td>
                    <td class="py-3 px-4 text-gray-900 font-bold">${proxVenc.vencimento.split('-').reverse().join('/')}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2 py-1 rounded bg-gray-200 text-[10px] font-bold text-gray-700 whitespace-nowrap">
                            ${baseItem.categoria || 'Avulso'}
                        </span>
                    </td>
                    <td class="py-3 px-4">
                        <span class="font-bold text-gray-900 block">${descMaster}</span>
                        ${servicosMasterRow}
                    </td>
                    <td class="py-3 px-4 text-gray-700">${baseItem.cliente || '-'}</td>
                    <td class="py-3 px-2 text-gray-700 text-center font-bold">${numParcelas}x</td>
                    <td class="py-3 px-4 font-bold ${corValorGrupo} flex items-center">${tipoFinanceiroAtual === 'baixas' ? iconeTipoGrupo : ''} R$ ${totalValor.toFixed(2).replace('.', ',')}</td>
                    <td class="py-3 px-4 text-gray-700 font-bold">R$ ${totalPago.toFixed(2).replace('.', ',')}</td>
                    <td class="py-3 px-4"><span class="px-2 py-1 rounded text-[10px] ${badgeMaster} font-bold tracking-wide">${statusGrupo}</span></td>
                    <td class="py-3 px-4 text-center whitespace-nowrap" onclick="event.stopPropagation()">
                        <button onclick="abrirRecibo('${baseItem.id}')" title="Gerar Recibo PDF" class="mx-1 text-gray-400 hover:text-purple-600 transition-colors"><i class="ph ph-receipt text-lg"></i></button>
                        <button onclick="darBaixaGrupo('${gId}', '${isGroupBaixado ? 'N' : 'S'}')" title="${isGroupBaixado ? 'Estornar Baixa do Grupo' : 'Dar Baixa em todas as parcelas listadas'}" class="mx-1 ${isGroupBaixado ? 'text-blue-500 hover:text-blue-700' : 'text-green-500 hover:text-green-700'} transition-colors"><i class="ph ${isGroupBaixado ? 'ph-arrow-u-up-left' : 'ph-check-circle'} text-lg"></i></button>
                        <button onclick="editarGrupo('${gId}')" title="Editar informações do grupo" class="text-gray-400 hover:text-blue-600 mx-1 transition-colors"><i class="ph ph-pencil-simple text-lg"></i></button>
                        <button onclick="deletarGrupo('${gId}')" title="Apagar lançamento completo" class="text-gray-400 hover:text-red-600 mx-1 transition-colors"><i class="ph ph-trash text-lg"></i></button>
                    </td>
                </tr>
            `;

            itens.forEach(item => {
                let displayStatusP = item.status;
                let badgeCorP = item.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                let corValorP = item.tipo === 'receber' ? 'text-green-600' : 'text-red-600';
                
                if (item.baixado === 'S') {
                    displayStatusP = 'Baixado';
                    badgeCorP = 'bg-blue-100 text-blue-700';
                }

                const numParcelaText = item.parcela ? item.parcela.split('/')[0] : '1';
                const descParcela = `Parcela ${numParcelaText}`;

                tbody.innerHTML += `
                    <tr class="border-b border-gray-50 bg-white hidden grupo-child-${gId} hover:bg-gray-50 transition-colors">
                        <td class="py-2 px-4 text-right"><i class="ph ph-arrow-elbow-down-right text-gray-300 text-lg"></i></td>
                        <td class="py-2 px-4 text-gray-500 text-sm">${item.vencimento.split('-').reverse().join('/')}</td>
                        <td class="py-2 px-4 text-center text-gray-400">-</td>
                        <td class="py-2 px-4 text-gray-600 font-medium text-sm pl-8">${descParcela}</td>
                        <td class="py-2 px-4 text-gray-400 text-sm">-</td>
                        <td class="py-2 px-2 text-gray-500 text-sm text-center">${item.parcela}</td>
                        <td class="py-2 px-4 font-medium ${corValorP} text-sm">R$ ${parseFloat(item.valor_total).toFixed(2).replace('.', ',')}</td>
                        <td class="py-2 px-4 text-gray-600 text-sm">R$ ${parseFloat(item.valor_pago || 0).toFixed(2).replace('.', ',')}</td>
                        <td class="py-2 px-4"><span class="px-2 py-0.5 rounded text-[10px] ${badgeCorP} font-bold">${displayStatusP}</span></td>
                        <td class="py-2 px-4 text-center whitespace-nowrap">
                            <button onclick="abrirRecibo('${item.id}')" title="Gerar Recibo PDF" class="mx-1 text-gray-400 hover:text-purple-600 transition-colors"><i class="ph ph-receipt text-sm"></i></button>
                            <button onclick="darBaixa('${item.id}', '${item.baixado === 'S' ? 'N' : 'S'}', '${item.valor_total}')" title="${item.baixado === 'S' ? 'Estornar Baixa' : 'Dar Baixa'}" class="mx-1 ${item.baixado === 'S' ? 'text-blue-500 hover:text-blue-700' : 'text-green-500 hover:text-green-700'} transition-colors"><i class="ph ${item.baixado === 'S' ? 'ph-arrow-u-up-left' : 'ph-check-circle'} text-sm"></i></button>
                            <button onclick="editarFinanceiro('${item.id}')" title="Editar parcela" class="text-gray-400 hover:text-blue-600 mx-1 transition-colors"><i class="ph ph-pencil-simple text-sm"></i></button>
                            <button onclick="deletarFinanceiro('${item.id}')" title="Apagar parcela" class="text-gray-400 hover:text-red-600 mx-1 transition-colors"><i class="ph ph-trash text-sm"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
    });
}

function atualizarResumos(dados) {
    let recBaixado = 0, recPago = 0, recPendente = 0;
    let pagBaixado = 0, pagPago = 0, pagPendente = 0;

    dados.forEach(d => {
        let vTotal = parseFloat(d.valor_total || 0);
        let vPago = parseFloat(d.valor_pago || 0);
        let vPendente = vTotal - vPago;

        if (d.tipo === 'receber') {
            if (d.baixado === 'S') {
                recBaixado += vPago; 
            } else if (d.status === 'Pago') {
                recPago += vPago;
            } else {
                recPendente += vPendente;
            }
        } else {
            if (d.baixado === 'S') {
                pagBaixado += vPago;
            } else if (d.status === 'Pago') {
                pagPago += vPago;
            } else {
                pagPendente += vPendente;
            }
        }
    });

    document.getElementById('resumo-rec-baixado').innerText = formatarNumeroParaMoeda(recBaixado);
    document.getElementById('resumo-rec-pago').innerText = formatarNumeroParaMoeda(recPago);
    document.getElementById('resumo-rec-pendente').innerText = formatarNumeroParaMoeda(recPendente);

    document.getElementById('resumo-pag-baixado').innerText = formatarNumeroParaMoeda(pagBaixado);
    document.getElementById('resumo-pag-pago').innerText = formatarNumeroParaMoeda(pagPago);
    document.getElementById('resumo-pag-pendente').innerText = formatarNumeroParaMoeda(pagPendente);
}

async function salvarFinanceiro(event) {
    event.preventDefault();
    const tipo = document.getElementById('fin-tipo-hidden').value;
    
    const categoria = document.getElementById('fin-categoria').value;
    const descricao = document.getElementById('fin-descricao').value;
    const cliente = document.getElementById('fin-cliente').value;
    const dataBase = document.getElementById('fin-vencimento').value;
    const valorTotalBase = desformatarMoeda(document.getElementById('fin-valor-total').value);
    let valorPagoBase = desformatarMoeda(document.getElementById('fin-valor-pago').value);
    const statusUI = document.getElementById('fin-status').value;
    const forma_pagamento = document.getElementById('fin-forma-pagamento').value;
    const numParcelas = parseInt(document.getElementById('fin-parcelas').value) || 1;
    const intervaloDias = parseInt(document.getElementById('fin-intervalo').value) || 30;

    if (statusUI === 'Pago' && valorPagoBase < valorTotalBase) {
        valorPagoBase = valorTotalBase; 
    }
    const statusFinal = (valorPagoBase >= valorTotalBase) ? 'Pago' : 'Pendente';

    if (financeiroEmEdicaoId) {
        const isParcelaFilha = modalActionContext === 'editar_parcela';
        const fin = {
            tipo, categoria, cliente, vencimento: dataBase,
            valor_total: valorTotalBase, valor_pago: valorPagoBase,
            status: statusFinal, forma_pagamento, apagado: 'N'
        };
        
        if (!isParcelaFilha) {
            fin.descricao = descricao;
        }

        await supabaseClient.from('financeiro').update(fin).eq('id', financeiroEmEdicaoId);
    
    } else if (financeiroEmEdicaoGrupoId) {
        const { data: parcelasAntigas } = await supabaseClient.from('financeiro')
            .select('id, parcela')
            .eq('grupo_id', financeiroEmEdicaoGrupoId)
            .eq('apagado', 'N')
            .order('vencimento', { ascending: true });
        
        const numParcelasAtuais = parcelasAntigas.length;
        const valorParcela = Math.floor((valorTotalBase / numParcelasAtuais) * 100) / 100;
        const diferenca = valorTotalBase - (valorParcela * numParcelasAtuais);

        let [ano, mes, dia] = dataBase.split('-');
        let dataBaseObj = new Date(ano, parseInt(mes) - 1, dia); 
        let saldoRestantePago = valorPagoBase;

        for (let i = 0; i < numParcelasAtuais; i++) {
            let p = parcelasAntigas[i];
            let numIndex = i + 1;
            
            let dataVenc = new Date(dataBaseObj);
            dataVenc.setDate(dataVenc.getDate() + (i * intervaloDias));
            
            let yyyy = dataVenc.getFullYear();
            let mm = String(dataVenc.getMonth() + 1).padStart(2, '0');
            let dd = String(dataVenc.getDate()).padStart(2, '0');
            let vencFormatado = `${yyyy}-${mm}-${dd}`;
            
            let valorAtual = valorParcela;
            if (numIndex === 1) valorAtual += diferenca;

            let pagoNestaParcela = 0;
            if (saldoRestantePago >= valorAtual) {
                pagoNestaParcela = valorAtual;
                saldoRestantePago -= valorAtual;
            } else if (saldoRestantePago > 0) {
                pagoNestaParcela = saldoRestantePago;
                saldoRestantePago = 0;
            }

            let statusParcela = (pagoNestaParcela >= valorAtual) ? 'Pago' : 'Pendente';
            let novaDesc = numParcelasAtuais > 1 ? `${descricao} (Parc. ${p.parcela})` : descricao;

            await supabaseClient.from('financeiro').update({
                categoria: categoria,
                descricao: novaDesc,
                cliente: cliente,
                vencimento: vencFormatado,
                valor_total: valorAtual,
                valor_pago: pagoNestaParcela,
                status: statusParcela,
                forma_pagamento: forma_pagamento
            }).eq('id', p.id);
        }

    } else {
        const registros = [];
        const grupoId = gerarIdGrupo();
        const valorParcela = Math.floor((valorTotalBase / numParcelas) * 100) / 100;
        const diferenca = valorTotalBase - (valorParcela * numParcelas);

        let [ano, mes, dia] = dataBase.split('-');
        let dataBaseObj = new Date(ano, parseInt(mes) - 1, dia);
        let saldoRestantePago = valorPagoBase;

        for(let i = 1; i <= numParcelas; i++) {
            let dataVenc = new Date(dataBaseObj);
            dataVenc.setDate(dataVenc.getDate() + ((i - 1) * intervaloDias));
            
            let yyyy = dataVenc.getFullYear();
            let mm = String(dataVenc.getMonth() + 1).padStart(2, '0');
            let dd = String(dataVenc.getDate()).padStart(2, '0');
            let vencFormatado = `${yyyy}-${mm}-${dd}`;
            
            let valorAtual = valorParcela;
            if (i === 1) valorAtual += diferenca;

            let pagoNestaParcela = 0;
            if (saldoRestantePago >= valorAtual) {
                pagoNestaParcela = valorAtual;
                saldoRestantePago -= valorAtual;
            } else if (saldoRestantePago > 0) {
                pagoNestaParcela = saldoRestantePago;
                saldoRestantePago = 0;
            }

            let statusParcela = (pagoNestaParcela >= valorAtual) ? 'Pago' : 'Pendente';

            registros.push({
                tipo: tipo,
                categoria: categoria,
                descricao: descricao, 
                cliente: cliente,
                vencimento: vencFormatado,
                valor_total: valorAtual,
                valor_pago: pagoNestaParcela, 
                status: statusParcela,
                forma_pagamento: forma_pagamento,
                apagado: 'N',
                baixado: 'N',
                parcela: `${i}/${numParcelas}`,
                grupo_id: grupoId
            });
        }
        await supabaseClient.from('financeiro').insert(registros);
    }

    closeModal('modal-financeiro');
    loadFinanceiro();
}

async function editarFinanceiro(id) {
    const { data } = await supabaseClient.from('financeiro').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('fin-tipo-hidden').value = data.tipo;
        
        document.getElementById('fin-categoria').value = data.categoria || 'Avulso';

        const numParcelaText = data.parcela ? data.parcela.split('/')[0] : '1';
        const descInput = document.getElementById('fin-descricao');
        const labelVencimento = document.getElementById('fin-label-vencimento');
        const divParcelamento = document.getElementById('fin-div-parcelamento');

        const contServicos = document.getElementById('fin-servicos-container');
        const listaServicos = document.getElementById('fin-lista-servicos');
        
        if (data.servicos && data.servicos.trim() !== '') {
            contServicos.classList.remove('hidden');
            let servs = data.servicos.split(',').map(s => s.trim()).filter(s => s);
            listaServicos.innerHTML = servs.map(s => `<span class="bg-white border border-gray-200 text-gray-700 text-[11px] font-bold px-2 py-1 rounded shadow-sm"><i class="ph ph-check text-green-500 mr-1"></i>${s}</span>`).join('');
        } else {
            contServicos.classList.add('hidden');
            listaServicos.innerHTML = '';
        }

        if (data.parcela && data.parcela !== '1/1') {
            descInput.value = `Parcela ${numParcelaText}`;
            descInput.disabled = true;
            descInput.classList.add('bg-gray-100', 'text-gray-400');
            
            labelVencimento.innerText = `Vencimento (Parcela ${numParcelaText}) *`;
            divParcelamento.classList.add('hidden');
            
            modalActionContext = 'editar_parcela';
        } else {
            descInput.value = data.descricao;
            descInput.disabled = false;
            descInput.classList.remove('bg-gray-100', 'text-gray-400');
            
            labelVencimento.innerText = 'Vencimento *';
            divParcelamento.classList.remove('hidden');
            
            modalActionContext = 'editar_simples';
        }

        document.getElementById('fin-cliente').value = data.cliente || '';
        document.getElementById('fin-vencimento').value = data.vencimento;
        document.getElementById('fin-valor-total').value = formatarNumeroParaMoeda(data.valor_total);
        document.getElementById('fin-valor-pago').value = formatarNumeroParaMoeda(data.valor_pago || 0);
        
        document.getElementById('fin-status').value = (data.status === 'Baixado' || data.status === 'Pago' || data.baixado === 'S') ? 'Pago' : data.status;
        document.getElementById('fin-forma-pagamento').value = data.forma_pagamento || 'PIX';
        
        document.getElementById('fin-valor-total').disabled = false;
        document.getElementById('fin-valor-pago').disabled = false;
        document.getElementById('fin-vencimento').disabled = false;
        document.getElementById('fin-status').disabled = false;
        document.getElementById('fin-lista-parcelas').classList.add('hidden');
        document.getElementById('btn-baixar-fin').classList.remove('hidden');
        
        financeiroEmEdicaoId = id;
        financeiroEmEdicaoGrupoId = null;
        
        const tituloModal = document.getElementById('titulo-modal-financeiro');
        const isPagar = data.tipo === 'pagar';
        const tipoNome = isPagar ? 'Pagamento' : 'Recebimento';
        const icone = isPagar ? '<i class="ph ph-minus-circle text-2xl text-red-500"></i>' : '<i class="ph ph-plus-circle text-2xl text-green-500"></i>';
        tituloModal.innerHTML = modalActionContext === 'editar_parcela' ? `${icone} Editar Parcela` : `${icone} Editar ${tipoNome}`;
        
        openModal('modal-financeiro');
    }
}

async function editarGrupo(gId) {
    const { data } = await supabaseClient.from('financeiro').select('*').eq('grupo_id', gId).eq('apagado', 'N').order('vencimento', { ascending: true });
    if (data && data.length > 0) {
        const numParcelas = data.length;
        const baseItem = data[0];

        document.getElementById('fin-tipo-hidden').value = baseItem.tipo;
        document.getElementById('fin-categoria').value = baseItem.categoria || 'Avulso';

        const descInput = document.getElementById('fin-descricao');
        descInput.value = baseItem.descricao.replace(/ \(Parc\. \d+\/\d+\)$/, '');
        descInput.disabled = false;
        descInput.classList.remove('bg-gray-100', 'text-gray-400');

        const contServicos = document.getElementById('fin-servicos-container');
        const listaServicos = document.getElementById('fin-lista-servicos');
        
        if (baseItem.servicos && baseItem.servicos.trim() !== '') {
            contServicos.classList.remove('hidden');
            let servs = baseItem.servicos.split(',').map(s => s.trim()).filter(s => s);
            listaServicos.innerHTML = servs.map(s => `<span class="bg-white border border-gray-200 text-gray-700 text-[11px] font-bold px-2 py-1 rounded shadow-sm"><i class="ph ph-check text-green-500 mr-1"></i>${s}</span>`).join('');
        } else {
            contServicos.classList.add('hidden');
            listaServicos.innerHTML = '';
        }

        document.getElementById('fin-label-vencimento').innerText = 'Vencimento (1ª Parcela) *';
        document.getElementById('fin-div-parcelamento').classList.remove('hidden');

        document.getElementById('fin-cliente').value = baseItem.cliente || '';
        document.getElementById('fin-forma-pagamento').value = baseItem.forma_pagamento || 'PIX';

        const totalValor = data.reduce((acc, curr) => acc + parseFloat(curr.valor_total), 0);
        const totalPago = data.reduce((acc, curr) => acc + parseFloat(curr.valor_pago || 0), 0);

        document.getElementById('fin-vencimento').value = baseItem.vencimento; 
        document.getElementById('fin-valor-total').value = formatarNumeroParaMoeda(totalValor);
        document.getElementById('fin-valor-pago').value = formatarNumeroParaMoeda(totalPago);
        document.getElementById('fin-status').value = totalPago >= totalValor ? 'Pago' : 'Pendente';

        document.getElementById('fin-valor-total').disabled = false;
        document.getElementById('fin-valor-pago').disabled = false;
        document.getElementById('fin-vencimento').disabled = false;
        document.getElementById('fin-status').disabled = false;

        document.getElementById('fin-tem-parcelas').checked = true;
        document.getElementById('fin-tem-parcelas').disabled = true;
        document.getElementById('fin-parcelas').value = numParcelas;
        document.getElementById('fin-parcelas').disabled = true; 
        
        let intervaloCalc = 30;
        if (data.length > 1) {
            let d1 = new Date(data[0].vencimento + 'T00:00:00'); 
            let d2 = new Date(data[1].vencimento + 'T00:00:00');
            intervaloCalc = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        }
        document.getElementById('fin-intervalo').value = intervaloCalc;
        document.getElementById('fin-intervalo').disabled = false; 
        document.getElementById('fin-intervalo').classList.remove('bg-gray-100', 'text-gray-400');
        document.getElementById('fin-intervalo').classList.add('bg-white');

        const listaDiv = document.getElementById('fin-lista-parcelas');
        listaDiv.classList.remove('hidden');

        let tableHTML = `<h4 class="text-xs font-bold text-gray-700 mb-2">Parcelas atuais antes de salvar:</h4>
                         <div class="border border-gray-200 rounded overflow-hidden"><table class="w-full text-left text-[11px]">
                         <thead class="bg-gray-50 text-gray-500"><tr><th class="p-2">Parcela</th><th class="p-2">Vencimento</th><th class="p-2">Valor</th><th class="p-2">Status</th></tr></thead><tbody class="divide-y divide-gray-100">`;
        data.forEach(p => {
            let displayStat = p.status;
            let badge = p.status === 'Pago' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100';
            if (p.baixado === 'S') { displayStat = 'Baixado'; badge = 'text-blue-600 bg-blue-100'; }
            
            tableHTML += `<tr>
                <td class="p-2 font-bold">${p.parcela}</td>
                <td class="p-2">${p.vencimento.split('-').reverse().join('/')}</td>
                <td class="p-2">R$ ${parseFloat(p.valor_total).toFixed(2).replace('.',',')}</td>
                <td class="p-2"><span class="px-1.5 py-0.5 rounded ${badge} font-bold">${displayStat}</span></td>
            </tr>`;
        });
        tableHTML += `</tbody></table></div>`;
        listaDiv.innerHTML = tableHTML;

        financeiroEmEdicaoGrupoId = gId;
        financeiroEmEdicaoId = null;
        modalActionContext = 'editar_mestre';
        
        const tituloModal = document.getElementById('titulo-modal-financeiro');
        const isPagar = baseItem.tipo === 'pagar';
        const tipoNome = isPagar ? 'Pagamento' : 'Recebimento';
        const icone = isPagar ? '<i class="ph ph-minus-circle text-2xl text-red-500"></i>' : '<i class="ph ph-plus-circle text-2xl text-green-500"></i>';
        tituloModal.innerHTML = `${icone} Editar ${tipoNome}`;
        
        openModal('modal-financeiro');
    }
}

async function deletarFinanceiro(id) {
    if(confirm('Tem certeza que deseja apagar esta parcela específica?')) {
        await supabaseClient.from('financeiro').update({ apagado: 'S' }).eq('id', id);
        loadFinanceiro();
    }
}

async function deletarGrupo(gId) {
    if(confirm('Tem certeza que deseja apagar TODO este lançamento e TODAS as suas parcelas?')) {
        await supabaseClient.from('financeiro').update({ apagado: 'S' }).eq('grupo_id', gId);
        loadFinanceiro();
    }
}

function pesquisarFinanceiro() {
    let input = document.getElementById("pesquisa-financeiro").value.toLowerCase();
    let tr = document.getElementById("tabela-financeiro").getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
        if ((tr[i].textContent || tr[i].innerText).toLowerCase().indexOf(input) > -1) {
            tr[i].style.display = "";
        } else { tr[i].style.display = "none"; }
    }
}

// -------------------------------------------------------------------------
// FUNÇÕES DO MODAL DE RECIBO
// -------------------------------------------------------------------------
let reciboNomeArquivo = 'recibo.pdf';

window.abrirRecibo = async function(id) {
    try {
        const { data, error } = await supabaseClient.from('financeiro').select('*').eq('id', id).single();
        
        if (error) {
            console.error("Erro ao buscar recibo no banco:", error);
            alert("Não foi possível carregar os dados deste recibo.");
            return;
        }

        if (data) {
            const isPagar = data.tipo === 'pagar';
            
            document.getElementById('label-rec-valor').innerText = isPagar ? 'Valor Pago:' : 'Valor Recebido:';
            document.getElementById('label-rec-cliente').innerText = isPagar ? 'Enviado para:' : 'Recebemos de:';
            
            const recValor = document.getElementById('rec-valor');
            const vTotal = data.valor_total || 0;
            recValor.innerText = `R$ ${parseFloat(vTotal).toFixed(2).replace('.', ',')}`;
            
            // A COR DO VALOR AGORA FICA PRETA (definida no CSS como text-gray-900).
            // A lógica de trocar para vermelho/verde foi removida a seu pedido.
            
            document.getElementById('rec-cliente').innerText = data.cliente || 'Não informado';
            document.getElementById('rec-descricao').innerText = data.descricao || '-';
            
            if (data.servicos && data.servicos.trim() !== '') {
                document.getElementById('rec-linha-servicos').classList.remove('hidden');
                document.getElementById('rec-servicos').innerText = data.servicos;
            } else {
                document.getElementById('rec-linha-servicos').classList.add('hidden');
            }
            
            document.getElementById('rec-forma').innerText = data.forma_pagamento || 'PIX / A Combinar';
            
            const dataHoje = new Date();
            document.getElementById('rec-data').innerText = dataHoje.toLocaleDateString('pt-BR');
            
            const nomeCliArquivo = data.cliente ? data.cliente.replace(/\s+/g, '_') : 'Avulso';
            reciboNomeArquivo = `Recibo_${nomeCliArquivo}_${data.vencimento}.pdf`;

            document.getElementById('modal-recibo').classList.remove('hidden');
        }
    } catch(e) {
        console.error("Erro interno no JavaScript ao abrir recibo:", e);
    }
}

function fecharRecibo() {
    document.getElementById('modal-recibo').classList.add('hidden');
}

function baixarReciboPNG() {
    const elemento = document.getElementById('recibo-content');
    
    if (typeof html2canvas === 'undefined') {
        alert("A biblioteca de imagem ainda está carregando. Tente novamente em 2 segundos.");
        return;
    }

    html2canvas(elemento, {
        scale: 2, // Deixa a imagem com o dobro de resolução (alta qualidade)
        useCORS: true,
        backgroundColor: "#ffffff"
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        
        // Pega o nome do cliente para colocar no nome do arquivo
        let nomeCli = document.getElementById('rec-cliente').innerText.replace(/\s+/g, '_');
        link.download = `Recibo_IGB_${nomeCli}.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// ==========================================
// FUNÇÃO DE BAIXA RÁPIDA NO MODAL
// ==========================================
function darBaixaFinanceiroModal() {
    // 1. Altera o status para Pago
    document.getElementById('fin-status').value = 'Pago';
    
    // 2. Copia o valor total para o campo de valor pago
    let valorTotal = document.getElementById('fin-valor-total').value;
    if(valorTotal) {
        document.getElementById('fin-valor-pago').value = valorTotal;
    }

    // 3. Simula o clique no botão "Salvar Lançamento" para fechar e enviar pro Banco
    document.querySelector('#form-financeiro button[type="submit"]').click();
}

//function baixarReciboPDF() {
    //const element = document.getElementById('recibo-content');
    
    //const opt = {
    //    margin:       10,
    //    filename:     reciboNomeArquivo,
    //    image:        { type: 'jpeg', quality: 0.98 },
    //    html2canvas:  { scale: 3, useCORS: true }, 
    //    jsPDF:        { unit: 'mm', format: 'a5', orientation: 'portrait' }
//    };
    
    //html2pdf().set(opt).from(element).save();
//}
