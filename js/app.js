// ==========================================
// VARIÁVEIS GLOBAIS DE ESTADO
// ==========================================
let clienteEmEdicaoId = null;
let financeiroEmEdicaoId = null;
let financeiroEmEdicaoGrupoId = null; 
let agendamentoEmEdicaoId = null; 
let servicoEmEdicaoId = null; 
let veiculoEmEdicaoId = null; // Novo estado para Veículos
let tipoFinanceiroAtual = 'receber'; 
let modalActionContext = 'novo'; 

// ==========================================
// UTILITÁRIOS GLOBAIS
// ==========================================
function gerarIdGrupo() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function desformatarMoeda(vf) { return vf ? parseFloat(vf.replace(/\D/g, "")) / 100 : 0; }

function formatarNumeroParaMoeda(n) {
    if (n == null || isNaN(n)) return "";
    return "R$ " + parseFloat(n).toFixed(2).replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

function aplicarMascaraMoeda(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value === "") { e.target.value = ""; return; }
    value = (value / 100).toFixed(2).replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = "R$ " + value;
}

function verificarStatusAutomatico() {
    const inputValorTotal = document.getElementById('fin-valor-total');
    const inputValorPago = document.getElementById('fin-valor-pago');
    const selectStatus = document.getElementById('fin-status');
    
    if(!inputValorTotal || !inputValorPago || !selectStatus) return;

    let vTotal = desformatarMoeda(inputValorTotal.value);
    let vPago = desformatarMoeda(inputValorPago.value);
    
    if (vPago >= vTotal && vTotal > 0) {
        selectStatus.value = 'Pago';
    } else if (vPago < vTotal) {
        selectStatus.value = 'Pendente';
    }
}

