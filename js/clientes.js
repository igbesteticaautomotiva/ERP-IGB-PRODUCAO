// ==========================================
// MÓDULO CLIENTES
// ==========================================
var idEditCliente = null;
var nomeEditClienteAntigo = "";

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient !== 'undefined') {
        loadClientes();
    }
});

async function loadClientes() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('clientes')
        .select('*')
        .eq('apagado', 'N')
        .order('nome');

    if (error) {
        console.error('Erro ao carregar clientes:', error);
        return;
    }

    const tbody = document.getElementById('tabela-clientes-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-gray-400">Nenhum cliente cadastrado.</td></tr>`;
        return;
    }

    data.forEach(cli => {
        tbody.innerHTML += `
            <tr class="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                <td class="py-4 px-6 font-bold text-gray-900">${cli.nome}</td>
                <td class="py-4 px-6 text-gray-600">${cli.telefone}</td>
                <td class="py-4 px-6 text-gray-600">${cli.endereco || '-'}</td>
                <td class="py-4 px-6 text-gray-600">${cli.email || '-'}</td>
                <td class="py-4 px-6 text-gray-600">${cli.ultimo_servico || '-'}</td>
                <td class="py-4 px-6 text-center whitespace-nowrap">
                    <button onclick="editarCliente('${cli.id}')" class="text-gray-400 hover:text-blue-600 mx-1 transition-colors" title="Editar"><i class="ph ph-pencil-simple text-xl"></i></button>
                    <button onclick="deletarCliente('${cli.id}')" class="text-gray-400 hover:text-red-600 mx-1 transition-colors" title="Apagar"><i class="ph ph-trash text-xl"></i></button>
                </td>
            </tr>
        `;
    });
}

