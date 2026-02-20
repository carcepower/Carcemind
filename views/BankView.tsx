
import React, { useState } from 'react';
import { GoogleConfig, BankTransaction } from '../types';
import { googleApi } from '../lib/googleApi';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, TrendingDown, Building2, CreditCard } from 'lucide-react';

interface BankViewProps {
  googleConfig: GoogleConfig;
  onDataUpdate: () => void;
}

const BankView: React.FC<BankViewProps> = ({ googleConfig, onDataUpdate }) => {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [status, setStatus] = useState<{ [key: string]: 'idle' | 'success' | 'error' }>({ Sabadell: 'idle', Caixabank: 'idle' });
  const [errorMsg, setErrorMsg] = useState('');

  const processFile = async (file: File, bank: 'Sabadell' | 'Caixabank', category: 'Empresa' | 'Personal') => {
    if (!googleConfig.isConnected) {
      setErrorMsg("Conecta Google en Ajustes primero.");
      return;
    }

    setLoading(prev => ({ ...prev, [bank]: true }));
    setStatus(prev => ({ ...prev, [bank]: 'idle' }));

    try {
      // 1. Convertir archivo a Base64 para Gemini
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      // 2. IA Parsing
      const prompt = `
        Analiza este extracto bancario de ${bank}. 
        Extrae las transacciones y devuélvelas en un array JSON con este formato exacto:
        [{"date": "YYYY-MM-DD", "concept": "nombre del comercio o abono", "amount": numero_flotante, "balance": numero_flotante}]
        
        Notas para ${bank}:
        ${bank === 'Sabadell' ? 'Columnas: F. Operativa, Concepto, Importe, Saldo.' : 'Columnas: Fecha, Movimiento, Importe, Saldo.'}
        Devuelve SOLO el JSON.
      `;

      const response = await googleApi.safeAiCall({
        prompt,
        fileData: { data: base64, mimeType: file.type }
      });

      const transactions = JSON.parse(response.text);
      
      // 3. Guardar en Google Sheets (Batch upload)
      if (transactions.length > 0) {
        const rows = transactions.map((t: any) => [
          crypto.randomUUID(),
          t.date,
          t.concept,
          t.amount,
          t.balance,
          bank,
          category
        ]);

        await googleApi.batchAppendRows(googleConfig.spreadsheetId!, 'BANK_LOG', rows, googleConfig.accessToken!);
      }

      setStatus(prev => ({ ...prev, [bank]: 'success' }));
      onDataUpdate();
    } catch (err: any) {
      console.error(err);
      setStatus(prev => ({ ...prev, [bank]: 'error' }));
      setErrorMsg("Error procesando el archivo. Asegúrate de que sea un Excel o CSV legible.");
    } finally {
      setLoading(prev => ({ ...prev, [bank]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 animate-in fade-in duration-700">
      <header className="space-y-2">
        <p className="text-[#5E7BFF] text-xs font-bold uppercase tracking-widest">CarceFinance v1.0</p>
        <h2 className="text-4xl font-semibold tracking-tight">Cerebro Financiero</h2>
        <p className="text-[#646B7B] italic">Sube tus extractos para que el Consultor Cognitivo aprenda tus hábitos de gasto.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SABADELL - EMPRESA */}
        <div className={`glass border p-10 rounded-[3rem] space-y-8 transition-all ${status.Sabadell === 'success' ? 'border-[#10B981]/30 bg-[#10B981]/5' : 'border-[#1F2330]'}`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#5E7BFF]/10 flex items-center justify-center border border-[#5E7BFF]/20">
              <Building2 className="text-[#5E7BFF]" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Banco Sabadell</h3>
              <p className="text-[#646B7B] text-xs uppercase font-bold tracking-widest">Empresa / Proyectos</p>
            </div>
          </div>

          <div className="relative group">
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'Sabadell', 'Empresa')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={loading.Sabadell}
            />
            <div className="border-2 border-dashed border-[#1F2330] group-hover:border-[#5E7BFF] rounded-[2rem] p-8 text-center transition-all">
              {loading.Sabadell ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#5E7BFF]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Leyendo transacciones...</span>
                </div>
              ) : status.Sabadell === 'success' ? (
                <div className="flex flex-col items-center gap-3 text-[#10B981]">
                  <CheckCircle2 size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizado</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-[#646B7B]">
                  <Upload size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Subir Extracto Sabadell</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CAIXABANK - PERSONAL */}
        <div className={`glass border p-10 rounded-[3rem] space-y-8 transition-all ${status.Caixabank === 'success' ? 'border-[#10B981]/30 bg-[#10B981]/5' : 'border-[#1F2330]'}`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
              <CreditCard className="text-[#10B981]" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Caixabank</h3>
              <p className="text-[#646B7B] text-xs uppercase font-bold tracking-widest">Personal / Ahorro</p>
            </div>
          </div>

          <div className="relative group">
            <input 
              type="file" 
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 'Caixabank', 'Personal')}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={loading.Caixabank}
            />
            <div className="border-2 border-dashed border-[#1F2330] group-hover:border-[#10B981] rounded-[2rem] p-8 text-center transition-all">
              {loading.Caixabank ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#10B981]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Escaneando saldos...</span>
                </div>
              ) : status.Caixabank === 'success' ? (
                <div className="flex flex-col items-center gap-3 text-[#10B981]">
                  <CheckCircle2 size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizado</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-[#646B7B]">
                  <Upload size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Subir Extracto Caixabank</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400 flex items-center gap-4 animate-in slide-in-from-top-2">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="glass border border-[#1F2330] p-10 rounded-[3rem] space-y-6">
        <div className="flex items-center gap-3">
          <TrendingDown className="text-[#A0A6B1]" size={20} />
          <h4 className="font-bold text-[10px] uppercase tracking-widest text-[#A0A6B1]">Próximamente</h4>
        </div>
        <h5 className="text-xl font-medium">Asistente de Ahorro Proactivo</h5>
        <p className="text-[#646B7B] text-sm leading-relaxed">
          En la versión 2.0, CarceFinance analizará estos datos automáticamente para sugerirte reducciones de costes, detectar suscripciones olvidadas y avisarte si el ritmo de gasto en restaurantes supera tu media habitual.
        </p>
      </div>
    </div>
  );
};

export default BankView;
