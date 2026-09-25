// ==========================================
// CONFIGURAÇÃO SUPABASE (BANCO DE DADOS)
// ==========================================
const supabaseUrl = 'https://ssktbtsjcwppooxiqmkc.supabase.co'; 
const supabaseKey = 'sb_publishable_4yIuy8TPUdvPAaMTSkenIQ_eJzWahFG'; 

let supabaseClient = null; 

try {
    if (supabaseUrl.startsWith('http')) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
} catch (error) {
    console.warn("Aviso: Falha ao iniciar o Supabase.", error);
}
