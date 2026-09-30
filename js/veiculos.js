// ==========================================
// MÓDULO VEÍCULOS
// ==========================================
var idEditVeiculo = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabaseClient !== 'undefined') {
        loadVeiculos();
    }
});

async function loadVeiculos() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('veiculos')
        .select('*')
        .eq('apagado', 'N')
        .order('nome');

    if (error) {
        console.error('Erro ao carregar veículos:', error);
        return;
    }

    const tbody = document.getElementById('tabela-veiculos-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-gray-400"><div class="flex flex-col items-center justify-center"><i class="ph ph-car text-4xl mb-3 text-gray-300"></i><p>Nenhum veículo cadastrado.</p></div></td></tr>`;
        return;
    }

    data.forEach(vei => {
        let badgeStatus = vei.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        
        // Formata data do último serviço se existir
        let dataUltimo = "-";
        if(vei.ultimo_data && vei.ultimo_data !== "") {
            dataUltimo = vei.ultimo_data.split('-').reverse().join('/');
        }
        
        let ultServicoHtml = vei.ultimo_nome ? `<span class="font-medium text-gray-800 block">${vei.ultimo_nome}</span><span class="text-[10px] text-gray-500">${dataUltimo}</span>` : '-';
        let categoriaText = vei.categoria || 'Não informada';

        tbody.innerHTML += `
            <tr class="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                <td class="py-4 px-6">
                    <span class="font-bold text-gray-900 block">${vei.nome}</span>
                    <span class="text-[10px] font-bold text-blue-500 tracking-wide uppercase">${categoriaText}</span>
                </td>
                <td class="py-4 px-6 text-gray-600 font-medium">${vei.cliente_nome}</td>
                <td class="py-4 px-6 text-gray-600">${vei.cor || '-'}</td>
                <td class="py-4 px-6 text-gray-600">${vei.ano || '-'}</td>
                <td class="py-4 px-6 text-center">
                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${badgeStatus}">${vei.status}</span>
                </td>
                <td class="py-4 px-6 text-gray-600 text-xs">${ultServicoHtml}</td>
                <td class="py-4 px-6 text-center whitespace-nowrap">
                    <button onclick="editarVeiculo('${vei.id}')" class="text-gray-400 hover:text-blue-600 mx-1 transition-colors" title="Editar"><i class="ph ph-pencil-simple text-xl"></i></button>
                    <button onclick="deletarVeiculo('${vei.id}')" class="text-gray-400 hover:text-red-600 mx-1 transition-colors" title="Apagar"><i class="ph ph-trash text-xl"></i></button>
                </td>
            </tr>
        `;
    });
}

async function openModalVeiculo() {
    idEditVeiculo = null;
    document.getElementById('form-veiculo').reset();
    document.getElementById('vei-categoria').value = "Hatch/Sedan"; // Padrão
    
    // Carrega a lista de clientes para o select
    const selCli = document.getElementById('vei-cliente-nome');
    selCli.innerHTML = '<option value="" disabled selected>Carregando clientes...</option>';
    
    const { data: clientes } = await supabaseClient.from('clientes').select('nome').eq('apagado', 'N').order('nome');
    selCli.innerHTML = '<option value="" disabled selected>Selecione um cliente...</option>';
    
    if(clientes) {
        clientes.forEach(cli => {
            selCli.innerHTML += `<option value="${cli.nome}">${cli.nome}</option>`;
        });
    }

    document.getElementById('modal-veiculo').classList.remove('hidden');
}

function closeModalVeiculo() {
    document.getElementById('modal-veiculo').classList.add('hidden');
}

async function preencherTelefoneClienteVeiculo() {
    const nomeCli = document.getElementById('vei-cliente-nome').value;
    if(!nomeCli) return;
    
    const { data } = await supabaseClient.from('clientes').select('telefone').eq('nome', nomeCli).single();
    if(data && data.telefone) {
        document.getElementById('vei-cliente-telefone').value = data.telefone;
    }
}

async function salvarVeiculo(event) {
    event.preventDefault();

    const veiculo = {
        nome: document.getElementById('vei-nome').value,
        categoria: document.getElementById('vei-categoria').value, // NOVO
        cliente_nome: document.getElementById('vei-cliente-nome').value,
        cor: document.getElementById('vei-cor').value,
        ano: document.getElementById('vei-ano').value,
        status: document.getElementById('vei-status').value,
        apagado: 'N'
    };

    if (idEditVeiculo) {
        await supabaseClient.from('veiculos').update(veiculo).eq('id', idEditVeiculo);
    } else {
        await supabaseClient.from('veiculos').insert([veiculo]);
    }

    closeModalVeiculo();
    loadVeiculos();
}

async function editarVeiculo(id) {
    const { data } = await supabaseClient.from('veiculos').select('*').eq('id', id).single();
    
    if (data) {
        idEditVeiculo = id;
        
        const selCli = document.getElementById('vei-cliente-nome');
        const { data: clientes } = await supabaseClient.from('clientes').select('nome').eq('apagado', 'N').order('nome');
        
        selCli.innerHTML = '<option value="" disabled>Selecione um cliente...</option>';
        let achouCliente = false;
        if(clientes) {
            clientes.forEach(cli => {
                let isSel = (cli.nome === data.cliente_nome) ? 'selected' : '';
                if (cli.nome === data.cliente_nome) achouCliente = true;
                selCli.innerHTML += `<option value="${cli.nome}" ${isSel}>${cli.nome}</option>`;
            });
        }
        
        if(!achouCliente) {
            selCli.innerHTML += `<option value="${data.cliente_nome}" selected>${data.cliente_nome} (Inativo)</option>`;
        }

        document.getElementById('vei-nome').value = data.nome;
        
        const selCat = document.getElementById('vei-categoria');
        selCat.value = data.categoria || "Hatch/Sedan";

        document.getElementById('vei-cor').value = data.cor || '';
        document.getElementById('vei-ano').value = data.ano || '';
        
        // Puxa o telefone preenchido
        preencherTelefoneClienteVeiculo();

        document.getElementById('vei-ultimo-nome').value = data.ultimo_nome || '';
        document.getElementById('vei-ultimo-data').value = data.ultimo_data || '';
        
        document.getElementById('vei-status').value = data.status || 'Ativo';
        
        document.getElementById('modal-veiculo').classList.remove('hidden');
    }
}

async function deletarVeiculo(id) {
    if(confirm('Tem certeza que deseja apagar este veículo?')) {
        await supabaseClient.from('veiculos').update({ apagado: 'S' }).eq('id', id);
        loadVeiculos();
    }
}

function pesquisarVeiculos() {
    let input = document.getElementById("pesquisa-veiculos").value.toLowerCase();
    let tr = document.getElementById("tabela-veiculos").getElementsByTagName("tr");
    
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
