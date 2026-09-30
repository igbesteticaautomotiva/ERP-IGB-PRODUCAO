// ==========================================
// MÓDULO SERVIÇOS
// ==========================================
var idEditServico = null;
var currentSrvTab = 'Hatch/Sedan'; 

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient !== 'undefined') {
        loadServicos();
    }
});

function switchSrvTab(categoria) {
    currentSrvTab = categoria;
    
    // Resetar todos os botões de abas
    const abas = ['hatch', 'suv', 'moto-baixa', 'moto-media', 'moto-alta', 'biz', 'geral'];
    abas.forEach(aba => {
        const btn = document.getElementById('tab-srv-' + aba);
        if(btn) {
            btn.className = 'px-6 py-2 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 text-[11px] font-bold tracking-wider transition-colors shadow-sm whitespace-nowrap';
        }
    });

    // Ativar o botão clicado
    let abaAtiva = 'hatch';
    if(categoria === 'Hatch/Sedan') abaAtiva = 'hatch';
    else if(categoria === 'SUV/Caminhonete') abaAtiva = 'suv';
    else if(categoria === 'Moto Baixa Cilindrada') abaAtiva = 'moto-baixa';
    else if(categoria === 'Moto Média Cilindrada') abaAtiva = 'moto-media';
    else if(categoria === 'Moto Alta Cilindrada') abaAtiva = 'moto-alta';
    else if(categoria === 'Biz') abaAtiva = 'biz';
    else if(categoria === 'Geral') abaAtiva = 'geral';

    const btnAtivo = document.getElementById('tab-srv-' + abaAtiva);
    if(btnAtivo) {
        btnAtivo.className = 'px-6 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold tracking-wider transition-colors shadow-sm whitespace-nowrap';
    }

    loadServicos();
}

async function loadServicos() {
    if (!supabaseClient) return;

    // Busca apenas os não apagados e filtra pela aba ativa
    const { data, error } = await supabaseClient
        .from('servicos')
        .select('*')
        .eq('apagado', 'N')
        .eq('categoria', currentSrvTab)
        .order('nome');

    if (error) {
        console.error('Erro ao carregar serviços:', error);
        return;
    }

    renderTabelaServicos(data);
}

function renderTabelaServicos(data) {
    const tbody = document.getElementById('tabela-servicos-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-gray-400"><div class="flex flex-col items-center justify-center"><i class="ph ph-list-dashes text-4xl mb-3 text-gray-300"></i><p>Nenhum serviço encontrado nesta categoria.</p></div></td></tr>`;
        return;
    }

    data.forEach(srv => {
        let badgeStatus = srv.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        let precoFormatado = parseFloat(srv.preco).toFixed(2).replace('.', ',');

        // A coluna "Duração" não é mais preenchida na tabela
        tbody.innerHTML += `
            <tr class="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                <td class="py-4 px-6 font-bold text-gray-900">${srv.nome}</td>
                <td class="py-4 px-6 text-gray-600"><span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold tracking-wide">${srv.categoria || 'Não definida'}</span></td>
                <td class="py-4 px-6 text-gray-600">${srv.descricao || '-'}</td>
                <td class="py-4 px-6 font-bold text-gray-900">R$ ${precoFormatado}</td>
                <td class="py-4 px-6 text-center">
                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStatus}">${srv.status}</span>
                </td>
                <td class="py-4 px-6 text-center whitespace-nowrap">
                    <button onclick="editarServico('${srv.id}')" class="text-gray-400 hover:text-blue-600 mx-1 transition-colors" title="Editar"><i class="ph ph-pencil-simple text-xl"></i></button>
                    <button onclick="deletarServico('${srv.id}')" class="text-gray-400 hover:text-red-600 mx-1 transition-colors" title="Apagar"><i class="ph ph-trash text-xl"></i></button>
                </td>
            </tr>
        `;
    });
}

function openModalServico() {
    idEditServico = null;
    document.getElementById('form-servico').reset();
    
    // MÁGICA: Preenche o select com a categoria da aba que o usuário estiver olhando
    const selCat = document.getElementById('srv-categoria');
    selCat.value = currentSrvTab; 
    
    document.getElementById('modal-servico').classList.remove('hidden');
}

function closeModalServico() {
    document.getElementById('modal-servico').classList.add('hidden');
}

async function salvarServico(event) {
    event.preventDefault();
    
    let precoPuro = document.getElementById('srv-preco').value || '0';
    let precoCalculado = parseFloat(precoPuro.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;

    const servico = {
        nome: document.getElementById('srv-nome').value,
        categoria: document.getElementById('srv-categoria').value,
        descricao: document.getElementById('srv-descricao').value,
        preco: precoCalculado,
        status: document.getElementById('srv-status').value,
        apagado: 'N'
    };

    if (idEditServico) {
        await supabaseClient.from('servicos').update(servico).eq('id', idEditServico);
    } else {
        await supabaseClient.from('servicos').insert([servico]);
    }

    closeModalServico();
    
    // Mantém a aba ativa e recarrega os dados dela
    switchSrvTab(servico.categoria);
}

async function editarServico(id) {
    const { data } = await supabaseClient.from('servicos').select('*').eq('id', id).single();
    if (data) {
        idEditServico = id;
        document.getElementById('srv-nome').value = data.nome;
        
        const selCat = document.getElementById('srv-categoria');
        if(!Array.from(selCat.options).some(opt => opt.value === data.categoria)) {
            selCat.innerHTML += `<option value="${data.categoria}">${data.categoria}</option>`;
        }
        selCat.value = data.categoria || "Hatch/Sedan";

        document.getElementById('srv-descricao').value = data.descricao || '';
        document.getElementById('srv-preco').value = parseFloat(data.preco || 0).toFixed(2).replace('.', ',');
        document.getElementById('srv-status').value = data.status;
        
        document.getElementById('modal-servico').classList.remove('hidden');
    }
}

async function deletarServico(id) {
    if(confirm('Tem certeza que deseja apagar este serviço?')) {
        await supabaseClient.from('servicos').update({ apagado: 'S' }).eq('id', id);
        loadServicos();
    }
}

function pesquisarServicos() {
    let input = document.getElementById("pesquisa-servicos").value.toLowerCase();
    let tr = document.getElementById("tabela-servicos").getElementsByTagName("tr");
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
