// ==========================================
// MÓDULO CLIENTES
// ==========================================
async function loadClientes() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('clientes').select('*').eq('apagado', 'N').order('created_at', { ascending: false });
    if (error) return console.error('Erro', error);

    const tbody = document.getElementById('tabela-clientes-body');
    tbody.innerHTML = '';
    document.getElementById('contador-clientes').innerText = data.length;
    document.getElementById('pesquisa-clientes').value = ''; 

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-gray-400">
                    <div class="flex flex-col items-center justify-center">
                        <i class="ph ph-folder-open text-4xl mb-3 text-gray-300"></i>
                        <p>Nenhuma informação cadastrada.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(cliente => {
        // Formata o número do WhatsApp para a URL
        let waNumber = cliente.telefone.replace(/\D/g, '');
        if (waNumber.length >= 10) waNumber = '55' + waNumber;

        tbody.innerHTML += `
            <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td class="py-3 px-6 font-medium text-gray-900">${cliente.nome}</td>
                <td class="py-3 px-6">
                    <div class="flex items-center gap-2">
                        <span>${cliente.telefone}</span>
                        <a href="https://wa.me/${waNumber}" target="_blank" title="Chamar no WhatsApp" class="text-green-500 hover:text-green-600 transition-colors flex items-center">
                            <i class="ph ph-whatsapp-logo text-xl"></i>
                        </a>
                    </div>
                </td>
                <td class="py-3 px-6 text-gray-500 truncate max-w-[200px]">${cliente.endereco || '-'}</td>
                <td class="py-3 px-6 text-gray-500">${cliente.email || '-'}</td>
                <td class="py-3 px-6 text-gray-500">${cliente.ultimo_servico || 'Sem registros'}</td>
                <td class="py-3 px-6 text-center">
                    <button onclick="editarCliente('${cliente.id}')" class="text-gray-400 hover:text-blue-600 mx-1"><i class="ph ph-pencil-simple text-lg"></i></button>
                    <button onclick="deletarCliente('${cliente.id}')" class="text-gray-400 hover:text-red-600 mx-1"><i class="ph ph-trash text-lg"></i></button>
                </td>
            </tr>
        `;
    });
}

async function salvarCliente(event) {
    event.preventDefault();
    const cliente = {
        nome: document.getElementById('cli-nome').value,
        telefone: document.getElementById('cli-telefone').value,
        email: document.getElementById('cli-email').value,
        endereco: document.getElementById('cli-endereco').value,
        apagado: 'N'
    };

    if (clienteEmEdicaoId) {
        await supabaseClient.from('clientes').update(cliente).eq('id', clienteEmEdicaoId);
    } else {
        await supabaseClient.from('clientes').insert([cliente]);
    }
    closeModal('modal-cliente');
    loadClientes();
}

async function deletarCliente(id) {
    if(confirm('Tem certeza que deseja apagar este cliente?')) {
        await supabaseClient.from('clientes').update({ apagado: 'S' }).eq('id', id);
        loadClientes();
    }
}

async function editarCliente(id) {
    const { data } = await supabaseClient.from('clientes').select('*').eq('id', id).single();
    if (data) {
        document.getElementById('cli-nome').value = data.nome;
        document.getElementById('cli-telefone').value = data.telefone;
        document.getElementById('cli-email').value = data.email || '';
        document.getElementById('cli-endereco').value = data.endereco || '';
        clienteEmEdicaoId = id;
        openModal('modal-cliente');
    }
}

function pesquisarClientes() {
    let input = document.getElementById("pesquisa-clientes").value.toLowerCase();
    let tr = document.getElementById("tabela-clientes").getElementsByTagName("tr");
    let count = 0;
    for (let i = 1; i < tr.length; i++) {
        if ((tr[i].textContent || tr[i].innerText).toLowerCase().indexOf(input) > -1) {
            tr[i].style.display = ""; count++;
        } else { tr[i].style.display = "none"; }
    }
    document.getElementById('contador-clientes').innerText = count;
}

function chamarWhatsappModal() {
    let phoneInput = document.getElementById('cli-telefone').value;
    let numbers = phoneInput.replace(/\D/g, '');
    if (numbers.length >= 10) {
        window.open(`https://wa.me/55${numbers}`, '_blank');
    } else {
        alert("Por favor, insira um número de telefone válido antes de chamar no WhatsApp.");
    }
}