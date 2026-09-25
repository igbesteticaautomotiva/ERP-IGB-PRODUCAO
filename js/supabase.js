// ==========================================
// CONFIGURAÇÃO SUPABASE (BANCO DE DADOS)
// ==========================================
const supabaseUrl = 'https://dxdfailixqzzclqxghos.supabase.co'; 
const supabaseKey = 'sb_publishable_e_2vixLIkQYhrHaCprGXVg_S5IUrsah'; 

let supabaseClient = null; 

try {
    if (supabaseUrl.startsWith('http')) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
} catch (error) {
    console.warn("Aviso: Falha ao iniciar o Supabase.", error);
}