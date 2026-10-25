'use client';
import React, { useState } from 'react';
import {
  UserPlus,
  Key,
  ArrowRight,
  ArrowLeft,
  Camera,
  CheckCircle2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { PROFESSIONS, GENDERS, MARITAL, MIN_SIGNUP_AGE } from '@/lib/rules';
import { Logo } from '../ui/Logo';

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
      let loc: { lat?: number; lng?: number } = {};
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl animate-fade-in overflow-y-auto">
      {/* Floating Single Frosted Glass Onboarding Card */}
      <div className="relative w-full max-w-md glass-modal p-6 sm:p-7 shadow-2xl my-8">
        {/* Brand header with Two Hands Joining SVG Logo */}
        <div className="text-center">
          <div className="mx-auto flex justify-center mb-1">
            <Logo size={46} />
          </div>
          <h2 className="mt-3 text-xl sm:text-2xl font-black tracking-tight text-[var(--ink)]">
            No One Alone
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Hyperlocal community mutual-aid within 3–4 km
          </p>

          {/* Locality Verification Badge with MapPin SVG */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--glass-bg-subtle)] border border-[var(--glass-border-contrast)] px-3 py-1 text-[11px] font-semibold text-[var(--ink)]">
            <MapPin size={11} className="shrink-0 text-[var(--muted)]" />
            <span>Locality Zone: 3.5 km Radius Active</span>
          </div>
        </div>

        {/* Minimalist Sliding Segmented Tab Pill */}
        <div className="mt-5 flex rounded-full bg-[var(--glass-bg-subtle)] p-1 border border-[var(--glass-border-contrast)]">
          <button
            onClick={() => { setTab('signup'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
              tab === 'signup'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <UserPlus size={14} />
            <span>Join Locality</span>
          </button>
          <button
            onClick={() => { setTab('signin'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition-all ${
              tab === 'signin'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Key size={14} />
            <span>Have a Code</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
            {error}
          </div>
        )}

        {/* SIGN UP FLOW */}
        {tab === 'signup' && (
          <div className="mt-5">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-xs font-semibold text-[var(--muted)]">Step {step} of 3</span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className={`h-1.5 w-6 rounded-full transition-all ${
                      s === step
                        ? 'bg-black dark:bg-white'
                        : s < step
                        ? 'bg-emerald-500'
                        : 'bg-[var(--line-2)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: Name & optional photo */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center">
                  <label className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[var(--line-2)] bg-[var(--glass-bg-subtle)] hover:border-black dark:hover:border-white transition-colors shadow-sm">
                    {photo ? (
                      <img src={photo} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-[var(--muted)] group-hover:text-[var(--ink)]">
                        <Camera size={22} />
                        <span className="text-[9px] mt-1 font-semibold">Photo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <span className="mt-1.5 text-[11px] text-[var(--muted)]">Photo is optional</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--ink)]">Your Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                  />
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Locality members only see your first name (e.g. Priya) for safety.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={name.trim().length < 2}
                  onClick={() => setStep(2)}
                  className="btn-pill btn-pill-primary w-full py-3 text-sm font-bold shadow-md"
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
                    <label className="text-xs font-bold text-[var(--ink)]">Age</label>
                    <span className="text-xs font-bold text-[var(--ink)]">{age} years</span>
                  </div>
                  <input
                    type="range"
                    min={MIN_SIGNUP_AGE}
                    max={90}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="mt-2 w-full accent-black dark:accent-white cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--muted)]">
                    <span>13 yrs</span>
                    <span>18+ (helper)</span>
                    <span>90 yrs</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--ink)]">Gender</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`rounded-full border py-2 text-xs font-semibold capitalize transition-all ${
                          gender === g
                            ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-sm'
                            : 'border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] text-[var(--muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--ink)]">Marital Status</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {MARITAL.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMarital(m)}
                        className={`rounded-full border py-2 text-xs font-semibold capitalize transition-all ${
                          marital === m
                            ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-sm'
                            : 'border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] text-[var(--muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Used strictly to enforce safety filters (e.g. young girls protected from unverified visitors).
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-pill btn-pill-secondary px-4 py-2.5 text-xs"
                  >
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="btn-pill btn-pill-primary flex-1 py-2.5 text-xs font-bold shadow-md"
                  >
                    <span>Next: Skills & Role</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Skills & Role selection with Frosted Pill Tags */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--ink)]">
                    Select Your Role & Skill in the Locality
                  </label>
                  <p className="text-[11px] text-[var(--muted)] mb-2.5">
                    During a crisis, requests are routed to neighbours with matching skills.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {PROFESSIONS.map((p) => {
                      const isSelected = profession === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProfession(p.id)}
                          className={`btn-pill text-xs py-1.5 px-3 min-h-[34px] ${
                            isSelected
                              ? 'btn-pill-primary font-bold shadow-sm'
                              : 'btn-pill-secondary font-medium'
                          }`}
                        >
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {profession === 'other' && (
                  <div>
                    <label className="text-xs font-bold text-[var(--ink)]">Tell us what you do</label>
                    <input
                      type="text"
                      value={professionOther}
                      onChange={(e) => setProfessionOther(e.target.value)}
                      placeholder="e.g. Civil Engineer, Carpenter, Shopkeeper"
                      className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-4 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-pill btn-pill-secondary px-4 py-2.5 text-xs"
                  >
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading || (profession === 'other' && professionOther.trim().length < 2)}
                    onClick={handleSignUp}
                    className="btn-pill btn-pill-primary flex-1 py-2.5 text-xs font-bold shadow-md"
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Enter Locality</span>
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
              <label className="text-xs font-bold text-[var(--ink)]">Enter Your Recovery Code</label>
              <textarea
                rows={2}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your 16-character code here..."
                className="mt-1 w-full rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] p-3 font-mono text-xs text-[var(--ink)] placeholder:text-[var(--faint)] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
            </div>

            <button
              type="button"
              disabled={loading || !code.trim()}
              onClick={() => handleSignIn()}
              className="btn-pill btn-pill-primary w-full py-3 text-sm font-bold shadow-md"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Key size={16} />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Quick Demo Signins from Sample Profiles */}
            <div className="mt-5 border-t border-[var(--line)] pt-3">
              <p className="text-[10.5px] font-bold text-[var(--muted)] uppercase tracking-wider">
                Instant 1-Tap Demo Sign In:
              </p>
              <div className="mt-2 space-y-1.5">
                {SAMPLE_CODES.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => handleSignIn(s.code)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[var(--glass-border-contrast)] bg-[var(--glass-bg-subtle)] px-3.5 py-2 text-left text-xs hover:bg-[var(--glass-bg-elevated)] transition-colors active:scale-98"
                  >
                    <span className="font-semibold text-[var(--ink)]">{s.name}</span>
                    <span className="frosted-badge frosted-badge-distance text-[10px] py-0 px-2">
                      {s.role}
                    </span>
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
