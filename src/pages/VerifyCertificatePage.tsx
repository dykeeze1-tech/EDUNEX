import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { EdunexaLogo } from '../components/EdunexaLogo';
import { apiFetch } from '../utils/apiFetch';

export const VerifyCertificatePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || 'EDX-2026-0001';
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleVerify = async (targetCode: string) => {
    const clean = targetCode.trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await apiFetch(`/api/public/verify/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Certificate could not be verified.');
      } else {
        setResult(data.certificate);
      }
    } catch {
      setError('Unable to reach the verification registry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('code')) {
      handleVerify(searchParams.get('code')!);
    }
  }, [searchParams]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ code: code.trim() });
    handleVerify(code);
  };

  return (
    <div className="bg-[#F4F7FA] min-h-[calc(100vh-12rem)] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="font-display font-bold text-3xl text-[#10243D]">
            Certificate Verification Registry
          </h1>
          <p className="text-sm sm:text-base text-[#64748B]">
            Confirm the authenticity of any official EDUNEXA digital certificate using its unique serial number or QR verification link.
          </p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row gap-3">
          <label htmlFor="cert-serial" className="sr-only">Certificate Serial Number</label>
          <input
            id="cert-serial"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter certificate serial (e.g. EDX-2026-0001)"
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono-tabular focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#008F9F] hover:bg-[#007482] text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Checking...' : 'Verify Certificate'}
          </button>
        </form>

        <div className="text-xs text-center text-[#64748B]">
          Sample active certificate in registry:{' '}
          <button
            type="button"
            onClick={() => {
              setCode('EDX-2026-0001');
              setSearchParams({ code: 'EDX-2026-0001' });
              handleVerify('EDX-2026-0001');
            }}
            className="font-mono-tabular font-semibold text-[#008F9F] underline"
          >
            EDX-2026-0001
          </button>
        </div>

        {error && (
          <div className="bg-white rounded-xl border border-red-200 p-6 flex items-start gap-3 text-red-700">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-semibold text-base">Verification Not Found</h2>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <EdunexaLogo variant="certificate" />
              <div className={`inline-flex items-center gap-2 text-sm font-semibold ${result.status === 'valid' ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.status === 'valid' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                <span>{result.status === 'valid' ? 'Verified Active Certificate' : 'Certificate Revoked'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-4">
                <div>
                  <div className="text-xs text-[#64748B]">Awarded To</div>
                  <div className="font-display font-bold text-2xl text-[#10243D]">{result.student_display_name}</div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Qualifying Programme</div>
                  <div className="font-semibold text-base text-[#10243D]">{result.programme_title}</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <div className="text-xs text-[#64748B]">Certificate Serial</div>
                    <div className="font-mono-tabular font-semibold text-sm text-[#008F9F]">{result.cert_number}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#64748B]">Verified Grade</div>
                    <div className="font-mono-tabular font-semibold text-sm text-[#10243D]">{result.grade} ({result.score_percentage}%)</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#64748B]">Issue Date</div>
                    <div className="font-mono-tabular text-sm text-[#10243D]">{new Date(result.issued_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-xs text-[#64748B] pt-2">
                  Authorised Issuer: <span className="font-medium text-[#10243D]">{result.issued_by}</span>
                </div>
                {result.status !== 'valid' && result.revocation_reason && (
                  <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                    Revocation note: {result.revocation_reason}
                  </div>
                )}
              </div>

              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#F4F7FA] rounded-xl border border-slate-200">
                <img
                  src={result.qr_data_url}
                  alt={`QR Verification code for ${result.cert_number}`}
                  className="w-40 h-40 rounded-lg bg-white p-2 border border-slate-200"
                />
                <span className="text-xs text-[#64748B] mt-2 text-center">Scan to verify authenticity</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