// ==========================================
// NAVEGAÇÃO E MODAIS
// ==========================================
function switchTab(viewId, title, elementoClicado = null) {
    document.getElementById('view-clientes').classList.add('hidden');
    document.getElementById('view-financeiro').classList.add('hidden');
    document.getElementById('view-agendamentos').classList.add('hidden');
    document.getElementById('view-servicos').classList.add('hidden');
    document.getElementById('view-veiculos').classList.add('hidden');
    document.getElementById('view-construcao').classList.add('hidden');
    
    document.getElementById('page-title').innerText = title;

    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('bg-gray-800', 'text-white', 'border-l-4', 'border-white', 'rounded-r-lg');
        a.classList.add('text-gray-400');
    });

    let navItem = elementoClicado || window.event?.currentTarget;

    if(viewId === 'clientes') {
        document.getElementById('view-clientes').classList.remove('hidden');
        document.getElementById('nav-clientes').classList.add('bg-gray-800', 'text-white', 'border-l-4', 'border-white', 'rounded-r-lg');
        if (typeof supabaseClient !== 'undefined' && supabaseClient) loadClientes();
    } 
    else if (viewId === 'financeiro') {
        document.getElementById('view-financeiro').classList.remove('hidden');
        document.getElementById('nav-financeiro').classList.add('bg-gray-800', 'text-white', 'border-l-4', 'border-white', 'rounded-r-lg');
        if (typeof supabaseClient !== 'undefined' && supabaseClient) loadFinanceiro();
    }
    else if (viewId === 'agendamentos') {
        document.getElementById('view-agendamentos').classList.remove('hidden');
        document.getElementById('nav-agendamentos').classList.add('bg-gray-800', 'text-white', 'border-l-4', 'border-white', 'rounded-r-lg');
        if (typeof supabaseClient !== 'undefined' && supabaseClient) initAgendamentos();
    }
    else if (viewId === 'servicos') {
        document.getElementById('view-servicos').classList.remove('hidden');
        document.getElementById('nav-servicos').classList.add('bg-gray-800', 'text-white', 'border-l-4', 'border-white', 'rounded-r-lg');
        if (typeof supabaseClient !== 'undefined' && supabaseClient) loadServicos();
    }
    else if (viewId === 'veiculos') {
        document.getElementById('view-veiculos').classList.remove('hidden');
        document.getElementById('nav-veiculos').classList.add('bg-gray-800', 'text-white', 'border-l-4', 'border-white', 'rounded-r-lg');
        if (typeof supabaseClient !== 'undefined' && supabaseClient) loadVeiculos();
    }
    else {
        document.getElementById('view-construcao').classList.remove('hidden');
        if (navItem && navItem.classList) {
            navItem.classList.add('bg-gray-800', 'text-white', 'border-l-4', 'border-white', 'rounded-r-lg');
        }
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    
    if (modalId === 'modal-financeiro') {
        const tituloModal = document.getElementById('titulo-modal-financeiro');
        if (modalActionContext === 'novo') {
            document.getElementById('fin-tipo-hidden').value = tipoFinanceiroAtual;
            const isPagar = tipoFinanceiroAtual === 'pagar';
            const tipoNome = isPagar ? 'Pagamento' : 'Recebimento';
            const icone = isPagar 
                ? '<i class="ph ph-minus-circle text-2xl text-red-500"></i>' 
                : '<i class="ph ph-plus-circle text-2xl text-green-500"></i>';
                
            tituloModal.innerHTML = `${icone} Novo ${tipoNome}`;

            const chkParcelas = document.getElementById('fin-tem-parcelas');
            const inputParcelas = document.getElementById('fin-parcelas');
            const inputIntervalo = document.getElementById('fin-intervalo');
            
            document.getElementById('fin-label-vencimento').innerText = 'Vencimento (1ª Parcela) *';
            document.getElementById('fin-div-parcelamento').classList.remove('hidden');
            
            const descInput = document.getElementById('fin-descricao');
            descInput.disabled = false;
            descInput.classList.remove('bg-gray-100', 'text-gray-400');
            
            chkParcelas.checked = false;
            chkParcelas.disabled = false;
            
            inputParcelas.disabled = true;
            inputParcelas.value = 1;
            inputParcelas.classList.add('bg-gray-100', 'text-gray-400');
            inputParcelas.classList.remove('bg-white');

            inputIntervalo.disabled = true;
            inputIntervalo.value = 30;
            inputIntervalo.classList.add('bg-gray-100', 'text-gray-400');
            inputIntervalo.classList.remove('bg-white');
            
            document.getElementById('fin-status').value = 'Pendente';
            
            document.getElementById('fin-valor-total').disabled = false;
            document.getElementById('fin-valor-pago').disabled = false;
            document.getElementById('fin-vencimento').disabled = false;
            document.getElementById('fin-status').disabled = false;
            
            document.getElementById('fin-lista-parcelas').classList.add('hidden');
        }
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    
    if (modalId === 'modal-cliente') {
        document.getElementById('form-cliente').reset();
        clienteEmEdicaoId = null;
    }
    
    if (modalId === 'modal-veiculo') {
        document.getElementById('form-veiculo').reset();
        veiculoEmEdicaoId = null;
    }
    
    if (modalId === 'modal-financeiro') {
        document.getElementById('form-financeiro').reset();
        financeiroEmEdicaoId = null;
        financeiroEmEdicaoGrupoId = null;
        modalActionContext = 'novo';
        
        document.getElementById('fin-valor-total').disabled = false;
        document.getElementById('fin-valor-pago').disabled = false;
        document.getElementById('fin-vencimento').disabled = false;
        document.getElementById('fin-status').disabled = false;
        document.getElementById('fin-lista-parcelas').classList.add('hidden');
    }
}

// ==========================================
// INICIALIZAÇÃO EVENTOS GLOBAIS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const aplicarMascaraTelefone = function (e) {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    };

    const cliTelefone = document.getElementById('cli-telefone');
    if(cliTelefone) cliTelefone.addEventListener('input', aplicarMascaraTelefone);
    
    const veiTelefone = document.getElementById('vei-cliente-telefone');
    if(veiTelefone) veiTelefone.addEventListener('input', aplicarMascaraTelefone);

    const inputValorTotal = document.getElementById('fin-valor-total');
    const inputValorPago = document.getElementById('fin-valor-pago');
    const selectStatus = document.getElementById('fin-status');

    if(inputValorTotal) inputValorTotal.addEventListener('input', function(e) { aplicarMascaraMoeda(e); verificarStatusAutomatico(); });
    if(inputValorPago) inputValorPago.addEventListener('input', function(e) { aplicarMascaraMoeda(e); verificarStatusAutomatico(); });
    if(selectStatus) {
        selectStatus.addEventListener('change', function(e) {
            if (e.target.value === 'Pago') {
                let vTotal = desformatarMoeda(inputValorTotal.value);
                let vPago = desformatarMoeda(inputValorPago.value);
                if (vPago < vTotal) inputValorPago.value = inputValorTotal.value; 
            } else if (e.target.value === 'Pendente') {
                let vTotal = desformatarMoeda(inputValorTotal.value);
                let vPago = desformatarMoeda(inputValorPago.value);
                if (vPago >= vTotal && vTotal > 0) inputValorPago.value = ""; 
            }
        });
    }
    
    const inputValorAgendamento = document.getElementById('agen-valor');
    if(inputValorAgendamento) inputValorAgendamento.addEventListener('input', aplicarMascaraMoeda);

    const inputValorServico = document.getElementById('srv-preco');
    if(inputValorServico) inputValorServico.addEventListener('input', aplicarMascaraMoeda);
});
