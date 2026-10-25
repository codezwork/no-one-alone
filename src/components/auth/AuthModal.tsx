'use client';
import React, { useState } from 'react';
import { UserPlus, Key, ArrowRight, ArrowLeft, Camera, Shield, CheckCircle2 } from 'lucide-react';
import { PROFESSIONS, GENDERS, MARITAL, MIN_SIGNUP_AGE } from '@/lib/rules';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (token: string, user: any) => void;
}

const SAMPLE_CODES = [
  { name: 'Dr. Farida H.', role: 'Doctor (bom)', code: 'XHRXfWgEXrGtmDfwzPOrPS7trhASufgG' },
  { name: 'Nalini S.', role: 'Nurse (bom)', code: 'MGRrd3CDZXoNp2_vHJgjfPMDjpykUi7n' },
  { name: 'Joseph M.', role: 'Electrician (bom)', code: 'wWoYNzjofJvi9s10XAQifzg7_0KZTfz4' },
  { name: 'Lakshmi R.', role: 'Teacher (bom)', code: '0mrP3gAXimnq7Mf0X0ZrK-3IxyAjXfGe' },
  { name: 'Selvam K.', role: 'Driver (bom)', code: 'clRfehXXrVPvOf1eM4kyVPKa18NOJiqx' },
];

export function AuthModal({ isOpen, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'signup' | 'signin'>('signup');
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [age, setAge] = useState<number>(26);
  const [gender, setGender] = useState<string>('female');
  const [marital, setMarital] = useState<string>('unmarried');
  const [profession, setProfession] = useState<string>('doctor');
  const [professionOther, setProfessionOther] = useState<string>('');
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      setError('Please choose an image under 300 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      // Get current location if permitted
      let loc: { lat?: number; lng?: number } = {};
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // fallback to default Chennai coords if denied in browser
        loc = { lat: 13.0012, lng: 80.2565 };
      }

      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          age,
          gender,
          marital,
          profession,
          professionOther: profession === 'other' ? professionOther : undefined,
          photo,
          lat: loc.lat,
          lng: loc.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Sign up failed');
      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (useCode?: string) => {
    const targetCode = useCode || code;
    if (!targetCode.trim()) {
      setError('Please enter your recovery code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Sign in failed');
      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl my-8">
        {/* Brand header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 shadow-lg shadow-rose-950/50">
            <Shield size={26} className="text-white" />
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white">
            Welcome to Neighbours
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Hyperlocal mutual aid & essential support during calamities
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mt-5 flex rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          <button
            onClick={() => { setTab('signup'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              tab === 'signup'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus size={14} />
            <span>Join Neighbours</span>
          </button>
          <button
            onClick={() => { setTab('signin'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              tab === 'signin'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key size={14} />
            <span>Have a Code</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* SIGN UP FLOW */}
        {tab === 'signup' && (
          <div className="mt-5">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-medium text-slate-400">Step {step} of 3</span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={`h-1.5 w-6 rounded-full transition-all ${
                      s === step ? 'bg-rose-500' : s < step ? 'bg-slate-600' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: Name and optional photo */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center">
                  <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-700 bg-slate-800/80 hover:border-rose-500 transition-colors">
                    {photo ? (
                      <img src={photo} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-rose-400">
                        <Camera size={22} />
                        <span className="text-[9px] mt-1">Photo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <span className="mt-1.5 text-[11px] text-slate-400">Photo is optional</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Your Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Neighbours only ever see your first name (e.g. Priya) for safety.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={name.trim().length < 2}
                  onClick={() => setStep(2)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500 disabled:opacity-50 transition-all"
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* STEP 2: Age, Gender, Marital Status */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between">
                    <label className="text-xs font-semibold text-slate-300">Age</label>
                    <span className="text-xs font-bold text-rose-400">{age} years</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_SIGNUP_AGE}
                    max={90}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="mt-2 w-full accent-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>13 yrs</span>
                    <span>18+ (can help)</span>
                    <span>24+ (child/elder care)</span>
                    <span>90 yrs</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Gender</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-all ${
                          gender === g
                            ? 'border-rose-500 bg-rose-500/20 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Marital Status</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {MARITAL.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMarital(m)}
                        className={`rounded-xl border py-2 text-xs font-semibold capitalize transition-all ${
                          marital === m
                            ? 'border-rose-500 bg-rose-500/20 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Used strictly to enforce safety filters (e.g. requests by young girls are protected).
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500"
                  >
                    <span>Next: Profession</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Profession */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">What is your profession?</label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Emergency requests (e.g., Doctor, Electrician) alert matching neighbours first.
                  </p>
                  <select
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  >
                    {PROFESSIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {profession === 'other' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Tell us what you do</label>
                    <input
                      type="text"
                      value={professionOther}
                      onChange={(e) => setProfessionOther(e.target.value)}
                      placeholder="e.g. Civil Engineer, Shopkeeper"
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading || (profession === 'other' && professionOther.trim().length < 2)}
                    onClick={handleSignUp}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/40 hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Create My Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SIGN IN FLOW */}
        {tab === 'signin' && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Enter Your Recovery Code</label>
              <textarea
                rows={2}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your 16-character code here..."
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900/90 p-3 font-mono text-xs text-amber-300 placeholder-slate-600 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              disabled={loading || !code.trim()}
              onClick={() => handleSignIn()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Key size={16} />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Quick Demo Signins from Turso Seed */}
            <div className="mt-6 border-t border-slate-800/80 pt-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Or Sign In As Sample Neighbour (Turso Cloud):
              </p>
              <div className="mt-2 space-y-1.5">
                {SAMPLE_CODES.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => handleSignIn(s.code)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-left text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-colors"
                  >
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="text-[10px] text-rose-400">{s.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