function abrirModalNovoCliente() {
    idEditCliente = null;
    nomeEditClienteAntigo = "";
    document.getElementById('form-cliente').reset();
    document.getElementById('titulo-modal-cliente').innerText = 'Novo Cliente';
    
    // Reseta o select da Categoria do Veículo
    document.getElementById('cli-veiculo-categoria').value = "Hatch/Sedan";

    document.getElementById('cli-tabs-nav').classList.add('hidden');
    document.getElementById('cli-veiculos-cadastrados-container').classList.add('hidden');
    document.getElementById('cli-novo-veiculo-form').classList.add('hidden');
    
    switchCliTab('dados');
    document.getElementById('modal-cliente').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function switchCliTab(tab) {
    const btnDados = document.getElementById('tab-cli-btn-dados');
    const btnHistorico = document.getElementById('tab-cli-btn-historico');
    const contDados = document.getElementById('tab-cli-dados');
    const contHistorico = document.getElementById('tab-cli-historico');

    if(tab === 'dados') {
        btnDados.className = 'px-4 py-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600';
        btnHistorico.className = 'px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 border-b-2 border-transparent';
        contDados.style.display = 'block';
        contHistorico.style.display = 'none';
    } else {
        btnHistorico.className = 'px-4 py-3 text-sm font-bold text-blue-600 border-b-2 border-blue-600';
        btnDados.className = 'px-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 border-b-2 border-transparent';
        contDados.style.display = 'none';
        contHistorico.style.display = 'block';
    }
}

function toggleNovoVeiculoForm() {
    const formVei = document.getElementById('cli-novo-veiculo-form');
    formVei.classList.toggle('hidden');
}

// ==========================================
// FUNÇÕES DE EDIÇÃO DE VEÍCULOS (MINI FORM)
// ==========================================
async function carregarVeiculosDoClienteModal(clienteNome) {
    const container = document.getElementById('cli-veiculos-cadastrados-container');
    const lista = document.getElementById('cli-lista-veiculos');
    
    if(!clienteNome) {
        container.classList.add('hidden');
        return;
    }

    const { data } = await supabaseClient
        .from('veiculos')
        .select('*')
        .eq('cliente_nome', clienteNome)
        .eq('apagado', 'N')
        .order('nome');
    
    if (data && data.length > 0) {
        container.classList.remove('hidden');
        lista.innerHTML = '';
        
        data.forEach(v => {
            const catAtual = v.categoria || "Hatch/Sedan";
            
            // Renderiza as options do Select selecionando a correta do BD
            const catOptions = `
                <option value="Hatch/Sedan" ${catAtual === 'Hatch/Sedan' ? 'selected' : ''}>Hatch/Sedan</option>
                <option value="SUV/Caminhonete" ${catAtual === 'SUV/Caminhonete' ? 'selected' : ''}>SUV/Camin</option>
                <option value="Moto Baixa Cilindrada" ${catAtual === 'Moto Baixa Cilindrada' ? 'selected' : ''}>Moto Baixa</option>
                <option value="Moto Média Cilindrada" ${catAtual === 'Moto Média Cilindrada' ? 'selected' : ''}>Moto Média</option>
                <option value="Moto Alta Cilindrada" ${catAtual === 'Moto Alta Cilindrada' ? 'selected' : ''}>Moto Alta</option>
                <option value="Biz" ${catAtual === 'Biz' ? 'selected' : ''}>Biz</option>
                <option value="Outros" ${catAtual === 'Outros' ? 'selected' : ''}>Outros</option>
            `;

            lista.innerHTML += `
                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm relative transition-all hover:border-blue-300 mb-2">
                    <div class="grid grid-cols-12 gap-2 items-end">
                        <div class="col-span-6">
                            <label class="block text-[10px] text-gray-500 uppercase font-bold mb-0.5">Modelo</label>
                            <input type="text" id="cli-edit-vei-nome-${v.id}" value="${v.nome}" class="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none font-medium text-gray-800">
                        </div>
                        <div class="col-span-6">
                            <label class="block text-[10px] text-gray-500 uppercase font-bold mb-0.5">Categoria</label>
                            <select id="cli-edit-vei-categoria-${v.id}" class="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none font-medium text-gray-800">
                                ${catOptions}
                            </select>
                        </div>
                        <div class="col-span-4">
                            <label class="block text-[10px] text-gray-500 uppercase font-bold mb-0.5">Cor</label>
                            <input type="text" id="cli-edit-vei-cor-${v.id}" value="${v.cor || ''}" class="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none font-medium text-gray-800">
                        </div>
                        <div class="col-span-4">
                            <label class="block text-[10px] text-gray-500 uppercase font-bold mb-0.5">Ano</label>
                            <input type="text" id="cli-edit-vei-ano-${v.id}" value="${v.ano || ''}" class="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none font-medium text-gray-800">
                        </div>
                        <div class="col-span-4 flex justify-end gap-1">
                            <button type="button" onclick="atualizarVeiculoMini('${v.id}')" id="btn-salvar-vei-${v.id}" class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded transition-colors flex-1 flex justify-center items-center gap-1 border border-blue-100" title="Salvar Alterações">
                                <i class="ph ph-check font-bold text-sm"></i>
                            </button>
                            <button type="button" onclick="deletarVeiculoMini('${v.id}', '${clienteNome}')" class="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1.5 rounded transition-colors flex justify-center items-center border border-red-100 w-10" title="Excluir Veículo">
                                <i class="ph ph-trash font-bold text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        container.classList.add('hidden');
        lista.innerHTML = '';
    }
}

async function atualizarVeiculoMini(id) {
    const nome = document.getElementById(`cli-edit-vei-nome-${id}`).value;
    const categoria = document.getElementById(`cli-edit-vei-categoria-${id}`).value;
    const cor = document.getElementById(`cli-edit-vei-cor-${id}`).value;
    const ano = document.getElementById(`cli-edit-vei-ano-${id}`).value;

    if(!nome) {
        alert("O modelo do veículo é obrigatório!");
        return;
    }

    const { error } = await supabaseClient.from('veiculos').update({ nome, categoria, cor, ano }).eq('id', id);

    if (error) {
        console.error(error);
        alert("Erro ao atualizar o veículo.");
    } else {
        const btn = document.getElementById(`btn-salvar-vei-${id}`);
        if(btn) {
            btn.classList.remove('bg-blue-50', 'text-blue-600', 'border-blue-100');
            btn.classList.add('bg-green-500', 'text-white', 'border-green-600');
            setTimeout(() => {
                btn.classList.add('bg-blue-50', 'text-blue-600', 'border-blue-100');
                btn.classList.remove('bg-green-500', 'text-white', 'border-green-600');
            }, 1500);
        }
        
        if(typeof loadVeiculos === 'function') loadVeiculos();
    }
}

async function deletarVeiculoMini(id, clienteNome) {
    if(confirm('Tem certeza que deseja apagar este veículo?')) {
        await supabaseClient.from('veiculos').update({ apagado: 'S' }).eq('id', id);
        carregarVeiculosDoClienteModal(clienteNome); 
        if(typeof loadVeiculos === 'function') loadVeiculos();
    }
}

// ==========================================
// SALVAR, EDITAR E HISTÓRICO
// ==========================================
async function salvarCliente(event) {
    event.preventDefault();

    const nomeNovo = document.getElementById('cli-nome').value.trim();
    const cliente = {
        nome: nomeNovo,
        telefone: document.getElementById('cli-telefone').value,
        email: document.getElementById('cli-email').value,
        endereco: document.getElementById('cli-endereco').value,
        apagado: 'N'
    };

    if (idEditCliente) {
        await supabaseClient.from('clientes').update(cliente).eq('id', idEditCliente);

        if (nomeEditClienteAntigo && nomeEditClienteAntigo !== nomeNovo) {
            await supabaseClient.from('veiculos').update({ cliente_nome: nomeNovo }).eq('cliente_nome', nomeEditClienteAntigo);
            await supabaseClient.from('agendamentos').update({ cliente_nome: nomeNovo }).eq('cliente_nome', nomeEditClienteAntigo);
            await supabaseClient.from('financeiro').update({ cliente: nomeNovo }).eq('cliente', nomeEditClienteAntigo);
        }

        const novoVeiModelo = document.getElementById('cli-veiculo-modelo').value.trim();
        if(novoVeiModelo) {
            await supabaseClient.from('veiculos').insert([{
                nome: novoVeiModelo,
                categoria: document.getElementById('cli-veiculo-categoria').value,
                cliente_nome: nomeNovo,
                cor: document.getElementById('cli-veiculo-cor').value,
                ano: document.getElementById('cli-veiculo-ano').value,
                status: 'Ativo',
                apagado: 'N'
            }]);
            
            document.getElementById('cli-veiculo-modelo').value = "";
            document.getElementById('cli-veiculo-categoria').value = "Hatch/Sedan";
            document.getElementById('cli-veiculo-cor').value = "";
            document.getElementById('cli-veiculo-ano').value = "";
            document.getElementById('cli-novo-veiculo-form').classList.add('hidden');
        }

    } else {
        await supabaseClient.from('clientes').insert([cliente]);
        
        const novoVeiModelo = document.getElementById('cli-veiculo-modelo').value.trim();
        if(novoVeiModelo) {
            await supabaseClient.from('veiculos').insert([{
                nome: novoVeiModelo,
                categoria: document.getElementById('cli-veiculo-categoria').value,
                cliente_nome: nomeNovo,
                cor: document.getElementById('cli-veiculo-cor').value,
                ano: document.getElementById('cli-veiculo-ano').value,
                status: 'Ativo',
                apagado: 'N'
            }]);
        }
    }

    closeModal('modal-cliente');
    loadClientes();
    if(typeof loadVeiculos === 'function') loadVeiculos();
    if(typeof loadFinanceiro === 'function') loadFinanceiro();
    if(typeof loadAgendamentos === 'function') loadAgendamentos();
}

async function editarCliente(id) {
    const { data } = await supabaseClient.from('clientes').select('*').eq('id', id).single();
    
    if (data) {
        idEditCliente = id;
        nomeEditClienteAntigo = data.nome;
        document.getElementById('titulo-modal-cliente').innerText = 'Editar Cliente';
        
        document.getElementById('cli-nome').value = data.nome;
        document.getElementById('cli-telefone').value = data.telefone;
        document.getElementById('cli-email').value = data.email || '';
        document.getElementById('cli-endereco').value = data.endereco || '';
        
        document.getElementById('cli-veiculo-modelo').value = "";
        document.getElementById('cli-veiculo-categoria').value = "Hatch/Sedan";
        document.getElementById('cli-veiculo-cor').value = "";
        document.getElementById('cli-veiculo-ano').value = "";
        document.getElementById('cli-novo-veiculo-form').classList.add('hidden');

        document.getElementById('cli-tabs-nav').classList.remove('hidden');
        switchCliTab('dados');
        
        await carregarVeiculosDoClienteModal(data.nome);
        carregarHistoricoCliente(data.nome);

        document.getElementById('modal-cliente').classList.remove('hidden');
    }
}

async function carregarHistoricoCliente(clienteNome) {
    const lista = document.getElementById('cli-lista-agendamentos');
    lista.innerHTML = '<div class="flex justify-center p-4"><i class="ph ph-spinner animate-spin text-2xl text-gray-400"></i></div>';
    
    const { data } = await supabaseClient
        .from('agendamentos')
        .select('*')
        .eq('cliente_nome', clienteNome)
        .eq('apagado', 'N')
        .order('data_agendamento', { ascending: false });
        
    if(data && data.length > 0) {
        lista.innerHTML = '';
        data.forEach(ag => {
            let dataFormatada = ag.data_agendamento.split('-').reverse().join('/');
            let badgeClass = "bg-gray-100 text-gray-600";
            if(ag.status === 'Finalizado') badgeClass = "bg-[#ebf8ee] text-[#4ade80]";
            else if(ag.status === 'Cancelado') badgeClass = "bg-[#faeaea] text-[#b95756]";
            else if(ag.status === 'Em Andamento') badgeClass = "bg-[#fcf8e3] text-[#c0ca33]";
            else if(ag.status === 'Orçamento') badgeClass = "bg-[#f3e8ff] text-purple-600";
            else badgeClass = "bg-[#eaeffc] text-[#6185eb]"; 
            
            lista.innerHTML += `
                <div class="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm mb-3">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-sm font-bold text-gray-900">${dataFormatada}</span>
                            <span class="text-xs text-gray-400 font-medium">${ag.horario.substring(0,5)}</span>
                        </div>
                        <p class="text-sm font-bold text-gray-700">${ag.descricao}</p>
                        <p class="text-xs text-gray-500 mt-1"><i class="ph ph-car text-gray-400"></i> ${ag.veiculo || 'Sem veículo'} &nbsp;|&nbsp; R$ ${parseFloat(ag.valor_total).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <span class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${badgeClass}">${ag.status}</span>
                </div>
            `;
        });
    } else {
        lista.innerHTML = `
            <div class="text-center py-8">
                <i class="ph ph-calendar-blank text-4xl text-gray-300 mb-2 block"></i>
                <p class="text-xs text-gray-500">Nenhum serviço ou orçamento no histórico.</p>
            </div>`;
    }
}

async function deletarCliente(id) {
    if(confirm('Tem certeza que deseja apagar este cliente?')) {
        await supabaseClient.from('clientes').update({ apagado: 'S' }).eq('id', id);
        loadClientes();
    }
}

function pesquisarClientes() {
    let input = document.getElementById("pesquisa-clientes").value.toLowerCase();
    let tr = document.getElementById("tabela-clientes").getElementsByTagName("tr");
    
    for (let i = 1; i < tr.length; i++) {
        if (tr[i].getElementsByTagName("td").length > 1) { 
            if ((tr[i].textContent || tr[i].innerText).toLowerCase().indexOf(input) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

function chamarWhatsappModal() {
    const telefone = document.getElementById('cli-telefone').value.replace(/\D/g, '');
    if(telefone.length >= 10) {
        window.open(`https://api.whatsapp.com/send?phone=55${telefone}`, '_blank');
    } else {
        alert('Preencha um número de telefone válido.');
    }
}
